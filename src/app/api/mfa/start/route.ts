import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { encryptPHI } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(user.email, "Gridiron LOD", secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: encryptPHI(secret), mfaEnrolledAt: null },
  });
  await audit({ userId, action: "mfa.enroll_started" });

  return NextResponse.json({ otpauthUrl, qrDataUrl });
}
