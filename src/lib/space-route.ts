// Every space has an address, so the browser's Back and Forward move between
// spaces (PROGRESS_SPEC.md §1). Pure: App.tsx owns the history calls.
//
// main.tsx already routes on the hash for standalone screens (#account,
// #district, #admin, the student activity prefix) and reloads the page when
// the hash moves into or out of one of them. None of these hashes may start
// with those prefixes; the tests check it.

/** Every space App.tsx can show. */
export type Space =
  | "home"
  | "resources"
  | "lessonplanner"
  | "assessment"
  | "lessons"
  | "progress"
  | "settings"
  | "classroom"

export interface SpaceRoute {
  space: Space
  /** Progress only: a strand, overall or specific code ("B", "B2", "B2.3"). */
  anchor?: string
}

// Quick Check ("assessment") has no address: it's a full-screen flow over the
// current entry, and its lesson isn't in the URL.
const HASH_BY_SPACE: Partial<Record<Space, string>> = {
  home: "",
  lessonplanner: "plan",
  resources: "search",
  progress: "progress",
  lessons: "lessons",
  settings: "settings",
  classroom: "classroom",
}

const SPACE_BY_HASH = new Map<string, Space>(
  Object.entries(HASH_BY_SPACE).map(([space, hash]) => [hash, space as Space]),
)

/** Whether a space gets its own history entry. */
export function hasAddress(space: Space): boolean {
  return HASH_BY_SPACE[space] !== undefined
}

/** Reads a location hash ("#progress/B2.3", "#plan", ""). Anything unknown is Home. */
export function parseSpaceRoute(hash: string): SpaceRoute {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  const slash = raw.indexOf("/")
  const head = slash === -1 ? raw : raw.slice(0, slash)
  const space = SPACE_BY_HASH.get(head)
  if (!space) return { space: "home" }
  if (space !== "progress" || slash === -1) return { space }
  let anchor: string
  try {
    anchor = decodeURIComponent(raw.slice(slash + 1))
  } catch {
    return { space }
  }
  return anchor ? { space, anchor } : { space }
}

/** The hash for a route, "#"-prefixed, or "" for Home and spaces with no address. */
export function serializeSpaceRoute(route: SpaceRoute): string {
  const hash = HASH_BY_SPACE[route.space]
  if (!hash) return ""
  if (route.space === "progress" && route.anchor) return `#${hash}/${encodeURIComponent(route.anchor)}`
  return `#${hash}`
}
