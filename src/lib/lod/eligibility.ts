/**
 * LOD eligibility evaluator.
 *
 * Eligibility paths (per NFL Player Disability & Neurocognitive Benefit Plan SPD):
 *   1) Orthopedic impairments totaling ≥ 9 points on the Point System for
 *      Orthopedic Impairments (Appendix A v2).
 *   2) ≥ 50% loss of speech or sight.
 *   3) ≥ 55% loss of hearing.
 *   4) Primary/contributory cause of surgical removal or major functional
 *      impairment of a vital organ or central nervous system part.
 *
 * NOTE: As of 4/1/2020 LOD excludes neurocognitive, brain-neurological
 * (excluding nerve damage), and psychiatric impairments.
 */

export const ORTHO_THRESHOLD = 9;
export const SPEECH_SIGHT_THRESHOLD = 50;
export const HEARING_THRESHOLD = 55;

export type EligibilityInput = {
  orthopedicPoints: number;
  speechLossPct?: number;
  sightLossPct?: number;
  hearingLossPct?: number;
  vitalOrganOrCNSImpairment?: boolean;
};

export type EligibilityResult = {
  eligible: boolean;
  paths: {
    orthopedic: { met: boolean; current: number; threshold: number };
    speechSight: { met: boolean; speech: number; sight: number; threshold: number };
    hearing: { met: boolean; current: number; threshold: number };
    vitalOrganCNS: { met: boolean };
  };
  summary: string;
};

export function evaluateLodEligibility(input: EligibilityInput): EligibilityResult {
  const orthopedicMet = input.orthopedicPoints >= ORTHO_THRESHOLD;
  const speech = input.speechLossPct ?? 0;
  const sight = input.sightLossPct ?? 0;
  const speechSightMet = speech >= SPEECH_SIGHT_THRESHOLD || sight >= SPEECH_SIGHT_THRESHOLD;
  const hearingMet = (input.hearingLossPct ?? 0) >= HEARING_THRESHOLD;
  const vitalMet = !!input.vitalOrganOrCNSImpairment;
  const eligible = orthopedicMet || speechSightMet || hearingMet || vitalMet;

  const lines: string[] = [];
  if (eligible) lines.push("At least one LOD eligibility path is currently met.");
  else lines.push("No LOD eligibility path is met yet.");
  if (!orthopedicMet)
    lines.push(`Orthopedic: ${input.orthopedicPoints}/${ORTHO_THRESHOLD} points.`);
  else lines.push(`Orthopedic met: ${input.orthopedicPoints} points.`);

  return {
    eligible,
    paths: {
      orthopedic: {
        met: orthopedicMet,
        current: input.orthopedicPoints,
        threshold: ORTHO_THRESHOLD,
      },
      speechSight: {
        met: speechSightMet,
        speech,
        sight,
        threshold: SPEECH_SIGHT_THRESHOLD,
      },
      hearing: {
        met: hearingMet,
        current: input.hearingLossPct ?? 0,
        threshold: HEARING_THRESHOLD,
      },
      vitalOrganCNS: { met: vitalMet },
    },
    summary: lines.join(" "),
  };
}

export const LOD_EXCLUDED_CONDITIONS = [
  "Neurocognitive impairments (e.g., dementia, CTE-related cognitive decline)",
  "Brain-related neurological conditions (excluding nerve damage)",
  "Psychiatric / psychological conditions",
];
