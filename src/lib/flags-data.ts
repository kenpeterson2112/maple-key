export type FlagReason = "broken_link" | "curriculum" | "inappropriate" | "other"

export interface ResourceFlag {
  id: string
  resourceId: string
  reason: FlagReason
  details?: string
  date: string
}

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  broken_link: "Broken link",
  curriculum: "Curriculum issue",
  inappropriate: "Inappropriate content",
  other: "Other",
}

// Map of resource IDs to their flags
export const flagsData: Record<string, ResourceFlag[]> = {
  // Start empty - will be populated later
}

export const getFlagsForResource = (resourceId: string): ResourceFlag[] => {
  return flagsData[resourceId] || []
}

export const addFlag = (flag: ResourceFlag) => {
  if (!flagsData[flag.resourceId]) {
    flagsData[flag.resourceId] = []
  }
  flagsData[flag.resourceId].push(flag)
}
