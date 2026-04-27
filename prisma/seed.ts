import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Seed strategy
 * --------------
 * 1. Two demo accounts:
 *    - admin@gridiron.local / GridironAdminDev!1
 *    - player@gridiron.local / GridironPlayerDev!1
 * 2. A skeleton "Appendix A v2 (DRAFT)" rubric covering the LOD eligibility
 *    pathways with PLACEHOLDER point values flagged in `notes`. The Plan
 *    document supplies the official values; an admin must publish a new
 *    version with verified numbers before this is used in production.
 * 3. HIPAA release Templates for NFL Club records and third-party providers.
 */

const ORTHO_SEED = [
  // Knee
  { code: "ORTHO-KNEE-ACL-RECON", region: "knee", title: "ACL reconstruction", points: 2, desc: "Surgical reconstruction of the anterior cruciate ligament." },
  { code: "ORTHO-KNEE-MENISCECTOMY", region: "knee", title: "Meniscectomy or meniscus repair", points: 1, desc: "Surgical removal/repair of the meniscus." },
  { code: "ORTHO-KNEE-TKA", region: "knee", title: "Total knee arthroplasty (TKA)", points: 4, desc: "Total knee replacement." },
  { code: "ORTHO-KNEE-CHONDRO-SEVERE", region: "knee", title: "Severe chondromalacia / advanced osteoarthritis of the knee", points: 2, desc: "Grade III–IV chondromalacia or radiographically advanced OA." },
  // Shoulder
  { code: "ORTHO-SHOULDER-RC-REPAIR", region: "shoulder", title: "Rotator cuff repair", points: 2, desc: "Surgical repair of the rotator cuff." },
  { code: "ORTHO-SHOULDER-LABRAL", region: "shoulder", title: "Labral tear / repair", points: 1, desc: "Glenoid labral injury and/or repair." },
  { code: "ORTHO-SHOULDER-ARTHROPLASTY", region: "shoulder", title: "Shoulder arthroplasty", points: 4, desc: "Shoulder joint replacement." },
  // Spine
  { code: "ORTHO-SPINE-DISCECTOMY", region: "spine", title: "Cervical or lumbar discectomy", points: 2, desc: "Surgical removal of all or part of an intervertebral disc." },
  { code: "ORTHO-SPINE-FUSION-1LEVEL", region: "spine", title: "Single-level spinal fusion", points: 3, desc: "Surgical fusion at a single spinal level." },
  { code: "ORTHO-SPINE-FUSION-MULTI", region: "spine", title: "Multi-level spinal fusion", points: 5, desc: "Spinal fusion across multiple levels." },
  { code: "ORTHO-SPINE-RADICULOPATHY", region: "spine", title: "Documented radiculopathy", points: 1, desc: "Radiculopathy with imaging and exam correlation." },
  // Hip
  { code: "ORTHO-HIP-ARTHROPLASTY", region: "hip", title: "Total hip arthroplasty", points: 4, desc: "Total hip replacement." },
  { code: "ORTHO-HIP-LABRAL", region: "hip", title: "Hip labral tear / repair", points: 1, desc: "Acetabular labral injury and/or repair." },
  { code: "ORTHO-HIP-AVN", region: "hip", title: "Avascular necrosis of the hip", points: 3, desc: "Imaging-confirmed avascular necrosis." },
  // Foot/Ankle
  { code: "ORTHO-ANKLE-RECON", region: "ankle", title: "Ankle ligament reconstruction", points: 1, desc: "Surgical reconstruction of ankle ligaments." },
  { code: "ORTHO-ANKLE-ARTHRODESIS", region: "ankle", title: "Ankle arthrodesis (fusion)", points: 3, desc: "Surgical fusion of the ankle joint." },
];

const NON_ORTHO_SEED = [
  { code: "SENS-HEARING-55", region: "hearing", title: "Hearing loss ≥ 55%", points: 0, pathway: "hearing", desc: "55% or greater loss of hearing under the Plan's measurement standard." },
  { code: "SENS-SIGHT-50", region: "sight", title: "Sight loss ≥ 50%", points: 0, pathway: "speech_sight", desc: "50% or greater loss of sight under the Plan's measurement standard." },
  { code: "SENS-SPEECH-50", region: "speech", title: "Speech loss ≥ 50%", points: 0, pathway: "speech_sight", desc: "50% or greater loss of speech under the Plan's measurement standard." },
  { code: "VITAL-ORGAN-REMOVAL", region: "vital_organ_cns", title: "Vital organ removal", points: 0, pathway: "vital_organ_cns", desc: "Surgical removal of a vital organ caused/contributed to by NFL football activity." },
  { code: "VITAL-CNS-IMPAIRMENT", region: "vital_organ_cns", title: "Major functional impairment of CNS part", points: 0, pathway: "vital_organ_cns", desc: "Major functional impairment of a central nervous system part (excluding LOD-excluded brain-neurological / psychiatric conditions)." },
  { code: "VITAL-NERVE-DAMAGE", region: "vital_organ_cns", title: "Documented peripheral nerve damage", points: 0, pathway: "vital_organ_cns", desc: "Peripheral nerve damage (LOD-eligible per 4/1/2020 guidance)." },
];

