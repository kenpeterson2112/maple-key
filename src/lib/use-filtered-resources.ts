"use client"

import { useMemo } from "react"
import useSWR from "swr"
import type { Filters, Resource } from "@/lib/types"
import { withBasePath } from "@/lib/base-path"
import { normalizeGrades, minGrade } from "@/lib/utils"
import { getReadinessForCodes, getProgressForCodes, type LevelCounts, type ReadinessLevel } from "@/lib/assessment-results"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export interface SidebarFilters {
  modality: string[]
  cost: string[]
  accessibility: string[]
  readiness: string[]
  [key: string]: string[]
}

// Shared resource fetch + context/sidebar filtering, used by both the full
// Resource Discovery results list and the embedded Plan-screen search panel.
// Keyword search, sorting, and pagination are left to each caller.
export function useFilteredResources(filters: Filters, sidebarFilters?: SidebarFilters) {
  const { data, error, isLoading } = useSWR<{ resources: Resource[] }>(withBasePath("/resources.json"), fetcher, {
    refreshInterval: 3600000,
    revalidateOnFocus: false,
  })

  const classReadiness = useMemo((): Record<string, ReadinessLevel> => {
    const resources = data?.resources
    if (!resources) return {}
    const codes = new Set<string>()
    resources.forEach(r => r.curriculum_expectations?.forEach((c: string) => codes.add(c)))
    return getReadinessForCodes(Array.from(codes))
  }, [data])

  // Raw per-code band counts for the same code set — lets each card roll its own
  // expectations up to an overall readiness without re-reading storage per render.
  const classProgress = useMemo((): Record<string, LevelCounts> => {
    const resources = data?.resources
    if (!resources) return {}
    const codes = new Set<string>()
    resources.forEach(r => r.curriculum_expectations?.forEach((c: string) => codes.add(c)))
    return getProgressForCodes(Array.from(codes))
  }, [data])

  const filteredResources = useMemo(() => {
    const resources = data?.resources
    if (!resources || !Array.isArray(resources)) return []

    return resources.filter((resource) => {
      if (resource.is_collection) return false

      if (filters.province && filters.province !== "" && filters.province !== "Canada") {
        if (resource.province !== filters.province) return false
      }

      if (filters.grade && filters.grade !== "") {
        const selectedGrades = filters.grade.split(",").map((g) => g.trim())
        const resourceGrades = normalizeGrades(resource.grade_level)
        if (!selectedGrades.some((g) => resourceGrades.includes(g))) return false
      }

      if (filters.subject && filters.subject !== "") {
        if (resource.subject?.toLowerCase() !== filters.subject.toLowerCase()) return false
      }

      if (filters.strand && filters.strand !== "") {
        const resourceStrands = resource.strand || []
        if (!resourceStrands.some((s) => s.toLowerCase() === filters.strand?.toLowerCase())) return false
      }

      if (sidebarFilters?.modality && sidebarFilters.modality.length > 0) {
        const resourceModalities = resource.modality || []
        if (!sidebarFilters.modality.some((m) => resourceModalities.includes(m))) return false
      }

      if (sidebarFilters?.cost && sidebarFilters.cost.length > 0) {
        const isPaidResource = resource.is_paid === true
        const hasFreeFilter = sidebarFilters.cost.includes("Free Only")
        const hasPaidFilter = sidebarFilters.cost.includes("Paid")
        if (hasFreeFilter && !hasPaidFilter && isPaidResource) return false
        if (hasPaidFilter && !hasFreeFilter && !isPaidResource) return false
      }

      if (sidebarFilters?.accessibility && sidebarFilters.accessibility.length > 0) {
        const hasMatch = sidebarFilters.accessibility.some((accessFilter) => {
          const resourceAccessibility = resource.accessibility?.[0] || ""
          if (accessFilter === "No concerns") return resourceAccessibility.toLowerCase().includes("no concerns")
          if (accessFilter === "Some Concerns") return resourceAccessibility.toLowerCase().includes("some concerns")
          if (accessFilter === "Not Accessible") return resourceAccessibility.toLowerCase().includes("not accessible")
          return false
        })
        if (!hasMatch) return false
      }

      if (sidebarFilters?.readiness && sidebarFilters.readiness.length > 0) {
        const codes: string[] = resource.curriculum_expectations || []
        const matches = sidebarFilters.readiness.some((selectedLevel) => {
          if (selectedLevel === "no-data") {
            return codes.length === 0 || codes.every(c => !classReadiness[c])
          }
          return codes.some(c => classReadiness[c] === selectedLevel)
        })
        if (!matches) return false
      }

      return true
    })
  }, [data, filters, sidebarFilters, classReadiness])

  return { data, error, isLoading, filteredResources, classProgress }
}

// Keyword search over the same fields used across the app's resource search UIs.
export function keywordFilter(resources: Resource[], query: string): Resource[] {
  if (query.length < 3) return resources
  const q = query.toLowerCase()
  return resources.filter((resource) => {
    const searchableFields = [
      resource.topic_title,
      resource.description,
      resource.publisher_creator,
      resource.subject,
      resource.province,
      resource.url,
      ...(resource.modality || []),
      ...(resource.strand || []),
      ...(resource.curriculum_expectations || []),
      ...(resource.accessibility || []),
    ]
    return searchableFields.some((field) => field && String(field).toLowerCase().includes(q))
  })
}

// Default sort: grade ascending, then by first curriculum expectation, then title.
export function sortResources(resources: Resource[]): Resource[] {
  return [...resources].sort((a, b) => {
    const gradeA = minGrade(a.grade_level)
    const gradeB = minGrade(b.grade_level)
    if (gradeA !== gradeB) return gradeA - gradeB

    const codeA = a.curriculum_expectations?.[0] || "ZZZ"
    const codeB = b.curriculum_expectations?.[0] || "ZZZ"
    const codeCompare = codeA.localeCompare(codeB, undefined, { numeric: true })
    if (codeCompare !== 0) return codeCompare

    return (a.topic_title || "").localeCompare(b.topic_title || "")
  })
}
