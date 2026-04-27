import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: null, mfaEnrolledAt: null },
  });
  await audit({ userId, action: "mfa.disabled" });
  return NextResponse.json({ ok: true });
}
