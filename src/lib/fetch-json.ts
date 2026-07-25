/**
 * JSON fetch helper for SWR and one-off reads.
 *
 * The bare `fetch(url).then((res) => res.json())` this replaces had no status
 * check, which fails in a specific and quiet way: a non-2xx response carrying a
 * JSON body (a CDN or proxy error envelope, say) parses successfully, so SWR
 * stores it as data rather than raising. Callers then read `data.resources`,
 * get `undefined`, and render an empty list — the UI says "nothing found"
 * when it should say "something went wrong".
 *
 * An HTML error page — what the GitHub Pages mirror returns for `/api/*`,
 * since it has no serverless runtime — did surface, but only by accident:
 * `.json()` threw a `SyntaxError` mentioning "Unexpected token '<'", which is
 * a parser complaint rather than anything a caller can act on. Checking the
 * content type turns that into a real message.
 */
export class HttpError extends Error {
  readonly status: number
  readonly url: string

  constructor(message: string, status: number, url: string) {
    super(message)
    this.name = "HttpError"
    this.status = status
    this.url = url
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)

  if (!res.ok) {
    // Prefer an { error } field from the body; fall back to the status line.
    let detail = ""
    try {
      const body = await res.clone().json()
      if (body && typeof body.error === "string") detail = body.error
    } catch {
      // Body was not JSON — the status alone is the whole story.
    }
    throw new HttpError(detail || `Request failed (HTTP ${res.status})`, res.status, url)
  }

  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.includes("json")) {
    throw new HttpError(
      "Expected JSON but the server returned something else. On the GitHub Pages mirror the AI endpoints do not exist — use the Vercel deployment.",
      res.status,
      url,
    )
  }

  return res.json() as Promise<T>
}
