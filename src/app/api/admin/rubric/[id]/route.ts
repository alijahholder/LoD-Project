import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

const Body = z.object({
  categories: z.array(
    z.object({
      id: z.string().optional(),
      code: z.string().min(1),
      bodyRegion: z.string().min(1),
      title: z.string().min(1),
      description: z.string(),
      points: z.number().int().min(0).max(50),
      pathway: z.string().min(1),
      evidenceRequirements: z.array(z.string()).default([]),
      excludedFromLOD: z.boolean().default(false),
      sortOrder: z.number().int().default(0),
    }),
  ),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const userId = (session!.user as { id: string }).id;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid", details: parsed.error.flatten() }, { status: 400 });

  const v = await prisma.rubricVersion.findUnique({ where: { id } });
  if (!v) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (v.isActive)
    return NextResponse.json({ error: "active versions are read-only; clone to a draft" }, { status: 409 });

  await prisma.impairmentCategory.deleteMany({ where: { rubricVersionId: id } });
  await prisma.impairmentCategory.createMany({
    data: parsed.data.categories.map((c, idx) => ({
      rubricVersionId: id,
      code: c.code,
      bodyRegion: c.bodyRegion,
      title: c.title,
      description: c.description,
      points: c.points,
      evidenceRequirements: JSON.stringify(c.evidenceRequirements),
      excludedFromLOD: c.excludedFromLOD,
      pathway: c.pathway,
      sortOrder: c.sortOrder ?? idx,
    })),
  });

  await audit({ userId, action: "rubric.saved", entityType: "rubric", entityId: id, metadata: { count: parsed.data.categories.length } });
  return NextResponse.json({ ok: true });
}
