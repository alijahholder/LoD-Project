import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

const Body = z.object({ body: z.string().min(1).max(50_000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const userId = (session!.user as { id: string }).id;
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await prisma.template.update({ where: { id }, data: { body: parsed.data.body } });
  await audit({ userId, action: "template.saved", entityType: "template", entityId: id });
  return NextResponse.json({ ok: true });
}
