import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Callout } from "@/components/ui/callout";

export default async function RubricListPage() {
  const versions = await prisma.rubricVersion.findMany({
    orderBy: { effectiveFrom: "desc" },
    include: { _count: { select: { categories: true, claims: true } } },
  });

  return (
    <PageShell>
      <PageHeader
        title="LOD Rubric versions"
        subtitle="Versioned, admin-editable. Publishing a new version preserves snapshots on existing claims."
        actions={
          <form action="/api/admin/rubric/clone-active" method="POST">
            <Button type="submit">Clone active version</Button>
          </form>
        }
      />

      <Callout tone="warn" title="Verify point values before relying on this rubric">
        The seeded "Appendix A v2 (DRAFT)" version is a structural skeleton. Final point values must be verified against the official NFL Player Disability Plan SPD before this is used in production claims.
      </Callout>

      <div className="mt-4 space-y-3">
        {versions.map((v) => (
          <Card key={v.id}>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>{v.name}</CardTitle>
                <div className="mt-1 flex items-center gap-2 text-xs text-brand-600">
                  <Badge tone="muted">{v.benefit}</Badge>
                  {v.isActive ? <Badge tone="ok">active</Badge> : null}
                  <span>Effective {formatDate(v.effectiveFrom)}</span>
                  <span>· {v._count.categories} categories</span>
                  <span>· {v._count.claims} claims using</span>
                </div>
              </div>
              <Link href={`/admin/rubric/${v.id}`}>
                <Button variant="outline" size="sm">Edit</Button>
              </Link>
            </CardHeader>
            {v.notes ? <CardBody className="text-sm text-brand-700">{v.notes}</CardBody> : null}
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
