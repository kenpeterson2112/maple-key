import { Search, Lightbulb, BarChart3, BookOpen, type LucideIcon } from "lucide-react"

// The four working spaces. Desktop shows them as the pill toggle in the top
// bar; phones show them as the bottom tab bar. One list feeds both.

export type TopNavSpace = "lessonplanner" | "resources" | "progress" | "lessons"

export interface SpaceItem {
  id: TopNavSpace
  label: string
  icon: LucideIcon
}

export const SPACE_ITEMS: SpaceItem[] = [
  { id: "lessonplanner", label: "Plan", icon: Lightbulb },
  { id: "resources", label: "Search", icon: Search },
  { id: "progress", label: "Progress", icon: BarChart3 },
  { id: "lessons", label: "Lessons", icon: BookOpen },
]
