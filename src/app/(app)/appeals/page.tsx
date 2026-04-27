import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getActiveClaim } from "@/lib/claim";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { classifyUrgency, daysUntil } from "@/lib/lod/deadlines";
import { formatDate } from "@/lib/utils";

export default async function AppealsListPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const claim = await getActiveClaim(userId);
  if (!claim) redirect("/onboarding");

  const appeals = await prisma.appeal.findMany({
    where: { claimId: claim.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageShell>
      <PageHeader
        title="Appeals"
        subtitle="If your initial claim is denied, you have 180 days from the date on the denial letter to file an appeal."
        actions={
          <Link href="/appeals/new">
            <Button>Start an appeal</Button>
          </Link>
        }
      />

      {appeals.length === 0 ? (
        <Callout tone="info" title="No appeals yet">
          If you receive a denial letter, click "Start an appeal" to begin building the record. The 180-day clock starts on the date written on the denial letter, not when you receive it.
        </Callout>
      ) : null}

      <div className="space-y-3">
        {appeals.map((a) => {
          const days = daysUntil(a.appealDeadline);
          const urg = classifyUrgency(days);
          return (
            <Card key={a.id}>
              <CardHeader>
                <CardTitle>
                  <Link href={`/appeals/${a.id}`} className="underline">
                    Appeal · {a.hearingType ?? "level TBD"}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardBody className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                  <span className="text-brand-700">Deadline: {formatDate(a.appealDeadline)}</span>
                  <Badge tone={urg === "overdue" ? "danger" : urg === "urgent" ? "warn" : "muted"}>
                    {days !== null ? `${days} days` : ""} {urg}
                  </Badge>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}

function statusTone(s: string): "ok" | "warn" | "muted" | "danger" {
  if (s === "decided") return "ok";
  if (s === "withdrawn") return "muted";
  if (s === "preparing") return "warn";
  return "muted";
}
