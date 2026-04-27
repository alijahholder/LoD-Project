import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { verifyAuditChain } from "@/lib/audit";

export default async function AdminHome() {
  const [users, claims, rubrics, audit] = await Promise.all([
    prisma.user.count(),
    prisma.claim.count(),
    prisma.rubricVersion.count(),
    verifyAuditChain(),
  ]);

  return (
    <PageShell>
      <PageHeader title="Admin console" subtitle="Manage rubrics, templates, and audit." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Users</CardTitle></CardHeader>
          <CardBody className="text-3xl font-semibold text-brand-950">{users}</CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Claims</CardTitle></CardHeader>
          <CardBody className="text-3xl font-semibold text-brand-950">{claims}</CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Rubric versions</CardTitle></CardHeader>
          <CardBody className="text-3xl font-semibold text-brand-950">{rubrics}</CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Audit chain</CardTitle></CardHeader>
          <CardBody>
            <Badge tone={audit.ok ? "ok" : "danger"}>{audit.ok ? "Intact" : `Broken at ${audit.brokenAt}`}</Badge>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Manage</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div><Link className="text-brand-700 underline" href="/admin/rubric">LOD Rubric versions</Link></div>
            <div><Link className="text-brand-700 underline" href="/admin/templates">HIPAA & document templates</Link></div>
            <div><Link className="text-brand-700 underline" href="/admin/audit">Audit log</Link></div>
            <div><Link className="text-brand-700 underline" href="/admin/compliance">Compliance &amp; hardening</Link></div>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
