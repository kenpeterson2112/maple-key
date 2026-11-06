"use client"

import { useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronDown, CornerDownRight, X } from "lucide-react"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import { cn } from "@/lib/utils"

interface PreviousLessonPickerProps {
  /** Saved lessons to choose from, newest first. */
  lessons: LessonMetadata[]
  selected: LessonMetadata | null
  onSelect: (lesson: LessonMetadata | null) => void
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function lessonMeta(l: LessonMetadata): string {
  return [formatDate(l.timestamp), l.grade ? `Grade ${l.grade}` : null, l.subject || null]
    .filter(Boolean)
    .join(" · ")
}

/**
 * The one place a teacher chooses which earlier lesson a new plan builds on.
 * Empty: a plainly-worded optional prompt. Chosen: "Continuing from <title>"
 * with Change and a clear ×. Both states open the same list.
 */
export default function PreviousLessonPicker({ lessons, selected, onSelect }: PreviousLessonPickerProps) {
  const [open, setOpen] = useState(false)
  const choose = (l: LessonMetadata | null) => {
    onSelect(l)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border px-3 py-2.5",
          selected ? "border-primary/40 bg-primary/5" : "border-border border-dashed bg-card",
        )}
      >
        <CornerDownRight size={18} className="text-primary flex-shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          {selected ? (
            <>
              {/* The title wraps rather than truncates: it's the thing to confirm. */}
              <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                Continuing from: <span className="font-semibold text-foreground">{selected.title || "Untitled lesson"}</span>
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {lessonMeta(selected)}
                <span className="hidden sm:inline"> · The new lesson picks up where this one left off.</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">
                Build on a previous lesson? <span className="font-normal text-muted-foreground">(optional)</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Pick one you've taught and the new lesson will pick up where it left off.
              </p>
            </>
          )}
        </div>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
          >
            {selected ? "Change" : "Choose a lesson"}
            <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
          </button>
        </Popover.Trigger>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="p-1 rounded-full text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
            aria-label="Start fresh instead"
            title="Start fresh instead"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild sideOffset={8} align="end" collisionPadding={16}>
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="z-[60] w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover text-popover-foreground p-2 shadow-xl"
              >
                <p className="px-2 pt-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Which lesson are you following on from?
                </p>
                <div className="max-h-80 overflow-y-auto space-y-0.5">
                  <PickerRow
                    title="Start fresh"
                    meta="Don't build on a previous lesson"
                    isSelected={!selected}
                    onClick={() => choose(null)}
                  />
                  {lessons.map((l) => (
                    <PickerRow
                      key={l.id}
                      title={l.title || "Untitled lesson"}
                      meta={lessonMeta(l)}
                      isSelected={selected?.id === l.id}
                      onClick={() => choose(l)}
                    />
                  ))}
                </div>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  )
}

function PickerRow({
  title,
  meta,
  isSelected,
  onClick,
}: {
  title: string
  meta: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
        isSelected ? "bg-primary/10" : "hover:bg-muted/60",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground truncate">{title}</span>
        <span className="block text-xs text-muted-foreground truncate">{meta}</span>
      </span>
      {isSelected && <Check size={16} className="text-primary flex-shrink-0" strokeWidth={3} />}
    </button>
  )
}
