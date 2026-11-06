import { CornerDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface FollowsLinkProps {
  /** `onOpen` is absent when the source lesson has dropped out of the log. */
  follows: { title: string; onOpen?: () => void }
  className?: string
}

/** "Follows: <title>" — one click back to the lesson this one continues. */
export default function FollowsLink({ follows, className }: FollowsLinkProps) {
  const label = (
    <>
      <CornerDownRight size={12} className="flex-shrink-0" />
      <span className="truncate">
        Follows: <span className="font-semibold">{follows.title || "Untitled lesson"}</span>
      </span>
    </>
  )
  if (!follows.onOpen) {
    return (
      <p
        className={cn("flex items-center gap-1 text-xs text-muted-foreground/60 min-w-0", className)}
        title="This earlier lesson is no longer in your library"
      >
        {label}
      </p>
    )
  }
  return (
    <button
      type="button"
      onClick={follows.onOpen}
      className={cn(
        "flex items-center gap-1 text-xs text-primary hover:underline min-w-0 max-w-full text-left",
        className,
      )}
    >
      {label}
    </button>
  )
}
