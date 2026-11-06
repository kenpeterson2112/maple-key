import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getClientIp } from "./_lib/security.js"
import { checkRateLimit } from "./_lib/rate-limit.js"

/**
 * POST /api/invitations  { organizationId, email, role, redirectTo }
 *   Authorization: Bearer <the admin's Supabase access token>
 *   -> 201 { delivery: "invited" | "signin" }
 *
 * Two steps, with authorization left entirely to the database:
 *  1. Insert the invitation *as the signed-in admin* (publishable key + their
 *     JWT), so the invitations RLS policy decides whether they may invite this
 *     person to this org with this role. A refusal comes back as 403.
 *  2. Only then use the secret key to have Supabase Auth email them. A new
 *     person gets an account invite; someone who already has an account gets a
 *     sign-in link instead and joins on that sign-in (accept_pending_invitation).
 *
 * The secret key never decides who may invite whom; it only sends mail for an
 * invite the database already accepted.
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY
// Vercel exposes VITE_* vars to functions too, so one setting serves both ends.
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const ROLES = new Set(["district_admin", "school_admin", "teacher"])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function secretHeaders(): Record<string, string> {
  const key = SECRET_KEY as string
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" }
  // Legacy service_role keys are JWTs and also go in Authorization.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`
  return headers
}

/** 'created' | 'exists' (an open invite is already there) | 'forbidden' */
async function insertAsUser(
  userJwt: string,
  invite: { organization_id: string; email: string; role: string },
): Promise<"created" | "exists" | "forbidden"> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/invitations`, {
    method: "POST",
    headers: {
      apikey: PUBLISHABLE_KEY as string,
      Authorization: `Bearer ${userJwt}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(invite),
  })
  if (r.ok) return "created"
  if (r.status === 409) return "exists"
  if (r.status === 401 || r.status === 403) return "forbidden"
  throw new Error(`invitation insert failed: ${r.status} ${await r.text()}`)
}

async function sendInviteEmail(email: string, redirectTo: string | undefined): Promise<"invited" | "signin"> {
  const qs = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ""
  const r = await fetch(`${SUPABASE_URL}/auth/v1/invite${qs}`, {
    method: "POST",
    headers: secretHeaders(),
    body: JSON.stringify({ email }),
  })
  if (r.ok) return "invited"
  // 422 = they already have an account: send a sign-in link; the invite is
  // picked up when they sign in.
  if (r.status !== 422) throw new Error(`invite email failed: ${r.status} ${await r.text()}`)
  const otp = await fetch(`${SUPABASE_URL}/auth/v1/otp${qs}`, {
    method: "POST",
    headers: secretHeaders(),
    body: JSON.stringify({ email, create_user: false }),
  })
  if (!otp.ok) throw new Error(`sign-in email failed: ${otp.status} ${await otp.text()}`)
  return "signin"
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }
  if (!SUPABASE_URL || !SECRET_KEY || !PUBLISHABLE_KEY) {
    res.status(503).json({ error: "Accounts are not configured on this deployment" })
    return
  }
  if (!checkRateLimit(getClientIp(req))) {
    res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." })
    return
  }

  const auth = req.headers.authorization
  const jwt = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : ""
  if (!jwt) {
    res.status(401).json({ error: "Sign in to send invites" })
    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : ""
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const role = typeof body.role === "string" ? body.role : "teacher"
  const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo : undefined
  if (!UUID.test(organizationId) || !EMAIL.test(email) || email.length > 254 || !ROLES.has(role)) {
    res.status(400).json({ error: "Check the email address and role" })
    return
  }

  try {
    const inserted = await insertAsUser(jwt, { organization_id: organizationId, email, role })
    if (inserted === "forbidden") {
      res.status(403).json({ error: "You can't invite someone to that school with that role" })
      return
    }
    // "exists": an open invite is already there, so this is a resend.
    const delivery = await sendInviteEmail(email, redirectTo)
    res.status(201).json({ delivery, resent: inserted === "exists" })
  } catch (err) {
    console.error("[invitations]", err)
    res.status(502).json({ error: "Couldn't send the invite. Try again in a moment." })
  }
}
