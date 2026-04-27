import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

const Patch = z.object({
  paidAt: z.string().min(8).nullable().optional(),
  notes: z.string().max(2000).optional(),
});

async function authorize(id: string, userId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { claim: { include: { profile: true } } },
  });
  if (!payment) return { error: "not found" as const, status: 404 };
  if (payment.claim.profile.userId !== userId) return { error: "forbidden" as const, status: 403 };
  return { payment };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const a = await authorize(id, userId);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });

  const json = await req.json().catch(() => null);
  const parsed = Patch.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const v = parsed.data;

  await prisma.payment.update({
    where: { id },
    data: {
      paidAt: v.paidAt === undefined ? undefined : v.paidAt ? new Date(v.paidAt) : null,
      notes: v.notes ?? undefined,
    },
  });
  await audit({ userId, action: "payment.update", entityType: "payment", entityId: id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const a = await authorize(id, userId);
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });

  await prisma.payment.delete({ where: { id } });
  await audit({ userId, action: "payment.delete", entityType: "payment", entityId: id });
  return NextResponse.json({ ok: true });
}
