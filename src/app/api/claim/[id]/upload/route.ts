import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getStorage, buildStorageKey } from "@/lib/storage";
import { sha256 } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: claimId } = await params;

  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { profile: { include: { user: true } } },
  });
  if (!claim || claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const fd = await req.formData();
  const file = fd.get("file") as File | null;
  const source = String(fd.get("source") ?? "player_upload");
  const providerName = (fd.get("providerName") as string) || null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "file too large" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const hash = sha256(buf);
  const storageKey = buildStorageKey({ claimId, kind: "documents", filename: file.name });
  await getStorage().put(storageKey, buf, file.type);

  const doc = await prisma.document.create({
    data: {
      claimId,
      source,
      providerName,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      byteSize: buf.byteLength,
      storageKey,
      sha256: hash,
      ocrStatus: "pending",
    },
  });
  await audit({ userId, action: "document.uploaded", entityType: "document", entityId: doc.id, metadata: { claimId, source, sha256: hash } });

  return NextResponse.json({ ok: true, documentId: doc.id });
}
