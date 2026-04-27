import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActiveClaim } from "@/lib/claim";
import { PageHeader, PageShell } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import NewExamForm from "./NewExamForm";

export default async function NewExamPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const claim = await getActiveClaim(userId);
  if (!claim) redirect("/onboarding");

  return (
    <PageShell>
      <PageHeader title="Schedule a Neutral Physician exam" subtitle="The Plan can require an independent medical exam — be ready." />
      <Card><CardBody><NewExamForm claimId={claim.id} /></CardBody></Card>
    </PageShell>
  );
}
