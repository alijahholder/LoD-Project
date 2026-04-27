import { prisma } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import TemplateEditor from "./TemplateEditor";

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({ orderBy: { kind: "asc" } });
  return (
    <PageShell>
      <PageHeader title="Document templates" subtitle="HIPAA releases, appeal briefs, and other slot-filled documents." />
      <div className="space-y-4">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle>
                {t.name} <span className="ml-2 text-xs text-brand-500">({t.kind})</span>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <TemplateEditor id={t.id} initialBody={t.body} />
            </CardBody>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
