import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/ui/page";
import PrescreenForm from "./PrescreenForm";

export default async function NewClaimPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    include: { claims: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!profile) redirect("/onboarding");

  const claim = profile.claims[0];

  return (
    <PageShell>
      <PageHeader
        title="LOD eligibility prescreen"
        subtitle="A 60-second snapshot of which Plan eligibility paths likely apply to you."
      />
      <PrescreenForm claimId={claim?.id ?? null} />
    </PageShell>
  );
}
