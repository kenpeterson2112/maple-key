import { useSyncExternalStore } from "react"

// The strand Progress has in view, so the header bar can mark it
// (aria-current="location"). Progress sets it while it's open and clears it on
// the way out; null everywhere else.

let strand: string | null = null
const listeners = new Set<() => void>()

export function setProgressStrand(code: string | null): void {
  if (code === strand) return
  strand = code
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useProgressStrand(): string | null {
  return useSyncExternalStore(subscribe, () => strand)
}
