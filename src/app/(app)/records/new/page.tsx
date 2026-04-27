import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActiveClaim } from "@/lib/claim";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import NewRequestForm from "./NewRequestForm";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const claim = await getActiveClaim(userId);
  if (!claim) redirect("/onboarding");
  const sp = await searchParams;
  const type = sp.type === "nfl_club" ? "nfl_club" : "third_party";
  return (
    <PageShell>
      <PageHeader
        title={`New ${type === "nfl_club" ? "NFL Club" : "third-party"} records request`}
        subtitle="Generates a HIPAA release pre-filled with your information and schedules follow-up tasks."
      />
      <Card>
        <CardBody>
          <NewRequestForm claimId={claim.id} initialType={type} />
        </CardBody>
      </Card>
    </PageShell>
  );
}
