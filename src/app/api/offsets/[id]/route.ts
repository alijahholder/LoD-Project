import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const offset = await prisma.offsetRecord.findUnique({
    where: { id },
    include: { profile: true },
  });
  if (!offset) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (offset.profile.userId !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.offsetRecord.delete({ where: { id } });
  await audit({ userId, action: "offset.delete", entityType: "offset", entityId: id });

  return NextResponse.json({ ok: true });
}
