import type { VercelRequest, VercelResponse } from "@vercel/node"
import { applyCors, getClientIp, requireApiSecret } from "./security"
import { checkRateLimit } from "./rate-limit"

/**
 * CORS preflight + shared-secret gate + per-IP rate limit, shared by all
 * three Anthropic-backed endpoints. Returns false if the request was
 * already fully answered (preflight, 401, or 429) — caller should return
 * immediately in that case.
 */
export function guardRequest(req: VercelRequest, res: VercelResponse): boolean {
  if (!applyCors(req, res)) return false
  if (!requireApiSecret(req, res)) return false
  if (!checkRateLimit(getClientIp(req))) {
    res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." })
    return false
  }
  return true
}
