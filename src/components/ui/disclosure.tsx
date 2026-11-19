import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface DisclosureProps {
  /** The always-visible label. */
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

/**
 * A collapsed-by-default section for detail a reader wants sometimes, not
 * always (differentiation moves, the equity note). Native `<details>`, so it is
 * keyboard-operable, announced as expandable, and found by in-page search.
 */
export default function Disclosure({ summary, children, defaultOpen = false, className }: DisclosureProps) {
  return (
    <details open={defaultOpen} className={cn("group rounded-lg border border-border bg-muted", className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <ChevronRight
          size={16}
          aria-hidden="true"
          className="flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
        />
        {summary}
      </summary>
      <div className="px-3 pb-3 pl-9 text-sm text-foreground">{children}</div>
    </details>
  )
}
