import { headers } from "next/headers";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { verifyAuditChain } from "@/lib/audit";

const SECURITY_HEADERS = [
  { name: "Strict-Transport-Security", expects: /max-age=\d{6,}/i },
  { name: "Content-Security-Policy", expects: /default-src 'self'/i },
  { name: "X-Frame-Options", expects: /DENY|SAMEORIGIN/i },
  { name: "X-Content-Type-Options", expects: /nosniff/i },
  { name: "Referrer-Policy", expects: /.+/i },
  { name: "Permissions-Policy", expects: /.+/i },
  { name: "Cross-Origin-Opener-Policy", expects: /same-origin/i },
];

const BAA_VENDORS = [
  { name: "AWS (S3, RDS, Textract, KMS)", env: "STORAGE_DRIVER", required: true },
  { name: "OpenAI Enterprise", env: "OPENAI_API_KEY", required: false },
  { name: "Anthropic", env: "ANTHROPIC_API_KEY", required: false },
  { name: "DocuSign", env: "DOCUSIGN_INTEGRATION_KEY", required: true },
  { name: "Postmark", env: "POSTMARK_API_KEY", required: true },
  { name: "Twilio", env: "TWILIO_AUTH_TOKEN", required: true },
];

const DOCS = [
  { title: "HIPAA risk assessment", path: "docs/HIPAA-RISK-ASSESSMENT.md" },
  { title: "BAA tracker", path: "docs/BAA-TRACKER.md" },
  { title: "Penetration test plan", path: "docs/PEN-TEST-PLAN.md" },
  { title: "Accessibility (WCAG 2.1 AA) audit", path: "docs/WCAG-AUDIT.md" },
  { title: "Load test plan", path: "docs/LOAD-TEST-PLAN.md" },
  { title: "Incident response runbook", path: "docs/INCIDENT-RESPONSE.md" },
  { title: "Production cut-over checklist", path: "docs/PRODUCTION-CHECKLIST.md" },
];

export default async function CompliancePage() {
  const h = await headers();
  const observed = SECURITY_HEADERS.map((sh) => {
    const v = h.get(sh.name);
    return { ...sh, value: v, ok: !!v && sh.expects.test(v) };
  });

  const auditCheck = await verifyAuditChain();

  const baaState = BAA_VENDORS.map((v) => ({
    ...v,
    configured: !!process.env[v.env] && process.env[v.env] !== "",
  }));

  return (
    <PageShell>
      <PageHeader
        title="Compliance &amp; hardening"
        subtitle="Live status of HIPAA-aligned controls. This page is not a substitute for a formal risk assessment — it surfaces what the running app can self-check."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Audit chain</CardTitle>
          </CardHeader>
          <CardBody className="text-sm">
            {auditCheck.ok ? (
              <Callout tone="success" title="Intact">
                Every audit log entry hash chains correctly to the previous entry.
              </Callout>
            ) : (
              <Callout tone="danger" title="Tamper detected">
                Chain breaks at entry <code>{auditCheck.brokenAt}</code>. Investigate immediately.
              </Callout>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security headers</CardTitle>
          </CardHeader>
          <CardBody className="text-sm">
            <ul className="space-y-1">
              {observed.map((o) => (
                <li key={o.name} className="flex items-center justify-between">
                  <code className="text-xs text-brand-700">{o.name}</code>
                  <Badge tone={o.ok ? "ok" : "danger"}>{o.ok ? "set" : "missing"}</Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor BAAs (env wiring check)</CardTitle>
          </CardHeader>
          <CardBody className="text-sm">
            <p className="mb-3 text-brand-700">
              This only checks whether credentials are wired up — it does not verify that an executed BAA exists. Track that in <code>docs/BAA-TRACKER.md</code>.
            </p>
            <ul className="space-y-1">
              {baaState.map((v) => (
                <li key={v.name} className="flex items-center justify-between">
                  <span>{v.name}</span>
                  <Badge tone={v.configured ? "ok" : v.required ? "warn" : "muted"}>
                    {v.configured ? "configured" : v.required ? "missing" : "optional"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance documents</CardTitle>
          </CardHeader>
          <CardBody className="text-sm">
            <ul className="space-y-1">
              {DOCS.map((d) => (
                <li key={d.path}>
                  <code className="text-xs text-brand-700">{d.path}</code>
                  <span className="ml-2">{d.title}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
