import { useMemo } from "react"
import useSWR from "swr"
import type { Resource } from "@/lib/types"
import { withBasePath } from "@/lib/base-path"
import { fetchJson } from "@/lib/fetch-json"
import { normalizeGrades } from "@/lib/utils"

// Shared by Where the class is and Progress, so "Browse 13 B1.2 resources" counts the
// same everywhere.

/** How many active resources a class has tagged with a code (or under it, for an overall). */
export function useResourceCounter() {
  const { data } = useSWR<{ resources: Resource[] }>(withBasePath("/resources.json"), fetchJson, { revalidateOnFocus: false })
  return useMemo(() => {
    const resources = (data?.resources ?? []).filter((r) => !r.is_collection && !r.suppressed)
    return (subject: string, grade: string, code: string): number | null => {
      if (!data) return null
      return resources.filter(
        (r) =>
          r.subject === subject &&
          normalizeGrades(r.grade_level).includes(grade) &&
          (r.curriculum_expectations ?? []).some((c) => c === code || c.startsWith(`${code}.`)),
      ).length
    }
  }, [data])
}
