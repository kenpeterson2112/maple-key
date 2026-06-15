import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import CurriculumFilterBar from "@/components/curriculum-filter-bar"

// Shared top-of-page header for every nav space (Resources, Lessons, Insights,
// Lesson Planner). One white bar holds it all: an icon-in-a-circle, the page
// title, the curriculum filters (province / grade / subject / strand), and
// right-aligned page-specific controls (children). There is intentionally no
// separate filter strip — filters live on this same row. Sandbox / test-mode
// lives in Settings, not here.
export default function PageHeader({
  icon: Icon,
  title,
  iconColor = "#D97706",
  iconBg = "bg-amber-100",
  leading,
  children,
}: {
  icon: LucideIcon
  title: string
  /** Hex color for the icon glyph. */
  iconColor?: string
  /** Tailwind background class for the icon circle. */
  iconBg?: string
  /** Rendered before the icon — e.g. a Back button. */
  leading?: ReactNode
  /** Right-aligned controls (badges, dev tools, actions). */
  children?: ReactNode
}) {
  return (
    <header className="relative flex-shrink-0 flex items-center gap-2 border-b border-[#E8D5C4] bg-white px-4 md:px-6 py-3">
      {leading}
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <h1 className="text-base font-bold text-[#2C2C2C] truncate min-w-0">{title}</h1>

      {/* Curriculum filters share this row (see CurriculumFilterBar). */}
      <CurriculumFilterBar />

      {/* Right-aligned page-specific controls */}
      {children && <div className="ml-auto flex items-center gap-2 flex-shrink-0">{children}</div>}
    </header>
  )
}
