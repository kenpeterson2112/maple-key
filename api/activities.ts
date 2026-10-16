import crypto from "node:crypto"
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { guardRequest } from "./_lib/guard.js"
import {
  ACTIVITY_ID_ALPHABET,
  ACTIVITY_ID_PATTERN,
  normalizeActivity,
  type StudentActivity,
} from "../shared/student-activity.js"

/**
 * Stored student activities, backing short links like /a/x7k2p9.
 *
 *   GET  /api/activities?id=x7k2p9                  -> { activity }
 *   POST /api/activities { activity }               -> { id, editToken }   (create)
 *   POST /api/activities { id, editToken, activity } -> { id }             (update)
 *
 * Storage is the Maple Key Supabase project (ca-central-1). The table has RLS
 * on and no policies, so it is unreachable with the public key; only this
 * function, holding SUPABASE_SECRET_KEY, reads or writes it.
 *
 * There are no teacher accounts yet, so edits are authorized by a per-activity
 * edit token returned once at creation and kept in the teacher's browser with
 * the lesson. Only its SHA-256 is stored.
 *
 * Reads are deliberately NOT behind guardRequest: a whole class opens the same
 * link at once, usually from one school IP, and the per-IP limit would turn
 * most of them away. A read is a single primary-key lookup.
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

function supabaseHeaders(): Record<string, string> {
  const key = SUPABASE_SECRET_KEY as string
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" }
  // Legacy service_role keys are JWTs and also go in Authorization; new
  // sb_secret_ keys are sent as apikey only.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`
  return headers
}

function newId(): string {
  let id = ""
  for (let i = 0; i < 8; i++) id += ACTIVITY_ID_ALPHABET[crypto.randomInt(ACTIVITY_ID_ALPHABET.length)]
  return id
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex")

async function readActivity(id: string): Promise<StudentActivity | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/activities?id=eq.${id}&select=payload`, {
    headers: supabaseHeaders(),
  })
  if (!r.ok) throw new Error(`read failed: ${r.status}`)
  const rows = (await r.json()) as { payload: unknown }[]
  return rows.length ? normalizeActivity(rows[0].payload) : null
}

async function createActivity(activity: StudentActivity): Promise<{ id: string; editToken: string }> {
  const editToken = crypto.randomBytes(24).toString("base64url")
  // Ids are random over 31^8 (~850 billion); retry once on the rare collision.
  for (let attempt = 0; attempt < 2; attempt++) {
    const id = newId()
    const r = await fetch(`${SUPABASE_URL}/rest/v1/activities`, {
      method: "POST",
      headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({ id, payload: activity, edit_token_hash: hashToken(editToken) }),
    })
    if (r.ok) return { id, editToken }
    if (r.status !== 409) throw new Error(`insert failed: ${r.status}`)
  }
  throw new Error("insert failed: id collision")
}

/** Returns false when the id/token pair doesn't match a stored activity. */
async function updateActivity(id: string, editToken: string, activity: StudentActivity): Promise<boolean> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/activities?id=eq.${id}&edit_token_hash=eq.${hashToken(editToken)}`,
    {
      method: "PATCH",
      headers: { ...supabaseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({ payload: activity, updated_at: new Date().toISOString() }),
    },
  )
  if (!r.ok) throw new Error(`update failed: ${r.status}`)
  const rows = (await r.json()) as unknown[]
  return rows.length === 1
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    // The client treats this as "no short links here" and falls back to hash links.
    res.status(503).json({ error: "Activity storage is not configured" })
    return
  }

  try {
    if (req.method === "GET") {
      const id = typeof req.query.id === "string" ? req.query.id : ""
      if (!ACTIVITY_ID_PATTERN.test(id)) {
        res.status(404).json({ error: "Not found" })
        return
      }
      const activity = await readActivity(id)
      if (!activity) {
        res.status(404).json({ error: "Not found" })
        return
      }
      // Short shared cache: a class loading the link together hits the edge,
      // and a teacher's typo fix still reaches students within a minute.
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30")
      res.status(200).json({ activity })
      return
    }

    if (!guardRequest(req, res)) return
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" })
      return
    }

    const body = (req.body ?? {}) as Record<string, unknown>
    const activity = normalizeActivity(body.activity)
    if (!activity) {
      res.status(400).json({ error: "Invalid activity" })
      return
    }

    if (body.id !== undefined) {
      const id = typeof body.id === "string" ? body.id : ""
      const token = typeof body.editToken === "string" ? body.editToken : ""
      if (!ACTIVITY_ID_PATTERN.test(id) || !token || !(await updateActivity(id, token, activity))) {
        res.status(403).json({ error: "Cannot update this activity" })
        return
      }
      res.status(200).json({ id })
      return
    }

    res.status(201).json(await createActivity(activity))
  } catch (err) {
    console.error("[activities]", err)
    res.status(502).json({ error: "Activity storage is unavailable" })
  }
}
