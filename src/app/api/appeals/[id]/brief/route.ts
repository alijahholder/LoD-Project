import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { formatDate } from "@/lib/utils";

const Body = z.object({
  themes: z.array(z.string()).default([]),
  exhibits: z.array(z.object({
    number: z.number().int(),
    documentId: z.string(),
    filename: z.string(),
    description: z.string(),
  })).default([]),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const appeal = await prisma.appeal.findUnique({
    where: { id },
    include: {
      claim: {
        include: {
          profile: { include: { user: true } },
          findings: { include: { category: true } },
        },
      },
    },
  });
  if (!appeal) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (appeal.claim.profile.user.id !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const profile = appeal.claim.profile;
  const confirmed = appeal.claim.findings.filter((f) => f.status === "confirmed");
  const total = confirmed.reduce((s, f) => s + f.points, 0);

  const themes = parsed.data.themes.filter(Boolean);
  const exhibits = parsed.data.exhibits;

  const today = formatDate(new Date());
  const playerName = `${profile.legalFirstName} ${profile.legalLastName}`;
  const denied = appeal.claim.deniedAt ? formatDate(appeal.claim.deniedAt) : "(date on denial letter)";

  const brief = [
    `# Appeal of Line of Duty Disability Determination`,
    ``,
    `**Claimant:** ${playerName}`,
    `**Date submitted:** ${today}`,
    `**Date of denial letter:** ${denied}`,
    `**Appeal level:** ${appeal.hearingType ?? "Initial Plan-level (DICC)"}`,
    ``,
    `## I. Introduction`,
    ``,
    `${playerName} respectfully appeals the denial of his Line of Duty (LOD) disability claim. The denial fails to give appropriate weight to the medical evidence in the record and misapplies the orthopedic point system under Appendix A. The confirmed findings discussed below total **${total} point(s)** under the active rubric, meeting or exceeding the LOD threshold.`,
    ``,
    `## II. Statement of facts`,
    ``,
    `Mr. ${profile.legalLastName} played in the NFL for ${profile.creditedSeasons} credited season${profile.creditedSeasons === 1 ? "" : "s"}${profile.position ? ` at ${profile.position}` : ""}. His last active player date was ${profile.lastActivePlayerDate ? formatDate(profile.lastActivePlayerDate) : "(see Player Profile)"}. The conditions detailed in the medical record are the direct result of his football activities, and the supporting documentation is summarized in the exhibit list at the end of this brief.`,
    ``,
    `## III. Standard of review`,
    ``,
    `Under ERISA, this appeal is the final opportunity to build the administrative record. The Plan must consider all evidence submitted herein when rendering its decision, and any subsequent court review will be limited to this record.`,
    ``,
    `## IV. Argument`,
    ``,
    ...(themes.length === 0
      ? ["The denial should be reversed for the reasons stated in the confirmed-findings table below."]
      : themes.flatMap((t, i) => [`### ${i + 1}. ${t}`, ``, "Supporting evidence in the record establishes this point. See the exhibits cited below.", ""])),
    ``,
    `## V. Confirmed findings under Appendix A`,
    ``,
    `| Code | Body region | Title | Points |`,
    `|---|---|---|---|`,
    ...confirmed.map((f) => `| ${f.category.code} | ${f.category.bodyRegion} | ${f.category.title} | ${f.points} |`),
    `| | | **Total** | **${total}** |`,
    ``,
    `## VI. Exhibit list`,
    ``,
    ...(exhibits.length === 0
      ? ["No exhibits attached. Attach the supporting medical records before filing."]
      : exhibits.map((e) => `- **Exhibit ${e.number}** — ${e.filename}${e.description ? ` (${e.description})` : ""}`)),
    ``,
    `## VII. Relief requested`,
    ``,
    `Reverse the denial and award Line of Duty disability benefits consistent with the confirmed point total under Appendix A.`,
    ``,
    `Respectfully submitted,`,
    ``,
    `${playerName}`,
    ``,
    `_Generated draft. The claimant has reviewed and adopts the statements herein for the administrative record._`,
  ].join("\n");

  await prisma.appeal.update({
    where: { id },
    data: { briefMarkdown: brief },
  });
  await audit({ userId, action: "appeal.brief.generate", entityType: "appeal", entityId: id });

  return NextResponse.json({ ok: true, brief });
}
