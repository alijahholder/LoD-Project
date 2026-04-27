import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getClaimWithDetails } from "@/lib/claim";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { classifyUrgency, daysUntil } from "@/lib/lod/deadlines";
import { formatDate } from "@/lib/utils";

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const { id } = await params;
  const claim = await getClaimWithDetails(id, userId);
  if (!claim) notFound();

  const completeDays = daysUntil(claim.completenessClockEnd);
  const completeUrg = classifyUrgency(completeDays);
  const appealDays = daysUntil(claim.appealDeadline);
  const appealUrg = classifyUrgency(appealDays);

  const states: { state: string; reachedAt: Date | null }[] = [
    { state: "draft", reachedAt: claim.createdAt },
    { state: "screening", reachedAt: claim.prescreenAnswers ? claim.createdAt : null },
    { state: "submitted", reachedAt: claim.filedAt },
    { state: "completeness_review", reachedAt: claim.filedAt },
    { state: "decided", reachedAt: claim.decidedAt },
    { state: "denied", reachedAt: claim.deniedAt },
    { state: "appealed", reachedAt: claim.appeals.find((a) => a.filedAt)?.filedAt ?? null },
    { state: "awarded", reachedAt: claim.awardedAt },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Claim status & timeline"
        subtitle={`Current status: ${claim.status}`}
        actions={<Link href={`/claim/${claim.id}`} className="text-sm text-brand-700 underline">← Workspace</Link>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Filing deadline</CardTitle></CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold text-brand-950">{formatDate(claim.filingDeadline)}</div>
            <p className="mt-1 text-xs text-brand-600">
              Greater of 48 months / Credited Seasons years from your last active date.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>45-day completeness clock</CardTitle></CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold text-brand-950">
              {claim.completenessClockEnd ? formatDate(claim.completenessClockEnd) : "—"}
            </div>
            {claim.completenessClockEnd ? (
              <Badge tone={completeUrg === "overdue" ? "danger" : completeUrg === "urgent" ? "warn" : "info"}>
                {completeDays} days remain
              </Badge>
            ) : (
              <p className="mt-1 text-xs text-brand-600">Starts when you submit your initial application.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>180-day appeal clock</CardTitle></CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold text-brand-950">
              {claim.appealDeadline ? formatDate(claim.appealDeadline) : "—"}
            </div>
            {claim.appealDeadline ? (
              <Badge tone={appealUrg === "overdue" ? "danger" : appealUrg === "urgent" ? "warn" : "info"}>
                {appealDays} days remain
              </Badge>
            ) : (
              <p className="mt-1 text-xs text-brand-600">Starts on the date of any denial letter.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>State machine</CardTitle></CardHeader>
        <CardBody>
          <ol className="space-y-3 text-sm">
            {states.map((s) => (
              <li key={s.state} className="flex items-center gap-3">
                <Badge tone={s.reachedAt ? "ok" : "muted"}>{s.reachedAt ? "✓" : "—"}</Badge>
                <span className="font-medium text-brand-900">{s.state}</span>
                <span className="ml-auto text-xs text-brand-600">
                  {s.reachedAt ? formatDate(s.reachedAt) : "not yet"}
                </span>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Activity log (last 50)</CardTitle></CardHeader>
        <CardBody>
          {claim.timeline.length === 0 ? (
            <Callout tone="info">No events yet.</Callout>
          ) : (
            <ol className="divide-y divide-brand-100 text-sm">
              {claim.timeline.map((e) => (
                <li key={e.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-brand-900">{e.type}</span>
                    <span className="text-xs text-brand-600">{e.occurredAt.toLocaleString()}</span>
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap text-xs text-brand-700">
                    {tryFormatPayload(e.payload)}
                  </pre>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </PageShell>
  );
}

function tryFormatPayload(p: string) {
  try {
    return JSON.stringify(JSON.parse(p), null, 2);
  } catch {
    return p;
  }
}
