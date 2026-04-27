import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

const Body = z.object({
  profileId: z.string().min(1),
  source: z.enum(["SSDI", "WC", "other"]),
  monthlyAmount: z.number().nonnegative(),
  effectiveFrom: z.string().min(8),
  effectiveTo: z.string().min(8).nullable().optional(),
  notes: z.string().max(2000).optional().default(""),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const v = parsed.data;

  const profile = await prisma.playerProfile.findUnique({
    where: { id: v.profileId },
    select: { id: true, userId: true },
  });
  if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (profile.userId !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const offset = await prisma.offsetRecord.create({
    data: {
      profileId: profile.id,
      source: v.source,
      monthlyAmount: v.monthlyAmount,
      effectiveFrom: new Date(v.effectiveFrom),
      effectiveTo: v.effectiveTo ? new Date(v.effectiveTo) : null,
      notes: v.notes || null,
    },
  });

  await audit({
    userId,
    action: "offset.create",
    entityType: "offset",
    entityId: offset.id,
    metadata: { source: v.source, monthlyAmount: v.monthlyAmount },
  });

  return NextResponse.json({ ok: true, id: offset.id });
}
