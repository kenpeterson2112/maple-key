import { BASE_PATH } from "@/lib/base-path"

import {
  ACTIVITY_ID_PATTERN,
  normalizeActivity,
  type StudentActivity,
} from "../../shared/student-activity"

export type { StudentActivity }

/**
 * A student activity is a fill-in version of a teacher's graphic organizer.
 * It reaches students by one of two links:
 *
 * - Short link `/a/<id>`: the activity is stored in Supabase via
 *   api/activities.ts. Teachers can fix a typo after sharing and students
 *   see it. Only works on Vercel, where the API runs.
 * - Hash link `/#activity=<base64url JSON>`: the whole activity travels in the
 *   link. The fallback whenever storage isn't reachable (the GitHub Pages
 *   mirror, an outage), and every link shared before storage existed.
 */
export const ACTIVITY_HASH_PREFIX = "#activity="

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeActivity(activity: StudentActivity): string {
  return toBase64Url(JSON.stringify(activity))
}

/** Absolute student link for an activity, respecting the Vite base path. */
export function buildActivityUrl(activity: StudentActivity): string {
  return `${window.location.origin}${BASE_PATH}/${ACTIVITY_HASH_PREFIX}${encodeActivity(activity)}`
}

/** Parse an activity out of a hash link, or null for anything malformed. */
export function decodeActivity(hash: string): StudentActivity | null {
  if (!hash.startsWith(ACTIVITY_HASH_PREFIX)) return null
  try {
    return normalizeActivity(JSON.parse(fromBase64Url(hash.slice(ACTIVITY_HASH_PREFIX.length))))
  } catch {
    return null
  }
}

// ---- Short links -----------------------------------------------------------

const SHORT_PATH = /^\/a\/([^/]+)\/?$/

/** The activity id from a short-link path (`/a/x7k2p9`), if this is one. */
export function shortLinkId(pathname: string): string | null {
  const path = BASE_PATH && pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) : pathname
  const m = SHORT_PATH.exec(path)
  return m && ACTIVITY_ID_PATTERN.test(m[1]) ? m[1] : null
}

export function buildShortUrl(id: string): string {
  return `${window.location.origin}${BASE_PATH}/a/${id}`
}

/** Fetch a stored activity. Null when it doesn't exist; throws when storage is unreachable. */
export async function fetchStoredActivity(id: string): Promise<StudentActivity | null> {
  const r = await fetch(`${BASE_PATH}/api/activities?id=${encodeURIComponent(id)}`)
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`activity fetch failed: ${r.status}`)
  const body: unknown = await r.json()
  return normalizeActivity((body as { activity?: unknown }).activity)
}

/** Where a teacher's copy of an activity lives in storage, kept with the lesson. */
export interface StoredActivityRef {
  id: string
  editToken: string
}

/**
 * Store (or update) an activity and return its reference, or null when
 * storage isn't available, in which case callers fall back to a hash link.
 * An update whose token no longer matches creates a fresh activity instead.
 */
export async function saveStoredActivity(
  activity: StudentActivity,
  existing?: StoredActivityRef | null,
): Promise<StoredActivityRef | null> {
  const post = (body: object) =>
    fetch(`${BASE_PATH}/api/activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MK-Api-Key": import.meta.env.VITE_MK_API_KEY ?? "",
      },
      body: JSON.stringify(body),
    })
  try {
    if (existing) {
      const r = await post({ id: existing.id, editToken: existing.editToken, activity })
      if (r.ok) return existing
      if (r.status !== 403) return null
    }
    const r = await post({ activity })
    if (!r.ok) return null
    const body = (await r.json()) as Partial<StoredActivityRef>
    return typeof body.id === "string" && typeof body.editToken === "string"
      ? { id: body.id, editToken: body.editToken }
      : null
  } catch {
    return null
  }
}

/** Short stable key for autosaving a student's answers to this activity. */
export function activityStorageKey(activity: StudentActivity): string {
  const s = encodeActivity(activity)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `mk-activity:${(h >>> 0).toString(36)}`
}

/**
 * Google Classroom's documented share URL. Opening it in a popup is the
 * no-script equivalent of the official share button, so we keep full control
 * of the button's look (the Classroom icon must follow Google's branding
 * guidelines if it's ever added).
 */
export function classroomShareUrl(activityUrl: string): string {
  return `https://classroom.google.com/share?url=${encodeURIComponent(activityUrl)}`
}

/** File-name-safe slug, keeping accented letters readable as plain ASCII. */
export function fileSlug(text: string, max = 40): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "")
}
