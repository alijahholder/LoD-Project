import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";
import { generateTextPdf } from "@/lib/pdf";
import { buildStorageKey, getStorage } from "@/lib/storage";
import { snapshotSubmission } from "@/lib/erisa/snapshot";
import { formatDate } from "@/lib/utils";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const appeal = await prisma.appeal.findUnique({
    where: { id },
    include: { claim: { include: { profile: { include: { user: true } } } } },
  });
  if (!appeal) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (appeal.claim.profile.user.id !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!appeal.briefMarkdown) {
    return NextResponse.json({ error: "Generate or paste a brief before filing." }, { status: 400 });
  }

  const playerName = `${appeal.claim.profile.legalFirstName} ${appeal.claim.profile.legalLastName}`;
  const sections = appeal.briefMarkdown
    .split(/^## /m)
    .map((s, i) => (i === 0 ? { heading: undefined, body: s.trim() } : { heading: s.split(/\n/)[0].trim(), body: s.split(/\n/).slice(1).join("\n").trim() }))
    .filter((s) => s.body || s.heading);

  const briefPdf = await generateTextPdf({
    title: `Appeal of LOD denial — ${playerName}`,
    sections,
    footer: `Filed ${formatDate(new Date())} · Appeal ${id} · ERISA admin record`,
  });

  const filename = `appeal-${id.slice(0, 8)}-${Date.now()}.pdf`;
  const key = buildStorageKey({ claimId: appeal.claimId, kind: "appeals", filename });
  const buf = Buffer.from(briefPdf);
  await getStorage().put(key, buf, "application/pdf");

  const briefDoc = await prisma.document.create({
    data: {
      claimId: appeal.claimId,
      source: "plan_correspondence",
      providerName: "appeal_brief",
      filename,
      mimeType: "application/pdf",
      byteSize: buf.byteLength,
      storageKey: key,
      sha256: sha256(buf),
      pageCount: 0,
      ocrStatus: "done",
    },
  });

  const exhibits: Array<{ documentId: string; filename: string; description: string; number: number }> = [];
  try {
    const parsed = JSON.parse(appeal.exhibitsJson ?? "[]");
    if (Array.isArray(parsed)) exhibits.push(...parsed);
  } catch {
    /* noop */
  }

  const docIds = [briefDoc.id, ...exhibits.map((e) => e.documentId)];

  const { submissionId, manifestHash } = await snapshotSubmission({
    claimId: appeal.claimId,
    kind: "appeal",
    documentIds: docIds,
    signerName: playerName,
    notes: `Appeal ${id} · ${appeal.hearingType ?? "level TBD"}`,
    actorUserId: userId,
  });

  await prisma.appeal.update({
    where: { id },
    data: { status: "filed", filedAt: new Date() },
  });

  await audit({
    userId,
    action: "appeal.file",
    entityType: "appeal",
    entityId: id,
    metadata: { submissionId, manifestHash, briefDocId: briefDoc.id },
  });

  return NextResponse.json({ ok: true, submissionId, manifestHash, briefDocId: briefDoc.id });
}
