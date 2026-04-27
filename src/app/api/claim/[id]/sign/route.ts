import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateClaimPacket } from "@/lib/packet";
import { getESign } from "@/lib/esign";
import { getStorage, buildStorageKey } from "@/lib/storage";
import { sha256 } from "@/lib/crypto";
import { audit } from "@/lib/audit";

/**
 * Generate the packet, ship it to the e-sign provider, immediately fetch back
 * the signed copy (the mock provider stamps a signature line; DocuSign in
 * prod returns the executed PDF after the player completes the embedded
 * signing flow).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const signerName = String(body.signerName ?? "").trim();
  if (!signerName) return NextResponse.json({ error: "signerName required" }, { status: 400 });

  const claim = await prisma.claim.findUnique({
    where: { id },
    include: { profile: { include: { user: true } } },
  });
  if (!claim || claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const { pdf, title } = await generateClaimPacket(id);
  const env = await getESign().createEnvelope({
    documentBuffer: Buffer.from(pdf),
    documentName: `${title}.pdf`,
    signerEmail: claim.profile.user.email,
    signerName,
    subject: title,
  });
  const signed = await getESign().fetchSignedDocument(env.envelopeId);

  const storageKey = buildStorageKey({
    claimId: id,
    kind: "signed",
    filename: `lod-application-signed-${Date.now()}.pdf`,
  });
  await getStorage().put(storageKey, signed, "application/pdf");

  const doc = await prisma.document.create({
    data: {
      claimId: id,
      source: "player_upload",
      providerName: "Gridiron LOD (signed)",
      filename: `${title} (signed).pdf`,
      mimeType: "application/pdf",
      byteSize: signed.byteLength,
      storageKey,
      sha256: sha256(signed),
      ocrStatus: "done",
      pageCount: 1,
    },
  });

  await audit({
    userId,
    action: "claim.packet.signed",
    entityType: "claim",
    entityId: id,
    metadata: { envelopeId: env.envelopeId, signerName },
  });
  return NextResponse.json({ ok: true, documentId: doc.id });
}
