import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getActiveClaim } from "@/lib/claim";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { DEFAULT_LOD_ASSUMPTIONS, projectedNetMonthly } from "@/lib/lod/offsets";
import { formatDate, formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import OffsetsClient from "./OffsetsClient";
import PaymentsClient from "./PaymentsClient";

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;

  const claim = await getActiveClaim(userId);
  if (!claim) redirect("/onboarding");

  const profile = await prisma.playerProfile.findFirst({
    where: { userId },
    include: {
      offsets: { orderBy: { effectiveFrom: "desc" } },
    },
  });
  if (!profile) redirect("/onboarding");

  const payments = await prisma.payment.findMany({
    where: { claimId: claim.id },
    orderBy: { periodStart: "desc" },
  });

  const activeOffsets = profile.offsets
    .filter((o) => !o.effectiveTo || o.effectiveTo > new Date())
    .map((o) => ({ source: o.source as "SSDI" | "WC" | "other", monthlyAmount: o.monthlyAmount }));

  const projection = projectedNetMonthly({
    baseMonthly: DEFAULT_LOD_ASSUMPTIONS.baseMonthly,
    offsets: activeOffsets,
  });

  return (
    <PageShell>
      <PageHeader
        title="Offsets &amp; payments"
        subtitle="Capture SSDI and Workers' Comp awards so we can project your net monthly LOD benefit and reconcile actual payments."
      />

      <Callout tone="info" title="Calculator is illustrative">
        Final dollar amounts and offset eligibility are governed by the Plan document and CBA Article 60. We show every input transparently — confirm with the Plan before relying on these numbers.
      </Callout>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <OffsetsClient
            profileId={profile.id}
            offsets={profile.offsets.map((o) => ({
              id: o.id,
              source: o.source,
              monthlyAmount: o.monthlyAmount,
              effectiveFrom: o.effectiveFrom.toISOString(),
              effectiveTo: o.effectiveTo?.toISOString() ?? null,
              notes: o.notes ?? "",
            }))}
          />

          <PaymentsClient
            claimId={claim.id}
            payments={payments.map((p) => ({
              id: p.id,
              periodStart: p.periodStart.toISOString(),
              periodEnd: p.periodEnd.toISOString(),
              gross: p.gross,
              offsetTotal: p.offsetTotal,
              net: p.net,
              paidAt: p.paidAt?.toISOString() ?? null,
              notes: p.notes ?? "",
            }))}
          />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Projected monthly</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <Row label="Gross LOD" value={formatMoney(projection.gross)} />
              {projection.applied.map((a, i) => (
                <Row
                  key={i}
                  label={`${a.source} offset`}
                  value={`${a.applied ? "−" : ""}${formatMoney(a.amount)}`}
                  hint={a.applied ? undefined : <Badge tone="muted">not applied</Badge>}
                />
              ))}
              <div className="border-t border-brand-100 pt-2">
                <Row label="Net monthly (projected)" value={formatMoney(projection.net)} bold />
              </div>
              <p className="pt-2 text-xs text-brand-600">
                Base monthly is a placeholder until you publish actual rates in admin settings.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent payments</CardTitle>
            </CardHeader>
            <CardBody className="text-sm">
              {payments.length === 0 ? (
                <p className="text-brand-700">No payments recorded yet.</p>
              ) : (
                <ul className="space-y-1">
                  {payments.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      <span>{formatDate(p.periodStart)}</span>
                      <span className="font-medium">{formatMoney(p.net)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}

function Row({ label, value, hint, bold }: { label: string; value: string; hint?: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-brand-900" : ""}`}>
      <span className="text-brand-700">{label}</span>
      <span className="flex items-center gap-2">
        {hint}
        <span>{value}</span>
      </span>
    </div>
  );
}
