import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getActiveClaim } from "@/lib/claim";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { classifyUrgency, daysUntil } from "@/lib/lod/deadlines";

type RR = Prisma.MedicalRecordRequestGetPayload<{ include: { followUps: true } }>;

export default async function RecordsHub() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const claim = await getActiveClaim(userId);
  if (!claim) redirect("/onboarding");

  const requests: RR[] = await prisma.medicalRecordRequest.findMany({
    where: { claimId: claim.id },
    orderBy: { createdAt: "desc" },
    include: { followUps: { orderBy: { dueAt: "asc" } } },
  });

  const nflClub = requests.filter((r) => r.providerType === "nfl_club");
  const thirdParty = requests.filter((r) => r.providerType === "third_party");

  return (
    <PageShell>
      <PageHeader
        title="Medical records hub"
        subtitle="Track every record request from start to finish. Each call/email becomes part of your ERISA administrative record."
        actions={
          <div className="flex gap-2">
            <Link href={`/records/new?type=nfl_club`}><Button variant="outline">Request NFL Club records</Button></Link>
            <Link href={`/records/new?type=third_party`}><Button>Request third-party records</Button></Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Queue title="NFL Club records" requests={nflClub} kind="nfl_club" />
        <Queue title="Third-party providers" requests={thirdParty} kind="third_party" />
      </div>
    </PageShell>
  );
}

function Queue({ title, requests, kind }: { title: string; requests: RR[]; kind: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} <span className="ml-2 text-xs font-normal text-brand-500">({requests.length})</span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-brand-200 p-6 text-center text-sm text-brand-600">
            No requests yet.
            <div className="mt-2">
              <Link href={`/records/new?type=${kind}`} className="text-brand-700 underline">
                Start one
              </Link>
            </div>
          </div>
        ) : null}
        {requests.map((r) => {
          const next = r.followUps.find((f) => !f.completedAt);
          const days = daysUntil(next?.dueAt ?? r.expectedBy);
          const urgency = classifyUrgency(days);
          return (
            <div key={r.id} className="rounded-lg border border-brand-100 bg-white p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/records/${r.id}`} className="font-medium text-brand-900 underline">
                    {r.providerName}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    {r.method ? <Badge tone="muted">via {r.method}</Badge> : null}
                    {r.expectedBy ? <span className="text-brand-700">Expected {formatDate(r.expectedBy)}</span> : null}
                  </div>
                  {next ? (
                    <p className="mt-1 text-xs text-brand-700">
                      Next follow-up: {next.channel} on {formatDate(next.dueAt)}
                    </p>
                  ) : null}
                </div>
                <Badge tone={urgency === "overdue" ? "danger" : urgency === "urgent" ? "warn" : "muted"}>
                  {urgency}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function statusTone(s: string): "ok" | "danger" | "warn" | "info" | "muted" {
  switch (s) {
    case "complete": return "ok";
    case "denied": return "danger";
    case "escalated": return "warn";
    case "sent":
    case "partial": return "info";
    default: return "muted";
  }
}
