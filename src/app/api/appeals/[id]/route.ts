import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";

const Body = z.object({
  themes: z.array(z.string()).optional(),
  exhibits: z.array(z.object({
    number: z.number().int(),
    documentId: z.string(),
    filename: z.string(),
    description: z.string(),
  })).optional(),
  briefMarkdown: z.string().optional(),
  witnesses: z.array(z.object({ name: z.string(), role: z.string(), topic: z.string() })).optional(),
  mockQA: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  hearingType: z.string().optional(),
  hearingDate: z.string().nullable().optional(),
  status: z.string().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const appeal = await prisma.appeal.findUnique({
    where: { id },
    include: { claim: { include: { profile: { include: { user: true } } } } },
  });
  if (!appeal) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (appeal.claim.profile.user.id !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const v = parsed.data;

  const updated = await prisma.appeal.update({
    where: { id },
    data: {
      themesJson: v.themes ? JSON.stringify(v.themes) : undefined,
      exhibitsJson: v.exhibits ? JSON.stringify(v.exhibits) : undefined,
      briefMarkdown: v.briefMarkdown,
      witnessPlanJson: v.witnesses ? JSON.stringify(v.witnesses) : undefined,
      mockQAJson: v.mockQA ? JSON.stringify(v.mockQA) : undefined,
      hearingType: v.hearingType,
      hearingDate: v.hearingDate ? new Date(v.hearingDate) : v.hearingDate === null ? null : undefined,
      status: v.status,
    },
  });

  await prisma.timelineEvent.create({
    data: {
      claimId: appeal.claimId,
      type: "appeal_updated",
      actor: userId,
      payload: JSON.stringify({ appealId: id, status: v.status }),
      payloadHash: sha256(id + (v.status ?? "")),
    },
  });
  await audit({ userId, action: "appeal.update", entityType: "appeal", entityId: id });

  return NextResponse.json({ ok: true, id: updated.id });
}
