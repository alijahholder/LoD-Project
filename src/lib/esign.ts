/**
 * E-signature abstraction. Mock by default. Drop-in DocuSign driver for prod.
 */
export interface ESignDriver {
  createEnvelope(args: {
    documentBuffer: Buffer;
    documentName: string;
    signerEmail: string;
    signerName: string;
    subject?: string;
  }): Promise<{ envelopeId: string; signingUrl: string }>;
  fetchSignedDocument(envelopeId: string): Promise<Buffer>;
}

class MockESign implements ESignDriver {
  private store = new Map<string, Buffer>();
  async createEnvelope({ documentBuffer, signerName }: {
    documentBuffer: Buffer;
    documentName: string;
    signerEmail: string;
    signerName: string;
  }) {
    const envelopeId = "mock-" + Math.random().toString(36).slice(2, 10);
    const stamped = Buffer.concat([
      documentBuffer,
      Buffer.from(`\n\n--- E-SIGNED (mock) by ${signerName} at ${new Date().toISOString()} ---\n`, "utf8"),
    ]);
    this.store.set(envelopeId, stamped);
    return { envelopeId, signingUrl: `/api/mock-sign/${envelopeId}` };
  }
  async fetchSignedDocument(envelopeId: string) {
    const v = this.store.get(envelopeId);
    if (!v) throw new Error("envelope not found");
    return v;
  }
}

let _esign: ESignDriver | null = null;
export function getESign(): ESignDriver {
  if (_esign) return _esign;
  const driver = process.env.ESIGN_DRIVER ?? "mock";
  if (driver === "mock") {
    _esign = new MockESign();
    return _esign;
  }
  throw new Error(`E-sign driver not implemented: ${driver}`);
}
