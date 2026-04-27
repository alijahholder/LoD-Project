import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Generate a simple text-based PDF from one or more sections. Each section is
 * its own page (or a continuation) with a heading and a body paragraph.
 *
 * For real packets we'll layer in headers/footers, page numbering, exhibit
 * dividers, and a manifest cover page — but this gives us a working v1 that
 * exercises the pipeline end-to-end.
 */
export async function generateTextPdf(args: {
  title: string;
  sections: { heading?: string; body: string }[];
  footer?: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(args.title);
  pdf.setProducer("Gridiron LOD");
  pdf.setCreator("Gridiron LOD");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 56;
  const pageWidth = 612;
  const pageHeight = 792;
  const usableWidth = pageWidth - margin * 2;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  page.drawText(args.title, {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.16, 0.22, 0.4),
  });
  y -= 28;

  function ensureSpace(needed: number) {
    if (y - needed < margin + 24) {
      drawFooter();
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  function drawFooter() {
    if (!args.footer) return;
    page.drawText(args.footer, {
      x: margin,
      y: margin / 2,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.45),
    });
  }

  const lineHeight = 13;
  const fontSize = 10;

  for (const s of args.sections) {
    if (s.heading) {
      ensureSpace(20);
      page.drawText(s.heading, {
        x: margin,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.16, 0.22, 0.4),
      });
      y -= 18;
    }
    const lines = wrap(s.body, font, fontSize, usableWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.13, 0.22) });
      y -= lineHeight;
    }
    y -= lineHeight;
  }

  drawFooter();
  return pdf.save();
}

function wrap(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  const paragraphs = text.split(/\n/);
  for (const p of paragraphs) {
    const words = p.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      const width = font.widthOfTextAtSize(test, size);
      if (width > maxWidth && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
    if (!p) out.push("");
  }
  return out;
}
