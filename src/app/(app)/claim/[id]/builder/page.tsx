import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getClaimWithDetails } from "@/lib/claim";
import { evaluateLodEligibility } from "@/lib/lod/eligibility";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import BuilderActions from "./BuilderActions";
import { formatDate } from "@/lib/utils";

export default async function ClaimBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const { id } = await params;
  const claim = await getClaimWithDetails(id, userId);
  if (!claim) notFound();

  const confirmedFindings = claim.findings.filter((f) => f.status === "confirmed");
  const orthoPoints = confirmedFindings
    .filter((f) => f.category.pathway === "orthopedic")
    .reduce((s, f) => s + f.points, 0);
  const elig = evaluateLodEligibility({ orthopedicPoints: orthoPoints });

  const checklist = [
    { ok: !!claim.profile.legalFirstName && !!claim.profile.lastActivePlayerDate, label: "Onboarding complete" },
    { ok: confirmedFindings.length > 0, label: "At least one confirmed finding" },
    { ok: claim.documents.length > 0, label: "Documents uploaded" },
    { ok: elig.eligible || orthoPoints > 0, label: "Eligibility path identified" },
    { ok: !!claim.filingDeadline, label: "Filing deadline computed" },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Claim builder"
        subtitle="Generate the cover letter, application, and exhibit index — then submit and snapshot."
        actions={<Link href={`/claim/${claim.id}`} className="text-sm text-brand-700 underline">← Workspace</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Pre-flight checklist</CardTitle></CardHeader>
            <CardBody>
              <ul className="space-y-2 text-sm">
                {checklist.map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Badge tone={c.ok ? "ok" : "warn"}>{c.ok ? "✓" : "todo"}</Badge>
                    <span className="text-brand-800">{c.label}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Confirmed findings ({confirmedFindings.length})</CardTitle></CardHeader>
            <CardBody>
              {confirmedFindings.length === 0 ? (
                <Callout tone="warn" title="No confirmed findings">
                  Confirm at least one finding before generating the packet, otherwise the application will list nothing under "Confirmed Impairments."
                </Callout>
              ) : (
                <ul className="divide-y divide-brand-100 text-sm">
                  {confirmedFindings.map((f) => (
                    <li key={f.id} className="flex items-center justify-between py-2">
                      <span>
                        <span className="font-medium text-brand-900">{f.category.title}</span>
                        <span className="ml-2 text-xs text-brand-600">{f.category.bodyRegion}</span>
                      </span>
                      <Badge tone="ok">{f.points} pts</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Submission actions</CardTitle></CardHeader>
            <CardBody>
              <BuilderActions claimId={claim.id} canSubmit={confirmedFindings.length > 0} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Submissions on file</CardTitle></CardHeader>
            <CardBody>
              {claim.submissions.length === 0 ? (
                <p className="text-sm text-brand-600">No submissions yet.</p>
              ) : (
                <ul className="divide-y divide-brand-100 text-sm">
                  {claim.submissions.map((s) => (
                    <li key={s.id} className="py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-brand-900">{s.kind}</span>
                        <span className="text-xs text-brand-600">{formatDate(s.filedAt)}</span>
                      </div>
                      <p className="text-xs text-brand-600">manifest: <code>{s.manifestHash.slice(0, 16)}…</code></p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-3">
          <Card>
            <CardHeader><CardTitle>What we generate</CardTitle></CardHeader>
            <CardBody className="text-sm text-brand-700">
              <p className="mb-2">A printable PDF that includes:</p>
              <ul className="list-disc pl-5">
                <li>Cover letter to the Disability Initial Claims Committee</li>
                <li>Application form auto-populated from your profile</li>
                <li>Confirmed findings with point totals</li>
                <li>Numbered exhibit index for your medical records</li>
                <li>ERISA § 503 notice</li>
              </ul>
              <p className="mt-3 text-xs">When you submit, we snapshot the manifest (file list + SHA-256 hashes) so the exact set of documents you filed is provable forever.</p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}
