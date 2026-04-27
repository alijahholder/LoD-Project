import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";

const Body = z.object({
  status: z.string().optional(),
  method: z.string().optional(),
  expectedBy: z.string().optional(),
  sentAt: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const r = await prisma.medicalRecordRequest.findUnique({
    where: { id },
    include: { claim: { include: { profile: { include: { user: true } } } } },
  });
  if (!r || r.claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const v = parsed.data;

  const updated = await prisma.medicalRecordRequest.update({
    where: { id },
    data: {
      status: v.status ?? r.status,
      method: v.method ?? r.method,
      expectedBy: v.expectedBy ? new Date(v.expectedBy) : r.expectedBy,
      sentAt: v.sentAt ? new Date(v.sentAt) : r.sentAt,
    },
  });

  if (v.status && v.status !== r.status) {
    await prisma.timelineEvent.create({
      data: {
        claimId: r.claimId,
        type: "records_request_status",
        actor: userId,
        payload: JSON.stringify({ requestId: id, from: r.status, to: v.status }),
        payloadHash: sha256(`${id}:${r.status}->${v.status}`),
      },
    });
  }
  await audit({ userId, action: "records.request.updated", entityType: "records_request", entityId: id });

  return NextResponse.json({ ok: true, request: updated });
}
