import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import type { CategoryMatch, ClinicalFinding } from "./types";

/**
 * Map extracted clinical findings to ImpairmentCategory rows in the active
 * RubricVersion. Returns suggested matches with confidence + citations. The
 * player must approve each before it counts toward the claim.
 *
 * The matcher is intentionally conservative: it ranks categories by overlap of
 * body region + keyword tokens and emits a confidence score the UI can show.
 */
export async function mapFindingsToRubric(args: {
  findings: ClinicalFinding[];
  rubricVersionId: string;
}): Promise<CategoryMatch[]> {
  const categories = await prisma.impairmentCategory.findMany({
    where: { rubricVersionId: args.rubricVersionId, excludedFromLOD: false },
  });

  const matches: CategoryMatch[] = [];
  const groupedByCategory = new Map<
    string,
    { points: number; confidence: number; citations: ClinicalFinding["citation"][]; rationale: string[] }
  >();

  for (const f of args.findings) {
    const ranked = categories
      .map((c) => ({ c, score: scoreCategory(c, f) }))
      .filter((r) => r.score > 0.2)
      .sort((a, b) => b.score - a.score);

    const top = ranked[0];
    if (!top) continue;

    const existing = groupedByCategory.get(top.c.id);
    const baseConfidence = Math.min(0.95, top.score);
    if (existing) {
      existing.confidence = Math.max(existing.confidence, baseConfidence);
      existing.citations.push(f.citation);
      existing.rationale.push(`'${f.diagnosis}' (${f.bodyRegion}) → ${top.c.title}`);
    } else {
      groupedByCategory.set(top.c.id, {
        points: top.c.points,
        confidence: baseConfidence,
        citations: [f.citation],
        rationale: [`'${f.diagnosis}' (${f.bodyRegion}) → ${top.c.title}`],
      });
    }
  }

  for (const [categoryId, agg] of groupedByCategory) {
    matches.push({
      categoryId,
      points: agg.points,
      confidence: agg.confidence,
      rationale: agg.rationale.join(" · "),
      citations: agg.citations,
    });
  }

  return matches;
}

function scoreCategory(
  c: Prisma.ImpairmentCategoryGetPayload<true>,
  f: ClinicalFinding,
): number {
  let score = 0;
  if (c.bodyRegion.toLowerCase() === f.bodyRegion.toLowerCase()) score += 0.5;

  const dx = f.diagnosis.toLowerCase();
  const tokens = (c.title + " " + c.description + " " + c.code)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);
  const overlap = tokens.filter((t) => dx.includes(t)).length;
  score += Math.min(0.4, overlap * 0.12);

  if (f.severity && /severe|advanced|grade ?[34]|stage ?(III|IV)/i.test(f.severity)) {
    score += 0.1;
  }
  return score;
}
