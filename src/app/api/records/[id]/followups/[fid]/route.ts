import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";

const Body = z.object({
  completed: z.boolean().optional(),
  outcome: z.string().optional(),
  notes: z.string().max(5000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fid: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: requestId, fid } = await params;

  const f = await prisma.followUp.findUnique({
    where: { id: fid },
    include: {
      request: {
        include: { claim: { include: { profile: { include: { user: true } } } } },
      },
    },
  });
  if (!f || f.requestId !== requestId || f.request.claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const v = parsed.data;

  const updated = await prisma.followUp.update({
    where: { id: fid },
    data: {
      completedAt: v.completed ? new Date() : f.completedAt,
      outcome: v.outcome ?? f.outcome,
      notes: v.notes ?? f.notes,
    },
  });

  // Persist to claim timeline so the call/email log is part of the ERISA record
  await prisma.timelineEvent.create({
    data: {
      claimId: f.request.claimId,
      type: "follow_up",
      actor: userId,
      payload: JSON.stringify({
        requestId,
        followUpId: fid,
        outcome: updated.outcome,
        notes: updated.notes,
        completedAt: updated.completedAt,
      }),
      payloadHash: sha256(`${fid}:${updated.outcome ?? ""}`),
    },
  });
  await audit({ userId, action: "records.followup.updated", entityType: "followup", entityId: fid });

  return NextResponse.json({ ok: true });
}
