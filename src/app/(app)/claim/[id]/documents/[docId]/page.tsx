import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import type { ClinicalFinding } from "@/lib/ai/types";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const { id: claimId, docId } = await params;

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: {
      claim: { include: { profile: { include: { user: true } } } },
      extractions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!doc || doc.claim.profile.user.id !== userId || doc.claimId !== claimId) notFound();

  const pages: { page: number; text: string }[] = doc.ocrJson
    ? JSON.parse(doc.ocrJson).map((p: { page: number; text: string }) => ({ page: p.page, text: p.text }))
    : [];
  const findings: ClinicalFinding[] = doc.extractions[0]
    ? JSON.parse(doc.extractions[0].findingsJson)
    : [];

  return (
    <PageShell>
      <PageHeader
        title={doc.filename}
        subtitle={`${doc.pageCount} page${doc.pageCount === 1 ? "" : "s"} · OCR ${doc.ocrStatus}`}
        actions={
          <Link href={`/claim/${claimId}`} className="text-sm text-brand-700 underline">
            ← Back to claim
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {pages.length === 0 ? (
            <Callout tone="warn" title="No OCR text yet">
              The document hasn't been processed yet, or processing failed.
            </Callout>
          ) : null}
          {pages.map((p) => (
            <Card key={p.page}>
              <CardHeader>
                <CardTitle>Page {p.page}</CardTitle>
              </CardHeader>
              <CardBody>
                <pre className="whitespace-pre-wrap text-sm leading-6 text-brand-900">
                  {highlight(p.text, findings.filter((f) => f.citation.page === p.page))}
                </pre>
              </CardBody>
            </Card>
          ))}
        </div>

        <aside className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Extracted findings ({findings.length})</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              {findings.length === 0 ? (
                <p className="text-brand-600">No findings extracted from this document.</p>
              ) : (
                findings.map((f, i) => (
                  <div key={i} className="rounded-lg border border-brand-100 bg-brand-50/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-brand-900">{f.diagnosis}</span>
                      <Badge tone="info">{f.bodyRegion}</Badge>
                    </div>
                    {f.severity ? <div className="text-xs text-brand-700">Severity: {f.severity}</div> : null}
                    <p className="mt-1 text-xs text-brand-700">
                      <strong>Page {f.citation.page}</strong>: <em>"…{f.citation.snippet}…"</em>
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}

function highlight(text: string, findings: ClinicalFinding[]): React.ReactNode {
  if (findings.length === 0) return text;
  const ranges: { start: number; end: number }[] = [];
  for (const f of findings) {
    const idx = text.indexOf(f.citation.snippet.slice(0, 40));
    if (idx >= 0) ranges.push({ start: idx, end: idx + Math.min(80, f.citation.snippet.length) });
  }
  ranges.sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cur = 0;
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (r.start < cur) continue;
    parts.push(text.slice(cur, r.start));
    parts.push(
      <mark key={i} className="rounded bg-amber-100 px-0.5">
        {text.slice(r.start, r.end)}
      </mark>,
    );
    cur = r.end;
  }
  parts.push(text.slice(cur));
  return parts;
}
