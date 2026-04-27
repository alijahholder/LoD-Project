import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getActiveClaim } from "@/lib/claim";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function ExamsListPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const claim = await getActiveClaim(userId);
  if (!claim) redirect("/onboarding");

  const exams = await prisma.neutralPhysicianExam.findMany({
    where: { claimId: claim.id },
    orderBy: { scheduledFor: "desc" },
  });

  return (
    <PageShell>
      <PageHeader
        title="Neutral Physician exams"
        subtitle="Track exam scheduling, prep checklists, and post-exam supplemental letters when an exam was inadequate."
        actions={
          <Link href="/exams/new">
            <Button>Schedule exam</Button>
          </Link>
        }
      />

      <div className="space-y-3">
        {exams.length === 0 ? (
          <Card><CardBody>No exams scheduled yet.</CardBody></Card>
        ) : null}
        {exams.map((e) => (
          <Card key={e.id}>
            <CardHeader>
              <CardTitle>
                <Link href={`/exams/${e.id}`} className="underline">{e.physicianName ?? "Untitled exam"}</Link>
                {e.specialty ? <span className="ml-2 text-xs text-brand-600">{e.specialty}</span> : null}
              </CardTitle>
            </CardHeader>
            <CardBody className="text-sm text-brand-800">
              <div>Scheduled: {e.scheduledFor ? formatDate(e.scheduledFor) : "—"}</div>
              {e.location ? <div>Location: {e.location}</div> : null}
              <div className="mt-1">
                <Badge tone={e.inadequate ? "warn" : "ok"}>{e.inadequate ? "Flagged inadequate" : "OK"}</Badge>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
