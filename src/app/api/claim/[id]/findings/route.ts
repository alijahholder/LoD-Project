import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const claim = await prisma.claim.findUnique({
    where: { id },
    include: {
      profile: { include: { user: true } },
      findings: { include: { category: true }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] },
      rubricVersion: { include: { categories: true } },
    },
  });
  if (!claim || claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const findings = claim.findings.map((f) => ({
    id: f.id,
    status: f.status,
    points: f.points,
    confidence: f.confidence,
    rationale: f.rationale,
    category: {
      code: f.category.code,
      title: f.category.title,
      bodyRegion: f.category.bodyRegion,
      pathway: f.category.pathway,
      points: f.category.points,
    },
    citations: JSON.parse(f.citationsJson || "[]"),
  }));

  // Gap analysis: what high-value categories has the player NOT yet captured?
  const gapNotes: string[] = [];
  if (claim.rubricVersion) {
    const confirmedCategoryIds = new Set(
      claim.findings.filter((f) => f.status === "confirmed").map((f) => f.categoryId),
    );
    const orthoConfirmed = claim.findings
      .filter((f) => f.status === "confirmed" && f.category.pathway === "orthopedic")
      .reduce((s, f) => s + f.points, 0);
    if (orthoConfirmed < 9) {
      const remaining = 9 - orthoConfirmed;
      gapNotes.push(
        `You're ${remaining} orthopedic point${remaining === 1 ? "" : "s"} short of the 9-point LOD threshold. Consider gathering documentation for higher-value categories you haven't captured yet.`,
      );
      const big = claim.rubricVersion.categories
        .filter((c) => c.pathway === "orthopedic" && !confirmedCategoryIds.has(c.id) && c.points >= 3)
        .sort((a, b) => b.points - a.points)
        .slice(0, 3);
      if (big.length) {
        gapNotes.push(
          `High-value categories not yet confirmed: ${big.map((c) => `${c.title} (${c.points} pts)`).join("; ")}.`,
        );
      }
    }
  }

  return NextResponse.json({ findings, gapNotes });
}
