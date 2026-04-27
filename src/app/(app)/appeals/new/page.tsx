import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActiveClaim } from "@/lib/claim";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import NewAppealForm from "./NewAppealForm";

export default async function NewAppealPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const claim = await getActiveClaim(userId);
  if (!claim) redirect("/onboarding");
  return (
    <PageShell>
      <PageHeader
        title="Start an appeal"
        subtitle="Enter the date on the denial letter to start the 180-day clock."
      />
      <Card>
        <CardBody>
          <NewAppealForm claimId={claim.id} />
        </CardBody>
      </Card>
    </PageShell>
  );
}
