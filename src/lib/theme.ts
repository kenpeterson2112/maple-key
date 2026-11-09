// Light / dark theme. The choice is a preference ("system", "light" or "dark")
// saved per browser under mk-theme; "system" follows the OS setting live.
//
// The first paint is handled by the inline script in index.html, which reads
// the same key and sets the same class before any CSS or React loads, so the
// page never flashes the wrong theme. Keep the two in step.

export type ThemePreference = "system" | "light" | "dark"

export const THEME_STORAGE_KEY = "mk-theme"

const darkQuery = (): MediaQueryList | null =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null

function isPreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark"
}

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isPreference(stored)) return stored
  } catch {
    // Storage blocked (private mode, disabled cookies): fall back to the OS.
  }
  return "system"
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference
  return darkQuery()?.matches ? "dark" : "light"
}

/** Puts the page in the theme the preference resolves to. */
export function applyTheme(preference: ThemePreference = getThemePreference()): void {
  const dark = resolveTheme(preference) === "dark"
  document.documentElement.classList.toggle("dark", dark)
  // The browser chrome colour. index.html holds both values on the tag, since
  // a meta tag can't read the CSS variables (they match --background).
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  const colour = meta?.dataset[dark ? "dark" : "light"]
  if (meta && colour) meta.content = colour
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Not saved, but still applied for this page.
  }
  applyTheme(preference)
}

/**
 * Keeps the page in step after load: follows the OS while the preference is
 * "system", and picks up a change made in another tab. Call once at startup.
 */
export function watchTheme(): () => void {
  const query = darkQuery()
  const onSystemChange = () => {
    if (getThemePreference() === "system") applyTheme("system")
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) applyTheme()
  }
  query?.addEventListener("change", onSystemChange)
  window.addEventListener("storage", onStorage)
  return () => {
    query?.removeEventListener("change", onSystemChange)
    window.removeEventListener("storage", onStorage)
  }
}
