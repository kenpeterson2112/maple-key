/**
 * Vite injects the configured `base` URL here. In dev it's "/"; on the
 * production build for GitHub Pages it's "/v0-maple-key-website/".
 *
 * `BASE_URL` always has a trailing slash, so we trim it before joining
 * with paths that already start with "/".
 */
// `?.`: outside Vite (node --test) there is no import.meta.env.
const BASE = import.meta.env?.BASE_URL ?? "/"

export const BASE_PATH = BASE.replace(/\/$/, "")

/** Prefix an absolute path (one starting with `/`) with the Vite base URL. */
export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return path
  return `${BASE_PATH}${path}`
}
