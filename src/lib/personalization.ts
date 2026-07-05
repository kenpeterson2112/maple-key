export interface Prefs {
  province: string
  grade: string
  subject: string
  strand: string
  /** True when the prefs were inferred (timezone defaults), not chosen by the user. */
  inferred: boolean
}

const STORAGE_KEY = "maplekey_prefs"

const TIMEZONE_TO_PROVINCE: Record<string, string> = {
  "America/Toronto": "ON",
  "America/Iqaluit": "NU",
  "America/Montreal": "QC",
  "America/Halifax": "NS",
  "America/Moncton": "NB",
  "America/Glace_Bay": "NS",
  "America/Goose_Bay": "NL",
  "America/St_Johns": "NL",
  "America/Winnipeg": "MB",
  "America/Regina": "SK",
  "America/Edmonton": "AB",
  "America/Vancouver": "BC",
  "America/Whitehorse": "YT",
  "America/Yellowknife": "NT",
  "America/Dawson_Creek": "BC",
  "America/Fort_Nelson": "BC",
}

export function inferProvinceFromTimeZone(): string {
  if (typeof Intl === "undefined") return "ON"
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TIMEZONE_TO_PROVINCE[tz] ?? "ON"
  } catch {
    return "ON"
  }
}

const DEFAULT_PREFS: Omit<Prefs, "province"> = {
  grade: "7",
  subject: "Math",
  strand: "",
  inferred: true,
}

/** Read prefs from localStorage, or build inferred defaults if none stored. */
export function getPrefs(): Prefs {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PREFS, province: "ON" }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Prefs>
      return {
        province: parsed.province ?? "ON",
        grade: parsed.grade ?? DEFAULT_PREFS.grade,
        subject: parsed.subject ?? DEFAULT_PREFS.subject,
        strand: parsed.strand ?? "",
        inferred: false,
      }
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULT_PREFS, province: inferProvinceFromTimeZone() }
}

export function setPrefs(prefs: Omit<Prefs, "inferred">): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...prefs, inferred: false }),
    )
  } catch {
    // ignore quota / privacy errors
  }
}

export function clearPrefs(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

const ONBOARDING_KEY = "maplekey_onboarded"

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === "true"
  } catch {
    return true
  }
}

export function setOnboarded(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(ONBOARDING_KEY, "true")
  } catch {
    // ignore
  }
}

const USER_EMAIL_KEY = "maplekey_user_email"

export function getUserEmail(): string {
  if (typeof window === "undefined") return ""
  try {
    return window.localStorage.getItem(USER_EMAIL_KEY) ?? ""
  } catch {
    return ""
  }
}

export function setUserEmail(email: string): void {
  if (typeof window === "undefined") return
  try {
    if (email.trim()) {
      window.localStorage.setItem(USER_EMAIL_KEY, email.trim())
    }
  } catch {
    // ignore
  }
}

const REPRODUCIBLE_LANGUAGE_KEY = "maplekey_reproducible_language"

/**
 * Language for AI-generated student reproducibles (Classroom Artifacts + the
 * printable graphic organizer). The teacher's own lesson plan stays in English;
 * this only switches the handouts students physically receive. Remembered across
 * sessions so French Immersion teachers don't re-toggle every lesson.
 */
export function getReproducibleLanguage(): "English" | "French" {
  if (typeof window === "undefined") return "English"
  try {
    return window.localStorage.getItem(REPRODUCIBLE_LANGUAGE_KEY) === "French"
      ? "French"
      : "English"
  } catch {
    return "English"
  }
}

export function setReproducibleLanguage(lang: "English" | "French"): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(REPRODUCIBLE_LANGUAGE_KEY, lang)
  } catch {
    // ignore quota / privacy errors
  }
}

const NO_TECH_MODE_KEY = "maplekey_no_tech_mode"

/** Remembered across sessions so teachers don't re-toggle every lesson. */
export function getNoTechMode(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(NO_TECH_MODE_KEY) === "true"
  } catch {
    return false
  }
}

export function setNoTechMode(value: boolean): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(NO_TECH_MODE_KEY, String(value))
  } catch {
    // ignore quota / privacy errors
  }
}

const LESSON_SETUP_MODE_KEY = "maplekey_lesson_setup_mode"

export type LessonSetupMode = "wizard" | "full"

/**
 * How the lesson-planner setup form is presented. "wizard" walks through one
 * step at a time (gentler for first-time users); "full" shows every option on
 * a single scrolling page (faster for tweaking). Remembered across sessions.
 */
export function getLessonSetupMode(): LessonSetupMode {
  if (typeof window === "undefined") return "wizard"
  try {
    return window.localStorage.getItem(LESSON_SETUP_MODE_KEY) === "full" ? "full" : "wizard"
  } catch {
    return "wizard"
  }
}

export function setLessonSetupMode(mode: LessonSetupMode): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(LESSON_SETUP_MODE_KEY, mode)
  } catch {
    // ignore quota / privacy errors
  }
}

const RESOURCE_TOUR_KEY = "maplekey_resource_tour_seen"

export function isResourceTourSeen(): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(RESOURCE_TOUR_KEY) === "true"
  } catch {
    return true
  }
}

export function setResourceTourSeen(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(RESOURCE_TOUR_KEY, "true")
  } catch {
    // ignore
  }
}
