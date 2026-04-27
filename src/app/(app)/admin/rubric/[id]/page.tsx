import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import RubricEditor from "./RubricEditor";

export default async function RubricEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await prisma.rubricVersion.findUnique({
    where: { id },
    include: { categories: { orderBy: { sortOrder: "asc" } } },
  });
  if (!v) notFound();

  return (
    <PageShell>
      <PageHeader
        title={`Editing: ${v.name}`}
        subtitle={`Status: ${v.isActive ? "ACTIVE" : "draft"} · ${v.categories.length} categories`}
      />
      <Card>
        <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
        <CardBody>
          <RubricEditor
            rubricId={v.id}
            isActive={v.isActive}
            initial={v.categories.map((c) => ({
              id: c.id,
              code: c.code,
              bodyRegion: c.bodyRegion,
              title: c.title,
              description: c.description,
              points: c.points,
              pathway: c.pathway,
              evidenceRequirements: JSON.parse(c.evidenceRequirements || "[]"),
              excludedFromLOD: c.excludedFromLOD,
              sortOrder: c.sortOrder,
            }))}
          />
        </CardBody>
      </Card>
    </PageShell>
  );
}
