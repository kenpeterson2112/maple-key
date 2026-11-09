import { useEffect, useState } from "react"
import { SPACE_ITEMS, type TopNavSpace } from "@/lib/nav-items"

// Phone navigation: the four spaces as a bottom tab bar, below md only (desktop
// keeps the pill toggle in the top bar). It is the last row of the app's flex
// column rather than a fixed overlay, so nothing can scroll behind it and no
// page needs padding to clear it.

export default function BottomTabBar({
  activeSpace,
  onChangeSpace,
  planBadge = 0,
  hidden = false,
}: {
  /** null on the landing page and other non-tab screens: no tab is active. */
  activeSpace: TopNavSpace | null
  onChangeSpace: (space: TopNavSpace) => void
  /** Bookmarked-resource count, shown on the Plan tab. */
  planBadge?: number
  /** Hide for full-screen flows that need the whole height. */
  hidden?: boolean
}) {
  const keyboardOpen = useOnScreenKeyboard()
  if (hidden || keyboardOpen) return null

  return (
    <nav
      aria-label="Main"
      className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex h-16">
        {SPACE_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activeSpace === id
          const badge = id === "lessonplanner" && planBadge > 0 ? planBadge : 0
          return (
            <li key={id} className="flex flex-1">
              <button
                type="button"
                onClick={() => onChangeSpace(id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                  active ? "text-secondary-strong" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {/* Indicator: always takes its space, so switching tabs never shifts the icons. */}
                <span
                  aria-hidden="true"
                  className={`h-0.75 w-8 rounded-full transition-colors ${active ? "bg-secondary" : "bg-transparent"}`}
                />
                <span className="relative">
                  <Icon size={24} aria-hidden="true" />
                  {badge > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                      {badge >= 10 ? "9+" : badge}
                      <span className="sr-only"> saved resources</span>
                    </span>
                  )}
                </span>
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// The on-screen keyboard shrinks the visual viewport but not the layout one.
// While it's up, the bar would sit on top of the field being typed in, so hide it.
function useOnScreenKeyboard(): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const check = () => setOpen(window.innerHeight - vv.height > 150)
    vv.addEventListener("resize", check)
    check()
    return () => vv.removeEventListener("resize", check)
  }, [])
  return open
}
