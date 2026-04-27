import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: claimId, findingId } = await params;

  const finding = await prisma.impairmentFinding.findUnique({
    where: { id: findingId },
    include: { claim: { include: { profile: { include: { user: true } } } } },
  });
  if (!finding || finding.claimId !== claimId || finding.claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const decision = body.decision as "confirmed" | "rejected" | undefined;
  if (!decision || !["confirmed", "rejected"].includes(decision))
    return NextResponse.json({ error: "invalid decision" }, { status: 400 });

  const points =
    typeof body.points === "number" && Number.isFinite(body.points) ? Math.max(0, body.points) : finding.points;

  const updated = await prisma.impairmentFinding.update({
    where: { id: findingId },
    data: {
      status: decision,
      points,
      reviewedAt: new Date(),
      reviewedBy: userId,
    },
  });

  const eventPayload = JSON.stringify({
    findingId: updated.id,
    decision,
    points,
    categoryId: updated.categoryId,
  });
  await prisma.timelineEvent.create({
    data: {
      claimId,
      type: "finding.review",
      actor: userId,
      payload: eventPayload,
      payloadHash: sha256(eventPayload),
    },
  });
  await audit({
    userId,
    action: `finding.${decision}`,
    entityType: "finding",
    entityId: findingId,
    metadata: { claimId, points },
  });

  return NextResponse.json({ ok: true });
}
