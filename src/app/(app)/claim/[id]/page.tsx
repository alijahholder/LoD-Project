import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getClaimWithDetails } from "@/lib/claim";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { evaluateLodEligibility } from "@/lib/lod/eligibility";
import { classifyUrgency, daysUntil } from "@/lib/lod/deadlines";
import DocumentUploadClient from "./DocumentUploadClient";
import FindingsReview from "./FindingsReview";
import { formatDate } from "@/lib/utils";
import { FileText, BadgeCheck, Clock, Files } from "lucide-react";

export default async function ClaimWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const { id } = await params;
  const claim = await getClaimWithDetails(id, userId);
  if (!claim) notFound();

  const orthoConfirmed = claim.findings
    .filter((f) => f.status === "confirmed" && f.category.pathway === "orthopedic")
    .reduce((s, f) => s + f.points, 0);

  const eligibility = evaluateLodEligibility({ orthopedicPoints: orthoConfirmed });
  const days = daysUntil(claim.filingDeadline);
  const urgency = classifyUrgency(days);

  return (
    <PageShell>
      <PageHeader
        title={`LOD claim · ${claim.profile.preferredName ?? claim.profile.legalFirstName}`}
        subtitle={`Status: ${claim.status} · Created ${formatDate(claim.createdAt)}`}
        actions={
          <div className="flex gap-2">
            <Link href="/records" className="text-sm text-brand-700 underline">Records</Link>
            <Link href={`/claim/${claim.id}/builder`} className="text-sm text-brand-700 underline">Builder</Link>
            <Link href={`/claim/${claim.id}/timeline`} className="text-sm text-brand-700 underline">Timeline</Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Stat icon={Clock} label="Filing deadline" value={days !== null ? `${days} days` : "—"} sub={formatDate(claim.filingDeadline)} tone={urgency} />
        <Stat icon={BadgeCheck} label="Orthopedic points" value={`${orthoConfirmed} / ${eligibility.paths.orthopedic.threshold}`} sub={eligibility.paths.orthopedic.met ? "Threshold met" : "Below threshold"} tone={eligibility.paths.orthopedic.met ? "ok" : "muted"} />
        <Stat icon={Files} label="Documents" value={String(claim.documents.length)} sub={`${claim.documents.filter((d) => d.ocrStatus === "done").length} processed`} tone="info" />
        <Stat icon={FileText} label="Findings" value={String(claim.findings.length)} sub={`${claim.findings.filter((f) => f.status === "confirmed").length} confirmed`} tone="info" />
      </div>

      {urgency === "urgent" || urgency === "overdue" ? (
        <div className="mt-4">
          <Callout tone="danger" title="Filing deadline alert">
            {urgency === "overdue"
              ? "Your LOD filing deadline has passed. The Plan generally does not accept late initial filings — speak with an ERISA attorney about your options."
              : `Only ${days} days remain to file your initial LOD application. Prioritize the claim builder.`}
          </Callout>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload medical records</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="mb-3 text-sm text-brand-700">
                Drop in clinic notes, operative reports, MRI/X-ray reads — anything you have. The AI extracts diagnoses with page-level citations and proposes which LOD impairment categories they map to. <strong>Nothing counts until you confirm it.</strong>
              </p>
              <DocumentUploadClient claimId={claim.id} />
              <ul className="mt-4 divide-y divide-brand-100">
                {claim.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/claim/${claim.id}/documents/${d.id}`} className="truncate text-brand-800 underline">
                      {d.filename}
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge tone={d.source === "nfl_club" ? "info" : d.source === "third_party_provider" ? "default" : "muted"}>
                        {d.source}
                      </Badge>
                      <Badge tone={d.ocrStatus === "done" ? "ok" : d.ocrStatus === "failed" ? "danger" : "warn"}>
                        {d.ocrStatus}
                      </Badge>
                    </div>
                  </li>
                ))}
                {claim.documents.length === 0 ? (
                  <li className="py-3 text-sm text-brand-500">No documents yet.</li>
                ) : null}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review AI-suggested findings</CardTitle>
            </CardHeader>
            <CardBody>
              <FindingsReview claimId={claim.id} />
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Eligibility paths</CardTitle></CardHeader>
            <CardBody className="space-y-2 text-sm">
              <PathRow label="Orthopedic ≥ 9 pts" met={eligibility.paths.orthopedic.met} value={`${eligibility.paths.orthopedic.current} pts`} />
              <PathRow label="Speech/Sight ≥ 50%" met={eligibility.paths.speechSight.met} value={`max ${Math.max(eligibility.paths.speechSight.speech, eligibility.paths.speechSight.sight)}%`} />
              <PathRow label="Hearing ≥ 55%" met={eligibility.paths.hearing.met} value={`${eligibility.paths.hearing.current}%`} />
              <PathRow label="Vital organ / CNS" met={eligibility.paths.vitalOrganCNS.met} value={eligibility.paths.vitalOrganCNS.met ? "yes" : "no"} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Active rubric</CardTitle></CardHeader>
            <CardBody className="space-y-1 text-sm">
              {claim.rubricVersion ? (
                <>
                  <div className="font-medium text-brand-900">{claim.rubricVersion.name}</div>
                  <div className="text-brand-700">
                    Categories loaded: {claim.rubricVersion.categories.length}
                  </div>
                  <Link href="/admin/rubric" className="text-xs text-brand-700 underline">
                    View rubric (admin)
                  </Link>
                </>
              ) : (
                <p className="text-brand-700">No rubric attached.</p>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "muted" | "info" | "danger" | "warn" | "default" | "soon" | "urgent" | "overdue";
}) {
  const badgeTone =
    tone === "overdue" ? "danger" : tone === "urgent" ? "warn" : tone === "soon" ? "info" : tone === "ok" ? "ok" : tone === "info" ? "info" : tone === "muted" ? "muted" : "default";
  return (
    <Card>
      <CardBody>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-brand-700">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <div className="text-2xl font-semibold text-brand-950">{value}</div>
        {sub ? (
          <div className="mt-1">
            <Badge tone={badgeTone as never}>{sub}</Badge>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function PathRow({ label, met, value }: { label: string; met: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-brand-800">{label}</span>
      <Badge tone={met ? "ok" : "muted"}>{value}</Badge>
    </div>
  );
}
