import { BASE_PATH } from "@/lib/base-path"

/**
 * A student activity is a fill-in version of a teacher's graphic organizer.
 *
 * There is no database, so the whole activity travels inside the link itself:
 * `/#activity=<base64url JSON>`. That keeps the link stable (same organizer →
 * same URL), works on both Vercel and the static GitHub Pages mirror, and
 * needs no student login. The hash never reaches a server, so nothing a
 * teacher writes is logged in request URLs.
 */
export interface StudentActivity {
  /** Payload version, so the format can evolve without breaking old links. */
  v: 1
  title: string
  subtitle: string
  /** Prompt shown above each response box, in order. */
  prompts: string[]
  lang: "en" | "fr"
}

export const ACTIVITY_HASH_PREFIX = "#activity="

const MAX_PROMPTS = 8
const MAX_TEXT = 500

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

/**
 * Parse an activity out of a location hash. Returns null for anything
 * malformed; the link is untrusted input, so every field is checked and
 * clamped rather than cast.
 */
export function decodeActivity(hash: string): StudentActivity | null {
  if (!hash.startsWith(ACTIVITY_HASH_PREFIX)) return null
  try {
    const raw: unknown = JSON.parse(fromBase64Url(hash.slice(ACTIVITY_HASH_PREFIX.length)))
    if (typeof raw !== "object" || raw === null) return null
    const r = raw as Record<string, unknown>
    if (r.v !== 1 || typeof r.title !== "string" || !Array.isArray(r.prompts)) return null
    const prompts = r.prompts
      .filter((p): p is string => typeof p === "string")
      .slice(0, MAX_PROMPTS)
      .map((p) => p.slice(0, MAX_TEXT))
    if (prompts.length === 0) return null
    return {
      v: 1,
      title: r.title.slice(0, MAX_TEXT),
      subtitle: typeof r.subtitle === "string" ? r.subtitle.slice(0, MAX_TEXT) : "",
      prompts,
      lang: r.lang === "fr" ? "fr" : "en",
    }
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
