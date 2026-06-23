/**
 * In-memory token-bucket rate limiter, keyed by IP.
 *
 * CAVEAT — this state lives in the serverless function's module scope: it
 * resets on every cold start and is NOT shared across concurrent Vercel
 * instances or regions, so it throttles a single warm instance rather than
 * enforcing a true global per-IP cap. For real multi-instance enforcement,
 * provision Vercel KV (or Upstash Redis via the Vercel Marketplace) and
 * back this bucket with KV INCR/EXPIRE calls keyed the same way (by IP).
 * This in-memory version is the pragmatic stopgap until that's wired up.
 */
const buckets = new Map<string, { tokens: number; updatedAt: number }>()

const RATE_LIMIT_MAX = Number(process.env.MK_RATE_LIMIT_MAX ?? 10)
const RATE_LIMIT_WINDOW_MS = Number(process.env.MK_RATE_LIMIT_WINDOW_MS ?? 60_000)

/** Keep the map from growing unbounded on a long-lived warm instance. */
const MAX_TRACKED_IPS = 5000

export function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const bucket = buckets.get(ip) ?? { tokens: RATE_LIMIT_MAX, updatedAt: now }

  const elapsedMs = now - bucket.updatedAt
  const refill = (elapsedMs / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_MAX
  bucket.tokens = Math.min(RATE_LIMIT_MAX, bucket.tokens + refill)
  bucket.updatedAt = now

  if (bucket.tokens < 1) {
    buckets.set(ip, bucket)
    return false
  }

  bucket.tokens -= 1
  buckets.set(ip, bucket)

  if (buckets.size > MAX_TRACKED_IPS) {
    const oldestKey = buckets.keys().next().value
    if (oldestKey !== undefined) buckets.delete(oldestKey)
  }

  return true
}
