import { type ReactNode } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// A sheet that slides up from the bottom of the screen: the phone pattern for
// menus and filters. Radix Dialog gives the focus trap, Escape and aria; Framer
// gives the slide. It closes on backdrop tap, Escape, the close button, or a
// swipe down on the handle and header. The swipe starts only there, so
// scrolling the body never drags the sheet.

const CLOSE_DISTANCE = 100 // px dragged down
const CLOSE_VELOCITY = 500 // px/s flick

export function BottomSheet({
  open,
  onOpenChange,
  title,
  titleAddon,
  description,
  footer,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  /** Rendered beside the title, e.g. a count badge. */
  titleAddon?: ReactNode
  /** Screen-reader description; visually hidden. */
  description?: string
  /** Pinned below the scrolling body, e.g. the primary action. */
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  const drag = useDragControls()
  const reduceMotion = useReducedMotion()
  const slide = reduceMotion ? { duration: 0 } : { type: "spring" as const, damping: 34, stiffness: 340 }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > CLOSE_DISTANCE || info.velocity.y > CLOSE_VELOCITY) onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              {...(description ? {} : { "aria-describedby": undefined })}
            >
              <motion.div
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-3xl border-t border-border bg-card text-card-foreground shadow-2xl pb-[env(safe-area-inset-bottom)] focus:outline-none",
                  className,
                )}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={slide}
                drag="y"
                dragListener={false}
                dragControls={drag}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.7 }}
                onDragEnd={onDragEnd}
              >
                {/* Handle + header: the drag zone */}
                <div className="shrink-0 cursor-grab touch-none select-none" onPointerDown={(e) => drag.start(e)}>
                  <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-border-strong" aria-hidden="true" />
                  <div className="flex items-center gap-2 px-5 pb-3 pt-3">
                    <Dialog.Title className="text-lg font-bold text-foreground">{title}</Dialog.Title>
                    {titleAddon}
                    <Dialog.Close
                      className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Close"
                    >
                      <X size={20} aria-hidden="true" />
                    </Dialog.Close>
                  </div>
                  {description && <Dialog.Description className="sr-only">{description}</Dialog.Description>}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border">{children}</div>

                {footer && <div className="shrink-0 border-t border-border p-4">{footer}</div>}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
