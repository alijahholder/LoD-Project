import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";

const Body = z.object({
  claimId: z.string().min(1),
  periodStart: z.string().min(8),
  periodEnd: z.string().min(8),
  gross: z.number().nonnegative(),
  offsetTotal: z.number().nonnegative().default(0),
  net: z.number().nonnegative(),
  paidAt: z.string().min(8).nullable().optional(),
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

  const claim = await prisma.claim.findUnique({
    where: { id: v.claimId },
    include: { profile: true },
  });
  if (!claim) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (claim.profile.userId !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const payment = await prisma.payment.create({
    data: {
      claimId: claim.id,
      periodStart: new Date(v.periodStart),
      periodEnd: new Date(v.periodEnd),
      gross: v.gross,
      offsetTotal: v.offsetTotal,
      net: v.net,
      paidAt: v.paidAt ? new Date(v.paidAt) : null,
      notes: v.notes || null,
    },
  });

  await prisma.timelineEvent.create({
    data: {
      claimId: claim.id,
      type: "payment_recorded",
      actor: userId,
      payload: JSON.stringify({ paymentId: payment.id, gross: v.gross, net: v.net }),
      payloadHash: sha256(payment.id),
    },
  });
  await audit({ userId, action: "payment.create", entityType: "payment", entityId: payment.id });

  return NextResponse.json({ ok: true, id: payment.id });
}
