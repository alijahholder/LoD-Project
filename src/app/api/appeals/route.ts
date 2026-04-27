import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { computeAppealDeadline } from "@/lib/lod/deadlines";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";

const Body = z.object({
  claimId: z.string().min(1),
  deniedAt: z.string().min(8),
  hearingType: z.enum(["IPB", "MAB"]),
  denialLetter: z.string().max(20_000).optional(),
});

const REASON_PATTERNS = [
  /insufficient (medical )?evidence/i,
  /no (qualifying )?orthopedic points?/i,
  /below (the )?9[- ]?point threshold/i,
  /not caused by (NFL )?football/i,
  /pre[- ]?existing condition/i,
  /excluded (condition|impairment)/i,
  /late filing|after the deadline/i,
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const v = parsed.data;

  const claim = await prisma.claim.findUnique({
    where: { id: v.claimId },
    include: { profile: { include: { user: true } } },
  });
  if (!claim || claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const deniedAt = new Date(v.deniedAt);
  const deadline = computeAppealDeadline(deniedAt);

  const reasons = (v.denialLetter ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => REASON_PATTERNS.some((p) => p.test(line)));

  const themes = reasons.length
    ? reasons.map((r) => `Rebut: ${r}`)
    : ["Insufficient documentation", "Causation under NFL football activity", "Aggregate orthopedic point total"];

  const appeal = await prisma.appeal.create({
    data: {
      claimId: v.claimId,
      appealDeadline: deadline,
      hearingType: v.hearingType,
      status: "preparing",
      themesJson: JSON.stringify(themes),
      decisionMemo: v.denialLetter ?? null,
    },
  });

  await prisma.claim.update({
    where: { id: v.claimId },
    data: {
      status: "appealed",
      deniedAt,
      appealDeadline: deadline,
    },
  });

  await prisma.timelineEvent.create({
    data: {
      claimId: v.claimId,
      type: "appeal_filed",
      actor: userId,
      payload: JSON.stringify({ appealId: appeal.id, deniedAt, deadline, hearingType: v.hearingType }),
      payloadHash: sha256(appeal.id),
    },
  });
  await audit({ userId, action: "appeal.created", entityType: "appeal", entityId: appeal.id });

  return NextResponse.json({ ok: true, id: appeal.id });
}
