import { generateTextPdf } from "./pdf";
import { prisma } from "./db";
import { decryptPHI } from "./crypto";
import { evaluateLodEligibility } from "./lod/eligibility";
import { formatDate } from "./utils";

/**
 * Generate the LOD initial-application packet for a claim. Composed of:
 *   1) Cover letter
 *   2) Application form (player info + claim summary)
 *   3) Findings & exhibit index (each confirmed finding with point + citations)
 *   4) (Exhibits attached separately — referenced by exhibit number)
 */
export async function generateClaimPacket(claimId: string): Promise<{
  pdf: Uint8Array;
  manifest: { exhibits: { exhibitNumber: number; documentId: string; filename: string }[] };
  title: string;
}> {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      profile: { include: { user: true, teamHistory: { orderBy: { startYear: "asc" } } } },
      findings: {
        include: { category: true },
        where: { status: "confirmed" },
        orderBy: [{ category: { pathway: "asc" } }, { points: "desc" }],
      },
      documents: { orderBy: { uploadedAt: "asc" } },
    },
  });
  if (!claim) throw new Error("claim not found");
  const p = claim.profile;

  const orthoPoints = claim.findings
    .filter((f) => f.category.pathway === "orthopedic")
    .reduce((s, f) => s + f.points, 0);
  const elig = evaluateLodEligibility({ orthopedicPoints: orthoPoints });

  const exhibits = claim.documents.map((d, i) => ({
    exhibitNumber: i + 1,
    documentId: d.id,
    filename: d.filename,
  }));
  const exhibitIndex = exhibits
    .map((e) => `Exhibit ${e.exhibitNumber}: ${e.filename}`)
    .join("\n");

  const teams = p.teamHistory.map((t) => `${t.team} (${t.startYear}–${t.endYear})`).join("; ");
  const ssn = decryptPHI(p.ssnLast4Encrypted);

  const cover = [
    `${new Date().toLocaleDateString()}\n`,
    `NFL Player Benefits Office`,
    `200 St. Paul Place, Suite 2420`,
    `Baltimore, MD 21202\n`,
    `Re: Line of Duty Disability Application`,
    `   Player: ${p.legalFirstName} ${p.legalLastName}`,
    `   Date of Birth: ${formatDate(p.dateOfBirth)}\n`,
    `Dear Disability Initial Claims Committee,\n`,
    `Please find enclosed my application for Line of Duty disability benefits under the NFL Player Disability & Neurocognitive Benefit Plan, together with supporting medical evidence.`,
    `\nMy filing deadline is ${formatDate(claim.filingDeadline)}, computed as the greater of (a) 48 months from my last day as an active player or (b) the number of years equal to my Credited Seasons (${p.creditedSeasons}) from that date.`,
    `\nThe enclosed exhibits document the following confirmed impairments under Appendix A of the Plan:\n`,
    claim.findings.length === 0
      ? "[No findings confirmed yet — please review your claim before generating the final packet.]"
      : claim.findings.map((f) => `  • ${f.category.title} — ${f.points} pts`).join("\n"),
    `\nTotal orthopedic points: ${orthoPoints}/${elig.paths.orthopedic.threshold}.`,
    `\nThank you for your consideration.\n\nRespectfully,\n\n${p.legalFirstName} ${p.legalLastName}`,
  ].join("\n");

  const application = [
    `APPLICATION FOR LINE OF DUTY DISABILITY BENEFITS`,
    `\nNFL Player Disability & Neurocognitive Benefit Plan`,
    `\n--- Player Identification ---`,
    `Legal Name: ${p.legalFirstName} ${p.legalLastName}`,
    `Date of Birth: ${formatDate(p.dateOfBirth)}`,
    ssn ? `SSN (last 4): ***-**-${ssn}` : "",
    `\n--- NFL Career ---`,
    `Position: ${p.position ?? "—"}`,
    `Credited Seasons: ${p.creditedSeasons}`,
    `Last Day as an Active Player: ${formatDate(p.lastActivePlayerDate)}`,
    `Team History: ${teams}`,
    `\n--- Eligibility Path Asserted ---`,
    elig.paths.orthopedic.met
      ? `[X] Orthopedic impairments totaling ${orthoPoints}/9 points (Appendix A v2)`
      : `[ ] Orthopedic impairments (currently ${orthoPoints}/9 — additional documentation may be needed)`,
    elig.paths.speechSight.met ? `[X] ≥ 50% loss of speech or sight` : `[ ] ≥ 50% loss of speech or sight`,
    elig.paths.hearing.met ? `[X] ≥ 55% loss of hearing` : `[ ] ≥ 55% loss of hearing`,
    elig.paths.vitalOrganCNS.met ? `[X] Vital organ removal / major CNS impairment` : `[ ] Vital organ removal / major CNS impairment`,
    `\n--- Confirmed Impairments ---`,
    claim.findings.length === 0
      ? "[None confirmed]"
      : claim.findings
          .map((f) => {
            const citations = (JSON.parse(f.citationsJson || "[]") as { page: number }[])
              .map((c) => `Ex. -, p. ${c.page}`)
              .slice(0, 5)
              .join("; ");
            return `${f.category.code} — ${f.category.title}\n  Body region: ${f.category.bodyRegion}\n  Points: ${f.points}\n  Cites: ${citations || "see exhibits"}`;
          })
          .join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n");

  const sections = [
    { heading: "Cover Letter", body: cover },
    { heading: "Application Form", body: application },
    { heading: "Exhibit Index", body: exhibitIndex || "[No documents attached yet]" },
    {
      heading: "ERISA Notice",
      body:
        "This document and all attachments are submitted to the NFL Player Disability & Neurocognitive Benefit Plan. " +
        "Pursuant to ERISA § 503 and 29 C.F.R. § 2560.503-1, the Plan must furnish written notice of any adverse benefit determination, including the specific reason(s) for denial, the specific Plan provisions on which the determination is based, a description of any additional information required, and an explanation of the appeal procedures. The Claimant reserves the right to a full and fair review of any adverse determination.",
    },
  ];

  return {
    pdf: await generateTextPdf({
      title: `LOD Application — ${p.legalFirstName} ${p.legalLastName}`,
      sections,
      footer: `Gridiron LOD packet · Claim ${claim.id} · Generated ${new Date().toISOString()}`,
    }),
    manifest: { exhibits },
    title: `LOD Application — ${p.legalFirstName} ${p.legalLastName}`,
  };
}
