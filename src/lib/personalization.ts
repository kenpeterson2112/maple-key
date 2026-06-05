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
