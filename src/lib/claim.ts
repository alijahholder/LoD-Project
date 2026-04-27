import { redirect } from "next/navigation";
import { prisma } from "./db";

export async function getActiveClaim(userId: string) {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    include: {
      claims: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  return profile?.claims[0] ?? null;
}

export async function requireActiveClaim(userId: string) {
  const claim = await getActiveClaim(userId);
  if (!claim) redirect("/onboarding");
  return claim;
}

export async function getClaimWithDetails(claimId: string, userId: string) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      profile: { include: { user: true } },
      documents: { orderBy: { uploadedAt: "desc" }, include: { extractions: true } },
      findings: {
        include: { category: { include: { rubricVersion: true } } },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      },
      recordRequests: { orderBy: { createdAt: "desc" }, include: { followUps: true } },
      timeline: { orderBy: { occurredAt: "desc" }, take: 50 },
      appeals: { orderBy: { createdAt: "desc" } },
      submissions: { orderBy: { filedAt: "desc" } },
      payments: { orderBy: { periodStart: "desc" } },
      neutralExams: { orderBy: { createdAt: "desc" } },
      rubricVersion: { include: { categories: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!claim) return null;
  if (claim.profile.user.id !== userId) return null;
  return claim;
}
