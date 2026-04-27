/**
 * Tiny in-process rate limiter. Suitable for single-instance dev / preview;
 * production should swap to Redis (Upstash / Elasticache) so limits hold across
 * Vercel function instances. The interface is intentionally minimal so the
 * Redis driver can drop in without touching call sites.
 */

type Bucket = { hits: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(args: {
  key: string;
  windowMs: number;
  limit: number;
}): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(args.key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + args.windowMs;
    buckets.set(args.key, { hits: 1, resetAt });
    return { ok: true, remaining: args.limit - 1, resetAt };
  }
  existing.hits += 1;
  const ok = existing.hits <= args.limit;
  return {
    ok,
    remaining: Math.max(0, args.limit - existing.hits),
    resetAt: existing.resetAt,
  };
}

/** Build a stable rate-limit key from request headers + a route-specific tag. */
export function clientKeyFromHeaders(headers: Headers, tag: string): string {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown";
  return `${tag}:${ip}`;
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
