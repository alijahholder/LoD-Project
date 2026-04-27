import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { classifyUrgency, daysUntil } from "@/lib/lod/deadlines";
import { evaluateLodEligibility } from "@/lib/lod/eligibility";
import { formatDate } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;

  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    include: {
      claims: {
        orderBy: { createdAt: "desc" },
        include: {
          findings: { where: { status: "confirmed" } },
          recordRequests: true,
          appeals: true,
        },
      },
    },
  });

  if (!profile) redirect("/onboarding");

  const claim = profile.claims[0];
  const filingDays = daysUntil(profile.lodFilingDeadline);
  const urgency = classifyUrgency(filingDays);

  let eligibility = null;
  if (claim) {
    const orthoPoints = claim.findings
      .filter((f) => f.status === "confirmed")
      .reduce((s, f) => s + f.points, 0);
    eligibility = evaluateLodEligibility({ orthopedicPoints: orthoPoints });
  }

  const openRequests = claim?.recordRequests.filter((r) => r.status !== "complete") ?? [];

  return (
    <PageShell>
      <PageHeader
        title={`Welcome, ${profile.preferredName ?? profile.legalFirstName}`}
        subtitle="Here's where your Line of Duty claim stands today."
        actions={
          claim ? null : (
            <Link href="/claim/new">
              <Button>Start my claim</Button>
            </Link>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Filing deadline</CardTitle>
          </CardHeader>
          <CardBody>
            {profile.lodFilingDeadline ? (
              <>
                <div className="text-3xl font-semibold text-brand-950">
                  {filingDays !== null && filingDays >= 0
                    ? `${filingDays} ${filingDays === 1 ? "day" : "days"}`
                    : "Past deadline"}
                </div>
                <div className="mt-1 text-sm text-brand-700">
                  Deadline: <strong>{formatDate(profile.lodFilingDeadline)}</strong>
                </div>
                <div className="mt-3">
                  <Badge
                    tone={
                      urgency === "overdue"
                        ? "danger"
                        : urgency === "urgent"
                        ? "warn"
                        : urgency === "soon"
                        ? "info"
                        : "ok"
                    }
                  >
                    {urgency.toUpperCase()}
                  </Badge>
                </div>
              </>
            ) : (
              <p className="text-sm text-brand-700">
                Complete onboarding to compute your filing deadline.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eligibility (orthopedic)</CardTitle>
          </CardHeader>
          <CardBody>
            {eligibility ? (
              <>
                <div className="text-3xl font-semibold text-brand-950">
                  {eligibility.paths.orthopedic.current} / {eligibility.paths.orthopedic.threshold} pts
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-100">
                  <div
                    className="h-2 bg-brand-700 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (100 * eligibility.paths.orthopedic.current) /
                          eligibility.paths.orthopedic.threshold,
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-xs text-brand-700">
                  Counts confirmed orthopedic findings. Speech/sight ≥ 50%, hearing ≥ 55%, or vital-organ/CNS impairment also qualify.
                </p>
              </>
            ) : (
              <p className="text-sm text-brand-700">No claim yet.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open records requests</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-3xl font-semibold text-brand-950">{openRequests.length}</div>
            <p className="mt-1 text-sm text-brand-700">
              {openRequests.length
                ? "You have records still in flight from providers."
                : "No outstanding requests."}
            </p>
            <Link href="/records" className="mt-3 inline-flex items-center text-sm text-brand-700 underline">
              Manage records <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardBody>
        </Card>
      </div>

      {urgency === "urgent" || urgency === "overdue" ? (
        <div className="mt-6">
          <Callout tone="danger" title="Time-sensitive">
            Your LOD filing deadline is {urgency === "overdue" ? "past" : "very close"}. The deadline is the GREATER of 48 months or your Credited Seasons in years from your last active player date — and the Plan does not generally accept late filings. If you haven't filed yet, prioritize the claim builder.
          </Callout>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
          </CardHeader>
          <CardBody>
            <ol className="space-y-3 text-sm text-brand-800">
              {!profile.onboardingCompletedAt ? (
                <li>
                  <Link href="/onboarding" className="font-medium underline">
                    Finish onboarding
                  </Link>{" "}
                  — career history & deadline calc.
                </li>
              ) : null}
              {!claim ? (
                <li>
                  <Link href="/claim/new" className="font-medium underline">
                    Start your LOD claim
                  </Link>{" "}
                  — pre-screen and create the workspace.
                </li>
              ) : (
                <>
                  <li>
                    <Link href="/claim" className="font-medium underline">
                      Upload medical records
                    </Link>{" "}
                    — let the AI identify impairments.
                  </li>
                  <li>
                    <Link href="/records" className="font-medium underline">
                      Request records you don't have
                    </Link>{" "}
                    — track NFL Club &amp; third-party providers.
                  </li>
                  <li>
                    <Link href="/claim" className="font-medium underline">
                      Review AI-suggested findings
                    </Link>{" "}
                    — only confirmed ones count.
                  </li>
                </>
              )}
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why we snapshot every submission</CardTitle>
          </CardHeader>
          <CardBody className="prose-plain text-sm text-brand-800">
            The NFL Player Disability & Neurocognitive Benefit Plan is governed by ERISA. If a claim is denied and you ever go to federal court, the judge reviews the <strong>administrative record</strong> — the documents the Plan actually had. Every time you submit something through Gridiron LOD, we save an immutable snapshot with a hash so what was filed can never be questioned later.
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
