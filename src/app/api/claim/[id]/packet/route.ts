import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateClaimPacket } from "@/lib/packet";
import { getStorage, buildStorageKey } from "@/lib/storage";
import { sha256 } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const claim = await prisma.claim.findUnique({
    where: { id },
    include: { profile: { include: { user: true } } },
  });
  if (!claim || claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const { pdf, title } = await generateClaimPacket(id);
  const buf = Buffer.from(pdf);

  const storageKey = buildStorageKey({
    claimId: id,
    kind: "packets",
    filename: `lod-application-${Date.now()}.pdf`,
  });
  await getStorage().put(storageKey, buf, "application/pdf");

  const doc = await prisma.document.create({
    data: {
      claimId: id,
      source: "player_upload",
      providerName: "Gridiron LOD",
      filename: `${title}.pdf`,
      mimeType: "application/pdf",
      byteSize: buf.byteLength,
      storageKey,
      sha256: sha256(buf),
      ocrStatus: "done",
      pageCount: 1,
    },
  });

  await audit({ userId, action: "claim.packet.generated", entityType: "claim", entityId: id });

  return NextResponse.json({
    ok: true,
    documentId: doc.id,
    url: `/api/claim/${id}/packet/download/${doc.id}`,
  });
}
