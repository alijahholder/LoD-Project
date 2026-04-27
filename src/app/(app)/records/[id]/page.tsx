import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { fillTemplate } from "@/lib/templating";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { formatDate } from "@/lib/utils";
import RequestActionsClient from "./RequestActionsClient";
import FollowUpList from "./FollowUpList";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const r = await prisma.medicalRecordRequest.findUnique({
    where: { id },
    include: {
      claim: { include: { profile: { include: { user: true, teamHistory: true } } } },
      followUps: { orderBy: { dueAt: "asc" } },
    },
  });
  if (!r || r.claim.profile.user.id !== userId) notFound();

  const tpl = await prisma.template.findFirst({
    where: {
      kind: r.providerType === "nfl_club" ? "hipaa_release_nfl_club" : "hipaa_release_third_party",
      isActive: true,
    },
  });

  const filled = tpl
    ? fillTemplate(tpl.body, {
        playerName: `${r.claim.profile.legalFirstName} ${r.claim.profile.legalLastName}`,
        dob: r.claim.profile.dateOfBirth.toLocaleDateString(),
        clubName: r.providerName,
        providerName: r.providerName,
        seasonYears: r.claim.profile.teamHistory
          .filter((t) => t.team.toLowerCase() === r.providerName.toLowerCase())
          .map((t) => `${t.startYear}–${t.endYear}`)
          .join(", ") || "—",
        recipientBlock: "Gridiron LOD\nc/o claimant",
        dateRangeStart: r.dateRangeStart ? formatDate(r.dateRangeStart) : "—",
        dateRangeEnd: r.dateRangeEnd ? formatDate(r.dateRangeEnd) : "—",
        expirationDate: formatDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)),
      })
    : null;

  return (
    <PageShell>
      <PageHeader
        title={r.providerName}
        subtitle={`${r.providerType === "nfl_club" ? "NFL Club" : "Third-party provider"} · created ${formatDate(r.createdAt)}`}
        actions={<Link href="/records" className="text-sm text-brand-700 underline">← All records</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardBody>
              <RequestActionsClient
                requestId={r.id}
                initial={{
                  status: r.status,
                  method: r.method ?? "mail",
                  expectedBy: r.expectedBy?.toISOString().slice(0, 10) ?? "",
                  sentAt: r.sentAt?.toISOString().slice(0, 10) ?? "",
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow-ups & call log (ERISA record)</CardTitle>
            </CardHeader>
            <CardBody>
              <FollowUpList
                requestId={r.id}
                items={r.followUps.map((f) => ({
                  id: f.id,
                  dueAt: f.dueAt.toISOString(),
                  channel: f.channel,
                  outcome: f.outcome,
                  notes: f.notes,
                  completedAt: f.completedAt?.toISOString() ?? null,
                }))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>HIPAA authorization (preview)</CardTitle>
            </CardHeader>
            <CardBody>
              {filled ? (
                <pre className="whitespace-pre-wrap rounded-lg border border-brand-100 bg-brand-50/40 p-3 text-xs leading-6 text-brand-900">
                  {filled}
                </pre>
              ) : (
                <Callout tone="warn">No HIPAA template active. Ask your admin to create one.</Callout>
              )}
              {filled ? (
                <div className="mt-3 flex gap-2">
                  <form action={`/api/records/${r.id}/release`} method="POST">
                    <Button type="submit" variant="outline">Generate signable PDF</Button>
                  </form>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Quick facts</CardTitle></CardHeader>
            <CardBody className="space-y-1 text-sm">
              <div><Badge tone="info">{r.providerType}</Badge></div>
              <div><strong>Status:</strong> {r.status}</div>
              <div><strong>Sent:</strong> {r.sentAt ? formatDate(r.sentAt) : "—"}</div>
              <div><strong>Expected:</strong> {r.expectedBy ? formatDate(r.expectedBy) : "—"}</div>
              <div><strong>Method:</strong> {r.method ?? "—"}</div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}
