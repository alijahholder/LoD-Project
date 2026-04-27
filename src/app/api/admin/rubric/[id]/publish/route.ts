import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const userId = (session!.user as { id: string }).id;
  const { id } = await params;

  const v = await prisma.rubricVersion.findUnique({ where: { id } });
  if (!v) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.rubricVersion.updateMany({
      where: { benefit: v.benefit, isActive: true },
      data: { isActive: false },
    }),
    prisma.rubricVersion.update({
      where: { id },
      data: { isActive: true, publishedById: userId, effectiveFrom: new Date() },
    }),
  ]);

  await audit({ userId, action: "rubric.published", entityType: "rubric", entityId: id });
  return NextResponse.json({ ok: true });
}
