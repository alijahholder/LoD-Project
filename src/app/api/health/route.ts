import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for load tests and uptime monitoring. Verifies the
 * database is reachable. Intentionally returns no PHI.
 */
export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({
      ok: true,
      uptime: process.uptime(),
      dbLatencyMs: Date.now() - start,
      version: process.env.APP_VERSION ?? "dev",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "db_unreachable" },
      { status: 503 },
    );
  }
}
