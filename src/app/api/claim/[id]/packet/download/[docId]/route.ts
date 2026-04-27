import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { audit } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id, docId } = await params;

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { claim: { include: { profile: { include: { user: true } } } } },
  });
  if (!doc || doc.claimId !== id || doc.claim.profile.user.id !== userId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const buf = await getStorage().get(doc.storageKey);
  await audit({ userId, action: "document.download", entityType: "document", entityId: docId });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": doc.mimeType,
      "content-disposition": `attachment; filename="${doc.filename}"`,
      "cache-control": "no-store",
    },
  });
}