async function main() {
  // --- Users ---
  const adminPwd = await bcrypt.hash("GridironAdminDev!1", 12);
  const playerPwd = await bcrypt.hash("GridironPlayerDev!1", 12);
  await prisma.user.upsert({
    where: { email: "admin@gridiron.local" },
    update: {},
    create: { email: "admin@gridiron.local", name: "Admin User", passwordHash: adminPwd, role: "admin" },
  });
  const player = await prisma.user.upsert({
    where: { email: "player@gridiron.local" },
    update: {},
    create: { email: "player@gridiron.local", name: "Demo Player", passwordHash: playerPwd, role: "player" },
  });

  // Demo profile (so the dashboard isn't empty)
  const profile = await prisma.playerProfile.upsert({
    where: { userId: player.id },
    update: {},
    create: {
      userId: player.id,
      legalFirstName: "Demo",
      legalLastName: "Player",
      preferredName: "Demo",
      dateOfBirth: new Date("1985-04-12"),
      position: "OL",
      creditedSeasons: 6,
      lastActivePlayerDate: new Date("2018-03-01"),
      onboardingCompletedAt: new Date(),
    },
  });
  await prisma.teamStint.deleteMany({ where: { profileId: profile.id } });
  await prisma.teamStint.createMany({
    data: [
      { profileId: profile.id, team: "Buffalo Bills", startYear: 2012, endYear: 2014 },
      { profileId: profile.id, team: "Atlanta Falcons", startYear: 2015, endYear: 2017 },
    ],
  });

  // --- Rubric ---
  const existingActive = await prisma.rubricVersion.findFirst({ where: { isActive: true, benefit: "LOD" } });
  let rubric = existingActive;
  if (!rubric) {
    rubric = await prisma.rubricVersion.create({
      data: {
        name: "Appendix A v2 (DRAFT — verify point values against Plan document)",
        benefit: "LOD",
        isActive: true,
        notes:
          "Skeleton rubric for development. Point values are PLACEHOLDERS — an admin must publish a new RubricVersion with values verified against the current NFL Player Disability & Neurocognitive Benefit Plan SPD / Appendix A before relying on this in production.",
      },
    });
    let order = 0;
    const all = [
      ...ORTHO_SEED.map((o) => ({ ...o, pathway: "orthopedic" })),
      ...NON_ORTHO_SEED,
    ];
    for (const c of all) {
      await prisma.impairmentCategory.create({
        data: {
          rubricVersionId: rubric.id,
          code: c.code,
          bodyRegion: c.region,
          title: c.title,
          description: c.desc,
          points: c.points,
          evidenceRequirements: JSON.stringify([
            "Provider name, NPI, and dates of service",
            "Imaging report (MRI / X-ray) where applicable",
            "Operative report or contemporaneous clinic note",
          ]),
          excludedFromLOD: false,
          pathway: c.pathway,
          sortOrder: order++,
        },
      });
    }
  }

  // --- Templates ---
  const templates = [
    {
      kind: "hipaa_release_nfl_club",
      name: "HIPAA Authorization — NFL Club Records",
      body:
        "AUTHORIZATION FOR RELEASE OF MEDICAL INFORMATION (HIPAA)\n\nPlayer: {{playerName}}\nDOB: {{dob}}\nLast active with Club: {{clubName}} ({{seasonYears}})\n\nI hereby authorize {{clubName}} and any of its medical staff, athletic trainers, and team physicians to release ALL medical, training, treatment, imaging, and rehabilitation records related to me to:\n\n  Recipient: {{recipientBlock}}\n\nPurpose: Submission of an NFL Player Line of Duty (LOD) disability claim under the NFL Player Disability & Neurocognitive Benefit Plan.\n\nDate range: {{dateRangeStart}} – {{dateRangeEnd}}\n\nThis authorization expires {{expirationDate}}. I may revoke it at any time in writing, except to the extent action has already been taken in reliance on it.\n\nSignature: ____________________________   Date: __________",
    },
    {
      kind: "hipaa_release_third_party",
      name: "HIPAA Authorization — Third-Party Provider Records",
      body:
        "AUTHORIZATION FOR RELEASE OF PROTECTED HEALTH INFORMATION (HIPAA)\n\nPatient: {{playerName}}\nDOB: {{dob}}\n\nI authorize {{providerName}} to release my medical records, including all clinical notes, imaging studies (MRI/X-ray/CT), operative reports, and rehabilitation records, to:\n\n  Recipient: {{recipientBlock}}\n\nPurpose: Submission of an NFL Player Line of Duty (LOD) disability claim.\n\nDate range: {{dateRangeStart}} – {{dateRangeEnd}}\n\nThis authorization expires {{expirationDate}}. I may revoke it at any time in writing, except to the extent action has already been taken in reliance on it.\n\nSignature: ____________________________   Date: __________",
    },
    {
      kind: "appeal_brief",
      name: "Appeal Brief Template",
      body:
        "APPEAL OF DENIAL OF LINE OF DUTY DISABILITY BENEFITS\n\nClaimant: {{playerName}}\nClaim ID: {{claimId}}\nDate of Denial: {{deniedAt}}\nAppeal Deadline: {{appealDeadline}}\n\n## I. Procedural History\n{{proceduralHistory}}\n\n## II. Statement of Facts\n{{factsSection}}\n\n## III. Argument\n{{argumentSection}}\n\n## IV. Exhibits\n{{exhibitList}}\n\n## V. Conclusion\nFor the foregoing reasons, the Disability Initial Claims Committee's denial should be reversed and Line of Duty benefits awarded.\n\nRespectfully submitted,\n{{playerName}}\n{{signedDate}}",
    },
  ];
  for (const t of templates) {
    const existing = await prisma.template.findFirst({ where: { kind: t.kind } });
    if (existing) continue;
    await prisma.template.create({ data: { kind: t.kind, name: t.name, body: t.body } });
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete.\n  Admin:  admin@gridiron.local  /  GridironAdminDev!1\n  Player: player@gridiron.local /  GridironPlayerDev!1");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
