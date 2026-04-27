import { prisma } from "../db";
import { getStorage } from "../storage";
import { sha256 } from "../crypto";
import { audit } from "../audit";

export type ManifestEntry = {
  filename: string;
  storageKey: string;
  sha256: string;
  byteSize: number;
  source: string;
};

export type Manifest = {
  claimId: string;
  kind: string;
  createdAt: string;
  signerName?: string;
  signedAt?: string;
  entries: ManifestEntry[];
  notes?: string;
};

/**
 * Snapshot a set of documents as an immutable Submission. The manifest is
 * persisted as JSON; we hash the canonical JSON and store it on the row so
 * that any subsequent change is detectable. This is the ERISA admin record.
 *
 * For v1 we store a JSON manifest plus the original storage keys. A future
 * upgrade can stream a single zip into the storage layer; the interface is
 * the same.
 */
export async function snapshotSubmission(args: {
  claimId: string;
  kind: "initial_application" | "additional_records" | "appeal" | "other";
  documentIds: string[];
  signerName?: string;
  notes?: string;
  actorUserId?: string;
}): Promise<{ submissionId: string; manifestHash: string }> {
  const docs = await prisma.document.findMany({
    where: { id: { in: args.documentIds }, claimId: args.claimId },
  });

  const entries: ManifestEntry[] = docs.map((d) => ({
    filename: d.filename,
    storageKey: d.storageKey,
    sha256: d.sha256,
    byteSize: d.byteSize,
    source: d.source,
  }));

  const manifest: Manifest = {
    claimId: args.claimId,
    kind: args.kind,
    createdAt: new Date().toISOString(),
    signerName: args.signerName,
    signedAt: args.signerName ? new Date().toISOString() : undefined,
    entries,
    notes: args.notes,
  };
  const manifestJson = JSON.stringify(manifest);
  const manifestHash = sha256(manifestJson);

  const manifestKey = `claims/${args.claimId}/submissions/${Date.now()}-manifest.json`;
  await getStorage().put(manifestKey, Buffer.from(manifestJson, "utf8"), "application/json");

  const sub = await prisma.submission.create({
    data: {
      claimId: args.claimId,
      kind: args.kind,
      storageKey: manifestKey,
      manifestJson,
      manifestHash,
      signerName: args.signerName,
      signedAt: args.signerName ? new Date() : null,
    },
  });

  await prisma.timelineEvent.create({
    data: {
      claimId: args.claimId,
      type: "submission",
      actor: args.actorUserId ?? "system",
      payload: JSON.stringify({
        submissionId: sub.id,
        kind: args.kind,
        manifestHash,
        documentCount: docs.length,
      }),
      payloadHash: manifestHash,
    },
  });

  await audit({
    userId: args.actorUserId,
    action: "claim.submit",
    entityType: "claim",
    entityId: args.claimId,
    metadata: { kind: args.kind, manifestHash, documentCount: docs.length },
  });

  return { submissionId: sub.id, manifestHash };
}
