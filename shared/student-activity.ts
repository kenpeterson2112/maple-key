/**
 * The shape of a shared student activity (a fill-in graphic organizer), and
 * the one validator for it. Lives in shared/ because both ends need it: the
 * browser checks activities decoded from hash links, and api/activities.ts
 * checks what teachers submit before it is stored.
 *
 * Activities hold teacher-written content only. Student answers never leave
 * the student's device (they autosave locally and leave as a PDF).
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

export const ACTIVITY_LIMITS = { maxPrompts: 8, maxText: 500 } as const

/**
 * Validate and clamp untrusted input into a StudentActivity, or null if it
 * isn't one. Every field is checked rather than cast.
 */
export function normalizeActivity(raw: unknown): StudentActivity | null {
  if (typeof raw !== "object" || raw === null) return null
  const r = raw as Record<string, unknown>
  if (r.v !== 1 || typeof r.title !== "string" || !Array.isArray(r.prompts)) return null
  const prompts = r.prompts
    .filter((p): p is string => typeof p === "string")
    .slice(0, ACTIVITY_LIMITS.maxPrompts)
    .map((p) => p.slice(0, ACTIVITY_LIMITS.maxText))
  if (prompts.length === 0) return null
  return {
    v: 1,
    title: r.title.slice(0, ACTIVITY_LIMITS.maxText),
    subtitle: typeof r.subtitle === "string" ? r.subtitle.slice(0, ACTIVITY_LIMITS.maxText) : "",
    prompts,
    lang: r.lang === "fr" ? "fr" : "en",
  }
}

/**
 * Short activity ids, 8 characters from an alphabet with no look-alikes
 * (no 0/o, 1/l/i), so a student can type one off the board.
 */
export const ACTIVITY_ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"
export const ACTIVITY_ID_PATTERN = /^[a-hjkmnp-z2-9]{8}$/
