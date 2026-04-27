import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";

const Body = z.object({
  claimId: z.string().min(1),
  physicianName: z.string().min(1),
  specialty: z.string().optional(),
  scheduledFor: z.string().optional(),
  location: z.string().optional(),
});

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

  const exam = await prisma.neutralPhysicianExam.create({
    data: {
      claimId: v.claimId,
      physicianName: v.physicianName,
      specialty: v.specialty,
      scheduledFor: v.scheduledFor ? new Date(v.scheduledFor) : null,
      location: v.location,
    },
  });
  await prisma.timelineEvent.create({
    data: {
      claimId: v.claimId,
      type: "exam_scheduled",
      actor: userId,
      payload: JSON.stringify({ examId: exam.id, physician: v.physicianName, scheduledFor: v.scheduledFor }),
      payloadHash: sha256(exam.id),
    },
  });
  await audit({ userId, action: "exam.scheduled", entityType: "exam", entityId: exam.id });
  return NextResponse.json({ ok: true, id: exam.id });
}
