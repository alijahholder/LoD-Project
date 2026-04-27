import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const profile = await prisma.playerProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: "no profile" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  let claim = await prisma.claim.findFirst({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
  });
  if (!claim) {
    const rubric = await prisma.rubricVersion.findFirst({ where: { isActive: true, benefit: "LOD" } });
    claim = await prisma.claim.create({
      data: {
        profileId: profile.id,
        benefitType: "LOD",
        status: "screening",
        rubricVersionId: rubric?.id ?? null,
        filingDeadline: profile.lodFilingDeadline,
      },
    });
  } else {
    claim = await prisma.claim.update({
      where: { id: claim.id },
      data: { status: "screening" },
    });
  }

  const json = JSON.stringify(body);
  await prisma.claim.update({
    where: { id: claim.id },
    data: { prescreenAnswers: json },
  });
  await prisma.timelineEvent.create({
    data: {
      claimId: claim.id,
      type: "note",
      actor: userId,
      payload: JSON.stringify({ kind: "prescreen", body }),
      payloadHash: sha256(json),
    },
  });
  await audit({ userId, action: "claim.prescreen", entityType: "claim", entityId: claim.id });

  return NextResponse.json({ ok: true, claimId: claim.id });
}
