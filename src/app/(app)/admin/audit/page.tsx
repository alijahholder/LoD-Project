import { prisma } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { verifyAuditChain } from "@/lib/audit";

export default async function AuditPage() {
  const [entries, chain] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { occurredAt: "desc" },
      take: 200,
      include: { user: { select: { email: true } } },
    }),
    verifyAuditChain(),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Audit log"
        subtitle={`Append-only, hash-chained PHI access ledger. Last 200 entries.`}
        actions={<Badge tone={chain.ok ? "ok" : "danger"}>{chain.ok ? "Chain intact" : `Broken at ${chain.brokenAt}`}</Badge>}
      />
      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-brand-700">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-brand-700">{e.occurredAt.toLocaleString()}</td>
                  <td className="px-3 py-2 text-brand-800">{e.user?.email ?? "—"}</td>
                  <td className="px-3 py-2 font-medium text-brand-900">{e.action}</td>
                  <td className="px-3 py-2 text-brand-700">{e.entityType ? `${e.entityType}/${e.entityId ?? "?"}` : "—"}</td>
                  <td className="truncate px-3 py-2 font-mono text-xs text-brand-500">{e.hash.slice(0, 12)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </PageShell>
  );
}
