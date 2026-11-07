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
  iconColor = "text-pop-strong",
  iconBg = "bg-pop-tint",
  leading,
  children,
  hideTitleOnMobile = false,
}: {
  icon: LucideIcon
  title: string
  /** Tailwind text-colour class for the icon glyph (a token, e.g. "text-primary-strong"). */
  iconColor?: string
  /** Tailwind background class for the icon circle. */
  iconBg?: string
  /** Rendered before the icon — e.g. a Back button. */
  leading?: ReactNode
  /** Right-aligned controls (badges, dev tools, actions). */
  children?: ReactNode
  /** Hide the title text on small screens (the icon carries context there). */
  hideTitleOnMobile?: boolean
}) {
  return (
    <header className="relative flex-shrink-0 flex items-center gap-2 border-b border-border bg-card px-4 md:px-6 py-3">
      {/* Left zone: back · icon · title. flex-1 balances the right zone so the
          centered filter cluster sits in the true middle of the bar. */}
      <div className="flex flex-1 min-w-0 items-center gap-2">
        {leading}
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
        <h1 className={`text-base font-bold text-foreground truncate min-w-0 ${hideTitleOnMobile ? "hidden sm:block" : ""}`}>{title}</h1>
      </div>

      {/* Center zone: the curriculum filter cluster (see CurriculumFilterBar). */}
      <CurriculumFilterBar />

      {/* Right zone: page-specific controls. flex-1 on desktop mirrors the left
          zone for centering; on mobile it only takes the space it needs. */}
      <div className="flex flex-shrink-0 md:flex-1 min-w-0 items-center justify-end gap-2">{children}</div>
    </header>
  )
}
