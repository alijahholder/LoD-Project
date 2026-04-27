import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { snapshotSubmission } from "@/lib/erisa/snapshot";
import { computeCompletenessClockEnd } from "@/lib/lod/deadlines";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: claimId } = await params;
  const body = await req.json().catch(() => ({}));
  const kind = (body.kind as string) || "initial_application";
  const signerName = body.signerName ? String(body.signerName) : undefined;

  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { profile: { include: { user: true } }, documents: true },
  });
  if (!claim || claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  if (claim.documents.length === 0)
    return NextResponse.json({ error: "no documents to submit" }, { status: 400 });

  const docIds = claim.documents.map((d) => d.id);
  const snap = await snapshotSubmission({
    claimId,
    kind: kind as "initial_application" | "additional_records" | "appeal" | "other",
    documentIds: docIds,
    signerName,
    actorUserId: userId,
  });

  // Status transition: draft/screening/building → submitted, start 45-day clock.
  const now = new Date();
  await prisma.claim.update({
    where: { id: claimId },
    data: {
      status: "submitted",
      filedAt: claim.filedAt ?? now,
      completenessClockEnd: claim.completenessClockEnd ?? computeCompletenessClockEnd(now),
    },
  });

  return NextResponse.json({ ok: true, submissionId: snap.submissionId, manifestHash: snap.manifestHash });
}
