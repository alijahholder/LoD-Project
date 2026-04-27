import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientKeyFromHeaders, rateLimit } from "@/lib/rateLimit";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(1).max(120),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit({
    key: clientKeyFromHeaders(req.headers, "sign-up"),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many sign-up attempts. Try again later." }, { status: 429 });
  }
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
      role: "player",
    },
  });
  await audit({ userId: user.id, action: "user.created", entityType: "user", entityId: user.id });
  return NextResponse.json({ ok: true, userId: user.id });
}
