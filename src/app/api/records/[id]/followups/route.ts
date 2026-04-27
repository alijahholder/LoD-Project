import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

const Body = z.object({
  dueAt: z.string().min(8),
  channel: z.string().min(1),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: requestId } = await params;

  const r = await prisma.medicalRecordRequest.findUnique({
    where: { id: requestId },
    include: { claim: { include: { profile: { include: { user: true } } } } },
  });
  if (!r || r.claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const v = parsed.data;

  const f = await prisma.followUp.create({
    data: {
      requestId,
      dueAt: new Date(v.dueAt),
      channel: v.channel,
      notes: v.notes ?? null,
    },
  });
  await audit({ userId, action: "records.followup.created", entityType: "followup", entityId: f.id });
  return NextResponse.json({ ok: true, id: f.id });
}
