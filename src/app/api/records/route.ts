import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";

const Body = z.object({
  claimId: z.string().min(1),
  providerType: z.enum(["nfl_club", "third_party"]),
  providerName: z.string().min(1).max(120),
  providerContact: z.string().max(2000).optional().nullable(),
  dateRangeStart: z.string().optional().nullable(),
  dateRangeEnd: z.string().optional().nullable(),
  method: z.enum(["mail", "fax", "portal", "email"]).optional(),
  notes: z.string().max(5000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 400 });
  const v = parsed.data;

  const claim = await prisma.claim.findUnique({
    where: { id: v.claimId },
    include: { profile: { include: { user: true } } },
  });
  if (!claim || claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const now = new Date();
  const expectedBy = addDays(now, 30);

  const r = await prisma.medicalRecordRequest.create({
    data: {
      claimId: v.claimId,
      providerType: v.providerType,
      providerName: v.providerName,
      providerContact: v.providerContact ?? null,
      dateRangeStart: v.dateRangeStart ? new Date(v.dateRangeStart) : null,
      dateRangeEnd: v.dateRangeEnd ? new Date(v.dateRangeEnd) : null,
      method: v.method,
      status: "drafted",
      notes: v.notes ?? null,
      expectedBy,
    },
  });

  // Schedule day 14, 30, 45 follow-ups
  await prisma.followUp.createMany({
    data: [14, 30, 45].map((d) => ({
      requestId: r.id,
      dueAt: addDays(now, d),
      channel: "call",
      notes: `Auto-scheduled follow-up at day ${d}`,
    })),
  });

  await prisma.timelineEvent.create({
    data: {
      claimId: v.claimId,
      type: "records_request_created",
      actor: userId,
      payload: JSON.stringify({ requestId: r.id, provider: v.providerName, type: v.providerType }),
      payloadHash: sha256(r.id),
    },
  });
  await audit({ userId, action: "records.request.created", entityType: "records_request", entityId: r.id });

  return NextResponse.json({ ok: true, id: r.id });
}
