import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

const Body = z.object({
  physicianName: z.string().optional(),
  specialty: z.string().optional(),
  scheduledFor: z.string().optional(),
  location: z.string().optional(),
  postNotes: z.string().optional(),
  inadequate: z.boolean().optional(),
  supplementalLetterMd: z.string().optional(),
  prep: z.array(z.object({ id: z.string(), label: z.string(), done: z.boolean() })).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const exam = await prisma.neutralPhysicianExam.findUnique({
    where: { id },
    include: { claim: { include: { profile: { include: { user: true } } } } },
  });
  if (!exam || exam.claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const v = parsed.data;

  await prisma.neutralPhysicianExam.update({
    where: { id },
    data: {
      physicianName: v.physicianName ?? exam.physicianName,
      specialty: v.specialty ?? exam.specialty,
      scheduledFor: v.scheduledFor ? new Date(v.scheduledFor) : exam.scheduledFor,
      location: v.location ?? exam.location,
      postNotes: v.postNotes ?? exam.postNotes,
      inadequate: v.inadequate ?? exam.inadequate,
      supplementalLetterMd: v.supplementalLetterMd ?? exam.supplementalLetterMd,
      prepChecklistJson: v.prep ? JSON.stringify(v.prep) : exam.prepChecklistJson,
    },
  });
  await audit({ userId, action: "exam.updated", entityType: "exam", entityId: id });
  return NextResponse.json({ ok: true });
}
