import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyAuditChain } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const result = await verifyAuditChain();
  return NextResponse.json(result);
}
