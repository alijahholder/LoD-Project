export type OCRBlock = {
  page: number;
  text: string;
  bbox?: { x: number; y: number; w: number; h: number };
};

export type OCRResult = {
  pageCount: number;
  pages: { page: number; text: string; blocks: OCRBlock[] }[];
  fullText: string;
  modelVersion: string;
};

export type ClinicalFinding = {
  bodyRegion: string; // knee | shoulder | spine | hip | hearing | sight | speech | vital_organ_cns | other
  diagnosis: string;
  icd10?: string;
  date?: string;
  severity?: string; // e.g. "moderate", "severe"
  measurements?: Record<string, string | number>;
  // Citation back to the source document so the player can verify
  citation: {
    documentId: string;
    page: number;
    snippet: string;
    bbox?: { x: number; y: number; w: number; h: number };
  };
  rationale?: string;
};

export type ExtractionResult = {
  modelVersion: string;
  findings: ClinicalFinding[];
};

export type CategoryMatch = {
  categoryId: string;
  points: number;
  confidence: number; // 0..1
  rationale: string;
  citations: ClinicalFinding["citation"][];
};
