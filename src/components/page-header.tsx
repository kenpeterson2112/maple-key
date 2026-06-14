import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

// Shared top-of-page header so every nav space (Resources, Lessons, Insights,
// Lesson Planner) leads with the same structure: a slim white bar with an
// icon-in-a-circle, a bold title, an optional leading element (e.g. a Back
// button), and right-aligned controls. Page-specific filters/tabs live in a
// separate strip BELOW this on the cream background. Modeled on Class Insights.
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
  /** Right-aligned controls (filters, badges, actions). */
  children?: ReactNode
}) {
  return (
    <header className="flex-shrink-0 flex items-center gap-2 border-b border-[#E8D5C4] bg-white px-4 md:px-6 py-3">
      {leading}
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <h1 className="text-base font-bold text-[#2C2C2C] truncate">{title}</h1>
      {children && <div className="ml-auto flex items-center gap-2 min-w-0">{children}</div>}
    </header>
  )
}
