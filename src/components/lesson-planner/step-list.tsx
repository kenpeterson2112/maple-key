import { splitLessonLines } from "../../../shared/lesson-lines"
import { cn } from "@/lib/utils"

/**
 * A lesson stage's steps, one short line each. A lesson saved before step lists
 * holds a single paragraph, which renders as a paragraph rather than a
 * one-bullet list.
 */
export default function StepList({ text, className }: { text: string; className?: string }) {
  const lines = splitLessonLines(text)
  if (lines.length === 0) return null
  if (lines.length === 1) return <p className={cn("leading-relaxed", className)}>{lines[0]}</p>
  return (
    <ul className={cn("list-disc space-y-2 pl-5 marker:text-muted-foreground", className)}>
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  )
}
