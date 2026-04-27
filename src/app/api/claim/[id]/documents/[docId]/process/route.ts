import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { runOCR } from "@/lib/ai/ocr";
import { extractFindings } from "@/lib/ai/extract";
import { mapFindingsToRubric } from "@/lib/ai/mapToRubric";
import { audit } from "@/lib/audit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { id: claimId, docId } = await params;

  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { profile: { include: { user: true } } },
  });
  if (!claim || claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc || doc.claimId !== claimId)
    return NextResponse.json({ error: "doc not found" }, { status: 404 });

  await prisma.document.update({ where: { id: docId }, data: { ocrStatus: "running" } });

  try {
    const buf = await getStorage().get(doc.storageKey);
    const ocr = await runOCR({ buf, mimeType: doc.mimeType, filename: doc.filename });

    await prisma.document.update({
      where: { id: docId },
      data: {
        ocrStatus: "done",
        ocrText: ocr.fullText.slice(0, 200_000),
        ocrJson: JSON.stringify(ocr.pages),
        pageCount: ocr.pageCount,
      },
    });

    const extraction = await extractFindings({ documentId: docId, ocr });
    await prisma.documentExtraction.create({
      data: {
        documentId: docId,
        modelVersion: extraction.modelVersion,
        findingsJson: JSON.stringify(extraction.findings),
      },
    });

    if (claim.rubricVersionId && extraction.findings.length > 0) {
      const matches = await mapFindingsToRubric({
        findings: extraction.findings,
        rubricVersionId: claim.rubricVersionId,
      });

      for (const m of matches) {
        const existing = await prisma.impairmentFinding.findFirst({
          where: { claimId, categoryId: m.categoryId, status: { in: ["suggested", "edited"] } },
        });
        if (existing) {
          await prisma.impairmentFinding.update({
            where: { id: existing.id },
            data: {
              confidence: Math.max(existing.confidence, m.confidence),
              rationale: m.rationale,
              citationsJson: JSON.stringify(
                [
                  ...(JSON.parse(existing.citationsJson || "[]") as unknown[]),
                  ...m.citations,
                ].slice(0, 50),
              ),
            },
          });
        } else {
          await prisma.impairmentFinding.create({
            data: {
              claimId,
              categoryId: m.categoryId,
              status: "suggested",
              points: m.points,
              confidence: m.confidence,
              rationale: m.rationale,
              citationsJson: JSON.stringify(m.citations),
            },
          });
        }
      }
    }

    await audit({
      userId,
      action: "document.processed",
      entityType: "document",
      entityId: docId,
      metadata: {
        claimId,
        pageCount: ocr.pageCount,
        findingCount: extraction.findings.length,
      },
    });

    return NextResponse.json({
      ok: true,
      pageCount: ocr.pageCount,
      findings: extraction.findings.length,
    });
  } catch (e) {
    await prisma.document.update({ where: { id: docId }, data: { ocrStatus: "failed" } });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
