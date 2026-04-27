import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { decryptPHI } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { code } = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret) return NextResponse.json({ error: "no enrollment in progress" }, { status: 400 });
  const secret = decryptPHI(user.totpSecret);
  if (!secret) return NextResponse.json({ error: "decrypt failed" }, { status: 500 });
  const ok = authenticator.verify({ token: String(code ?? ""), secret });
  if (!ok) {
    await audit({ userId, action: "mfa.verify_failed" });
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnrolledAt: new Date() },
  });
  await audit({ userId, action: "mfa.enrolled" });
  return NextResponse.json({ ok: true });
}
