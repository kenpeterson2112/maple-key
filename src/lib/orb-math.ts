import type { LevelCounts, CoverageNode } from "./assessment-results"
import { LEVEL_ORDER, type ProficiencyLevel } from "./assessment-types"

export function totalOf(counts: LevelCounts): number {
  return counts.level1 + counts.level2 + counts.level3 + counts.level4
}

// Fraction of `counts` at each level, all 0 when the total is 0.
export function levelProportions(counts: LevelCounts): Record<ProficiencyLevel, number> {
  const total = totalOf(counts)
  if (total === 0) return { level1: 0, level2: 0, level3: 0, level4: 0 }
  return {
    level1: counts.level1 / total,
    level2: counts.level2 / total,
    level3: counts.level3 / total,
    level4: counts.level4 / total,
  }
}

// The level with the most recorded responses, or null when there's no data.
export function dominantLevel(counts: LevelCounts): ProficiencyLevel | null {
  if (totalOf(counts) === 0) return null
  return LEVEL_ORDER.reduce((best, level) => (counts[level] > counts[best] ? level : best))
}

// Sort key for surfacing the most urgent nodes first: highest share of
// level1 (most urgent), lowest share of level4. Nodes with no recorded data
// sort last.
export function urgencyScore(node: CoverageNode): number {
  const total = totalOf(node.bands)
  if (total === 0) return -1
  return node.bands.level1 / total - node.bands.level4 / total
}
