import type { LevelCounts } from "./assessment-results"
import type { ProficiencyLevel } from "./assessment-types"

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
