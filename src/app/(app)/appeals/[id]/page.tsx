import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { classifyUrgency, daysUntil } from "@/lib/lod/deadlines";
import { formatDate } from "@/lib/utils";
import AppealWorkspace from "./AppealWorkspace";

export default async function AppealDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const appeal = await prisma.appeal.findUnique({
    where: { id },
    include: {
      claim: {
        include: {
          profile: { include: { user: true } },
          documents: { orderBy: { uploadedAt: "desc" } },
          findings: {
            include: { category: true },
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          },
        },
      },
    },
  });
  if (!appeal) return notFound();
  if (appeal.claim.profile.user.id !== userId) return notFound();

  const days = daysUntil(appeal.appealDeadline);
  const urg = classifyUrgency(days);

  return (
    <PageShell>
      <PageHeader
        title={`Appeal · ${appeal.hearingType ?? "level TBD"}`}
        subtitle={`Claim ${appeal.claim.id.slice(0, 8)} · status ${appeal.claim.status}`}
        actions={
          <Link href="/appeals">
            <Button variant="outline" size="sm">All appeals</Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Callout tone="warn" title="Building the administrative record">
            Anything not put into the record during this appeal will not be available to a federal judge under ERISA review. Add every supplemental letter, affidavit, and additional record now.
          </Callout>

          <AppealWorkspace
            appeal={{
              id: appeal.id,
              status: appeal.status,
              hearingType: appeal.hearingType ?? "IPB",
              hearingDate: appeal.hearingDate?.toISOString() ?? null,
              filedAt: appeal.filedAt?.toISOString() ?? null,
              briefMarkdown: appeal.briefMarkdown ?? "",
              themesJson: appeal.themesJson ?? "[]",
              exhibitsJson: appeal.exhibitsJson ?? "[]",
              witnessPlanJson: appeal.witnessPlanJson ?? "[]",
              mockQAJson: appeal.mockQAJson ?? "[]",
              decisionMemo: appeal.decisionMemo ?? "",
              decisionOutcome: appeal.decisionOutcome ?? null,
            }}
            documents={appeal.claim.documents.map((d) => ({
              id: d.id,
              filename: d.filename,
              source: d.source,
              uploadedAt: d.uploadedAt.toISOString(),
            }))}
            findings={appeal.claim.findings.map((f) => ({
              id: f.id,
              status: f.status,
              points: f.points,
              category: { code: f.category.code, title: f.category.title, bodyRegion: f.category.bodyRegion },
            }))}
          />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appeal clock</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-brand-700">Deadline</span>
                <span className="font-medium">{formatDate(appeal.appealDeadline)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-700">Days remaining</span>
                <Badge tone={urg === "overdue" ? "danger" : urg === "urgent" ? "warn" : "ok"}>
                  {days !== null ? `${days} ${urg}` : "—"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-700">Status</span>
                <Badge tone="info">{appeal.status}</Badge>
              </div>
              {appeal.filedAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-brand-700">Filed</span>
                  <span>{formatDate(appeal.filedAt)}</span>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Denial letter excerpt</CardTitle>
            </CardHeader>
            <CardBody className="text-sm">
              {appeal.decisionMemo ? (
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs text-brand-800">
                  {appeal.decisionMemo}
                </pre>
              ) : (
                <p className="text-brand-700">No denial letter parsed. You can paste it from the appeal start screen.</p>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}
