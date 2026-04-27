import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader, PageShell } from "@/components/ui/page";
import OnboardingWizard from "./OnboardingWizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  const userId = (session.user as { id: string }).id;
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    include: { teamHistory: { orderBy: { startYear: "asc" } } },
  });

  return (
    <PageShell>
      <PageHeader
        title="Tell us about your career"
        subtitle="We'll use this to compute your LOD filing deadline and tailor the prescreen."
      />
      <OnboardingWizard
        initial={
          profile
            ? {
                legalFirstName: profile.legalFirstName,
                legalLastName: profile.legalLastName,
                preferredName: profile.preferredName ?? "",
                dateOfBirth: profile.dateOfBirth.toISOString().slice(0, 10),
                position: profile.position ?? "",
                creditedSeasons: profile.creditedSeasons,
                lastActivePlayerDate:
                  profile.lastActivePlayerDate?.toISOString().slice(0, 10) ?? "",
                teams: profile.teamHistory.map((t) => ({
                  team: t.team,
                  startYear: t.startYear,
                  endYear: t.endYear,
                })),
              }
            : null
        }
      />
    </PageShell>
  );
}
