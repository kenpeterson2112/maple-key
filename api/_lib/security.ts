import crypto from "node:crypto"
import type { VercelRequest, VercelResponse } from "@vercel/node"

/**
 * Shared-secret gate for the three Anthropic-backed endpoints.
 *
 * This is a deterrent, not a cryptographic guarantee: the client is a static
 * SPA with no login, so whatever value it sends has to be baked into the
 * built JS bundle (via the VITE_MK_API_KEY env var) and is therefore
 * readable by anyone who opens devtools or inspects the bundle/network tab.
 * What this DOES stop is the common case this fix targets — a scraper or
 * script that finds the bare endpoint URL and hits it directly without ever
 * loading the app. It does not stop someone who copies the header out of a
 * real request. Rate limiting and input caps (see rate-limit.ts, limits.ts)
 * are the layers that bound damage from a replayed key.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function requireApiSecret(req: VercelRequest, res: VercelResponse): boolean {
  const expected = process.env.MK_API_SECRET
  const provided = req.headers["x-mk-api-key"]
  if (!expected || typeof provided !== "string" || !safeEqual(provided, expected)) {
    res.status(401).json({ error: "Unauthorized" })
    return false
  }
  return true
}

export function getClientIp(req: VercelRequest): string {
  return (
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    "unknown"
  )
}

/**
 * Origins allowed to call these endpoints from a browser: production plus
 * this project's Vercel preview deployments, and localhost in dev. CORS only
 * restricts browser JS (curl/scripts ignore it entirely) — it's defense in
 * depth alongside the secret header and rate limiter, not the primary gate.
 */
const ALLOWED_ORIGINS = new Set(
  [
    "https://maplekey.vercel.app",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null,
    process.env.NODE_ENV !== "production" ? "http://localhost:5173" : null,
  ].filter((v): v is string => Boolean(v)),
)

/** Vercel preview deployments for this project, e.g. maplekey-git-<branch>-<team>.vercel.app */
const PREVIEW_ORIGIN_PATTERN = /^https:\/\/maplekey[a-z0-9-]*\.vercel\.app$/i

/**
 * Sets CORS headers and answers preflight requests. Returns false when the
 * request was a preflight OPTIONS request that has already been fully
 * answered (caller should return immediately); true otherwise.
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin
  const allowed = Boolean(origin) && (ALLOWED_ORIGINS.has(origin as string) || PREVIEW_ORIGIN_PATTERN.test(origin as string))
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin as string)
    res.setHeader("Vary", "Origin")
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-User-Email, X-MK-Api-Key")
  if (req.method === "OPTIONS") {
    res.status(allowed ? 204 : 403).end()
    return false
  }
  return true
}
