import type { ClinicalFinding, ExtractionResult, OCRResult } from "./types";

/**
 * LLM-based clinical-finding extraction with page+snippet citations.
 *
 * Mock implementation uses regex/keyword heuristics over the OCR text so the
 * pipeline is exercisable in dev without an LLM. In prod set AI_DRIVER=openai
 * and OPENAI_API_KEY to call structured-output completions.
 */
export async function extractFindings(input: {
  documentId: string;
  ocr: OCRResult;
}): Promise<ExtractionResult> {
  const driver = process.env.AI_DRIVER ?? "mock";
  if (driver === "mock") return mockExtract(input);
  throw new Error(`Extractor driver not implemented: ${driver}`);
}

const KEYWORD_RULES: {
  bodyRegion: ClinicalFinding["bodyRegion"];
  patterns: RegExp[];
  diagnosisFrom: (m: string) => string;
  severityHint?: RegExp;
  icd10?: string;
}[] = [
  {
    bodyRegion: "knee",
    patterns: [
      /\b(ACL|anterior cruciate ligament)\b.*?(tear|reconstruction|rupture|repair)/i,
      /\b(meniscus|meniscectomy)\b/i,
      /\bpatellofemoral\b/i,
      /\btotal knee (replacement|arthroplasty)\b/i,
      /\b(chondromalacia|osteoarthritis).*?knee/i,
    ],
    diagnosisFrom: (m) => m,
    severityHint: /(severe|advanced|grade [3-4]|stage (III|IV))/i,
    icd10: "S83.5",
  },
  {
    bodyRegion: "shoulder",
    patterns: [
      /\brotator cuff\b.*?(tear|repair|impingement)/i,
      /\blabral (tear|repair)/i,
      /\bshoulder arthroplasty\b/i,
      /\bAC joint\b.*?(separation|reconstruction)/i,
    ],
    diagnosisFrom: (m) => m,
    icd10: "S43",
  },
  {
    bodyRegion: "spine",
    patterns: [
      /\b(cervical|lumbar|thoracic).*?(disc|discectomy|fusion|herniation|stenosis|radiculopathy)/i,
      /\bspondylolisthesis\b/i,
      /\bspinal fusion\b/i,
    ],
    diagnosisFrom: (m) => m,
    icd10: "M51",
  },
  {
    bodyRegion: "hip",
    patterns: [
      /\bhip (replacement|arthroplasty|labral tear|impingement)/i,
      /\bavascular necrosis\b.*?hip/i,
    ],
    diagnosisFrom: (m) => m,
    icd10: "M16",
  },
  {
    bodyRegion: "hearing",
    patterns: [
      /\bhearing loss\b.*?(\d{2,3})\s*%/i,
      /\bsensorineural hearing loss\b/i,
      /\bbilateral hearing loss\b/i,
    ],
    diagnosisFrom: (m) => m,
    icd10: "H90",
  },
  {
    bodyRegion: "sight",
    patterns: [/\bvisual acuity\b.*?20\/(\d{3,})/i, /\bvision loss\b/i],
    diagnosisFrom: (m) => m,
    icd10: "H54",
  },
  {
    bodyRegion: "vital_organ_cns",
    patterns: [
      /\bnephrectomy\b/i,
      /\bsplenectomy\b/i,
      /\bspinal cord (injury|damage)\b/i,
      /\bperipheral nerve damage\b/i,
    ],
    diagnosisFrom: (m) => m,
  },
];

function mockExtract(input: {
  documentId: string;
  ocr: OCRResult;
}): ExtractionResult {
  const findings: ClinicalFinding[] = [];

  for (const page of input.ocr.pages) {
    for (const rule of KEYWORD_RULES) {
      for (const pat of rule.patterns) {
        const m = page.text.match(pat);
        if (!m) continue;
        const matchText = m[0];
        const idx = page.text.indexOf(matchText);
        const snippet = page.text.slice(Math.max(0, idx - 60), idx + matchText.length + 60).trim();
        const block = page.blocks.find((b) => b.text.includes(matchText.split(/\s+/)[0]));
        const severityMatch = rule.severityHint ? matchText.match(rule.severityHint) : null;
        findings.push({
          bodyRegion: rule.bodyRegion,
          diagnosis: rule.diagnosisFrom(matchText),
          icd10: rule.icd10,
          severity: severityMatch ? severityMatch[0] : undefined,
          citation: {
            documentId: input.documentId,
            page: page.page,
            snippet,
            bbox: block?.bbox,
          },
          rationale: `Pattern '${pat.source}' matched in OCR text on page ${page.page}.`,
        });
      }
    }
  }

  // Deduplicate by (bodyRegion, diagnosis-lowercased)
  const seen = new Set<string>();
  const dedup = findings.filter((f) => {
    const k = `${f.bodyRegion}|${f.diagnosis.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return { modelVersion: "mock-extractor/0.1", findings: dedup };
}
