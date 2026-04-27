import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function POST() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const userId = (session!.user as { id: string }).id;

  const active = await prisma.rubricVersion.findFirst({
    where: { isActive: true, benefit: "LOD" },
    include: { categories: true },
  });
  if (!active) return NextResponse.redirect(new URL("/admin/rubric", process.env.NEXTAUTH_URL || "http://localhost:3000"));

  const clone = await prisma.rubricVersion.create({
    data: {
      name: active.name + " (draft " + new Date().toISOString().slice(0, 10) + ")",
      benefit: active.benefit,
      isActive: false,
      publishedById: userId,
      notes: "Cloned from " + active.name + ". Edit, then publish.",
      categories: {
        create: active.categories.map((c) => ({
          code: c.code,
          bodyRegion: c.bodyRegion,
          title: c.title,
          description: c.description,
          points: c.points,
          evidenceRequirements: c.evidenceRequirements,
          excludedFromLOD: c.excludedFromLOD,
          pathway: c.pathway,
          sortOrder: c.sortOrder,
        })),
      },
    },
  });
  await audit({ userId, action: "rubric.cloned", entityType: "rubric", entityId: clone.id });
  return NextResponse.redirect(new URL(`/admin/rubric/${clone.id}`, process.env.NEXTAUTH_URL || "http://localhost:3000"));
}
