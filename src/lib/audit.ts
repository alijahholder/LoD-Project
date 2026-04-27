import { prisma } from "./db";
import { sha256 } from "./crypto";

export type AuditInput = {
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Append-only, hash-chained audit log. Each entry hashes its content + the
 * previous entry's hash so any tampering is detectable end-to-end.
 */
export async function audit(input: AuditInput) {
  const last = await prisma.auditLog.findFirst({
    orderBy: { occurredAt: "desc" },
    select: { hash: true },
  });

  const occurredAt = new Date();
  const meta = input.metadata ? JSON.stringify(input.metadata) : null;
  const body = JSON.stringify({
    userId: input.userId ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    metadata: meta,
    occurredAt: occurredAt.toISOString(),
    prevHash: last?.hash ?? null,
  });
  const hash = sha256(body);

  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      metadata: meta,
      occurredAt,
      prevHash: last?.hash ?? null,
      hash,
    },
  });
}

export async function verifyAuditChain(): Promise<{
  ok: boolean;
  brokenAt?: string;
}> {
  const all = await prisma.auditLog.findMany({ orderBy: { occurredAt: "asc" } });
  let prev: string | null = null;
  for (const e of all) {
    const body = JSON.stringify({
      userId: e.userId,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      ip: e.ip,
      userAgent: e.userAgent,
      metadata: e.metadata,
      occurredAt: e.occurredAt.toISOString(),
      prevHash: prev,
    });
    const expect = sha256(body);
    if (expect !== e.hash || e.prevHash !== prev) {
      return { ok: false, brokenAt: e.id };
    }
    prev = e.hash;
  }
  return { ok: true };
}
