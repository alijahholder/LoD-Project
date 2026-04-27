import type { OCRResult } from "./types";

/**
 * OCR provider interface. In dev we use a deterministic mock that returns the
 * raw text content of the upload (useful for .txt fixtures) and produces fake
 * page/block coordinates. Swap the driver to AWS Textract in prod.
 */
export async function runOCR(input: {
  buf: Buffer;
  mimeType: string;
  filename: string;
}): Promise<OCRResult> {
  const driver = process.env.AI_DRIVER ?? "mock";
  if (driver === "mock") return mockOCR(input);
  throw new Error(`OCR driver not implemented: ${driver}`);
}

function mockOCR(input: { buf: Buffer; mimeType: string; filename: string }): OCRResult {
  let text: string;
  if (input.mimeType.startsWith("text/") || input.filename.endsWith(".txt") || input.filename.endsWith(".md")) {
    text = input.buf.toString("utf8");
  } else {
    text = `[mock OCR] Document: ${input.filename}\nMIME: ${input.mimeType}\nBytes: ${input.buf.byteLength}\nNo real OCR provider configured (AI_DRIVER=${process.env.AI_DRIVER ?? "mock"}).\n\nThis mock will still flow through the pipeline so you can exercise the UI end-to-end. Drop a .txt fixture with realistic medical-record language to see extraction in action.`;
  }

  const pageChunks = chunkPages(text, 1800);
  const pages = pageChunks.map((pageText, idx) => {
    const lines = pageText.split(/\n/);
    const blocks = lines
      .map((line, lineIdx) => ({
        page: idx + 1,
        text: line,
        bbox: { x: 50, y: 50 + lineIdx * 18, w: 700, h: 16 },
      }))
      .filter((b) => b.text.trim().length > 0);
    return { page: idx + 1, text: pageText, blocks };
  });

  return {
    pageCount: pages.length || 1,
    pages: pages.length ? pages : [{ page: 1, text, blocks: [] }],
    fullText: text,
    modelVersion: "mock-ocr/0.1",
  };
}

function chunkPages(text: string, perPage: number) {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += perPage) out.push(text.slice(i, i + perPage));
  return out;
}
