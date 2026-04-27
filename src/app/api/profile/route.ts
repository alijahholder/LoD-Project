import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { computeLodFilingDeadline } from "@/lib/lod/deadlines";
import { audit } from "@/lib/audit";

const Body = z.object({
  legalFirstName: z.string().min(1).max(80),
  legalLastName: z.string().min(1).max(80),
  preferredName: z.string().max(80).optional().or(z.literal("")),
  dateOfBirth: z.string().min(8),
  position: z.string().max(8).optional().or(z.literal("")),
  creditedSeasons: z.number().int().min(0).max(30),
  lastActivePlayerDate: z.string().min(8),
  teams: z
    .array(
      z.object({
        team: z.string().min(1).max(80),
        startYear: z.number().int().min(1950).max(2100),
        endYear: z.number().int().min(1950).max(2100),
      }),
    )
    .max(20),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const v = parsed.data;
  const lapd = new Date(v.lastActivePlayerDate);
  const deadline = computeLodFilingDeadline({
    lastActivePlayerDate: lapd,
    creditedSeasons: v.creditedSeasons,
  });

  const existing = await prisma.playerProfile.findUnique({ where: { userId } });
  const data = {
    legalFirstName: v.legalFirstName,
    legalLastName: v.legalLastName,
    preferredName: v.preferredName || null,
    dateOfBirth: new Date(v.dateOfBirth),
    position: v.position || null,
    creditedSeasons: v.creditedSeasons,
    lastActivePlayerDate: lapd,
    lodFilingDeadline: deadline,
    onboardingCompletedAt: new Date(),
  };

  let profile;
  if (existing) {
    profile = await prisma.playerProfile.update({ where: { userId }, data });
  } else {
    profile = await prisma.playerProfile.create({ data: { userId, ...data } });
  }

  await prisma.teamStint.deleteMany({ where: { profileId: profile.id } });
  if (v.teams.length) {
    await prisma.teamStint.createMany({
      data: v.teams.map((t) => ({
        profileId: profile.id,
        team: t.team,
        startYear: t.startYear,
        endYear: t.endYear,
      })),
    });
  }

  // Auto-create a draft claim if none exists
  const existingClaim = await prisma.claim.findFirst({ where: { profileId: profile.id } });
  if (!existingClaim) {
    const rubric = await prisma.rubricVersion.findFirst({ where: { isActive: true, benefit: "LOD" } });
    const claim = await prisma.claim.create({
      data: {
        profileId: profile.id,
        benefitType: "LOD",
        rubricVersionId: rubric?.id ?? null,
        status: "draft",
        filingDeadline: deadline,
      },
    });
    await prisma.timelineEvent.create({
      data: {
        claimId: claim.id,
        type: "status_change",
        actor: userId,
        payload: JSON.stringify({ to: "draft", reason: "claim_created" }),
        payloadHash: "",
      },
    });
  }

  await audit({ userId, action: "profile.upserted", entityType: "profile", entityId: profile.id });
  return NextResponse.json({ ok: true });
}
