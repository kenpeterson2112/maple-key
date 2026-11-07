"use client"

// "Dev data" control — toggles between your real localStorage data and a separate
// sandbox of generated sample data, and (in sandbox) generates/resets that sample
// data. Flipping to the sandbox never mutates real data; flip back to return to it.
// Intentionally rendered in all builds (including production) for now; see
// src/lib/dev-seed.ts and the sandbox seam in src/lib/assessment-results.ts.

import { useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { AnimatePresence, motion } from "framer-motion"
import { FlaskConical, Wand2, Trash2, Database } from "lucide-react"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import { isSandboxMode, setSandboxMode } from "@/lib/assessment-results"
import {
  seedGlobal,
  seedForLesson,
  seedForLessons,
  resetGlobal,
  resetLesson,
  resetLessons,
  MIN_POSITION,
  MAX_POSITION,
  SANDBOX_SUBJECTS,
  type CentralLevel,
} from "@/lib/dev-seed"

export type DevSeedScope =
  | { kind: "global" }
  | { kind: "lesson"; lesson: LessonMetadata }
  | { kind: "lessons"; lessons: LessonMetadata[] }

const LEVEL_LABELS: Record<CentralLevel, string> = {
  1: "Needs attention",
  2: "Developing",
  3: "Strong",
  4: "Excelling",
}

export default function DevSeedControl({ scope, onChanged }: { scope: DevSeedScope; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [sandbox, setSandbox] = useState(() => isSandboxMode())
  const [subject, setSubject] = useState("all")
  const [position, setPosition] = useState(0.4)
  const [level, setLevel] = useState<CentralLevel>(3)
  const [spread, setSpread] = useState(0.25)

  const switchMode = (on: boolean) => {
    if (on === sandbox) return
    setSandboxMode(on)
    setSandbox(on)
    onChanged() // re-read whichever store is now active
  }

  const handleGenerate = () => {
    if (scope.kind === "global") seedGlobal({ position, level, spread, scope: subject === "all" ? undefined : { subject } })
    else if (scope.kind === "lesson") seedForLesson(scope.lesson, { level, spread })
    else seedForLessons(scope.lessons, { level, spread })
    onChanged()
  }

  const handleReset = () => {
    if (scope.kind === "global") resetGlobal()
    else if (scope.kind === "lesson") resetLesson(scope.lesson.id)
    else resetLessons(scope.lessons)
    onChanged()
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
            sandbox
              ? "border-primary bg-primary-tint text-primary-strong"
              : "border-dashed border-border-strong bg-card/70 text-muted-foreground hover:border-primary hover:text-primary-strong"
          }`}
          title="Sample-data sandbox: generate fake data, or flip back to your real data"
        >
          <FlaskConical size={13} />
          {sandbox ? "Sandbox ON" : "Dev data"}
        </button>
      </Popover.Trigger>

      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild sideOffset={8} align="end">
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="z-[100] w-72 rounded-2xl border-2 border-border bg-card p-4 shadow-xl"
              >
                <div className="mb-3 flex items-center gap-1.5">
                  <FlaskConical size={14} className="text-primary-strong" />
                  <p className="text-xs font-bold text-foreground">Sample data</p>
                  <span className="ml-auto rounded-full bg-primary-tint px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-strong">
                    Dev
                  </span>
                </div>

                {/* Data-source toggle: real localStorage vs. the sample-data sandbox */}
                <div className="mb-1.5 text-[11px] font-semibold text-foreground">Data source</div>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted p-0.5">
                  <button
                    type="button"
                    onClick={() => switchMode(false)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      !sandbox ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Database size={12} />
                    Actual
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode(true)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      sandbox ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FlaskConical size={12} />
                    Sandbox
                  </button>
                </div>
                <p className="mb-3 mt-2 text-[10px] leading-snug text-muted-foreground">
                  {sandbox
                    ? "Showing a sandbox of sample data. Your real data is untouched — flip to Actual to return to it."
                    : "Showing your real saved data. Switch to Sandbox to generate and explore sample data safely."}
                </p>

                {sandbox && (
                  <>
                    {scope.kind === "global" && (
                      <>
                        <div className="mb-3">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-foreground">Subject</span>
                          </div>
                          <select
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] text-foreground"
                          >
                            <option value="all">All subjects</option>
                            {SANDBOX_SUBJECTS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>

                        <SliderRow
                          label="Curriculum progress"
                          display={`${Math.round(position * 100)}% through`}
                          min={MIN_POSITION}
                          max={MAX_POSITION}
                          step={0.05}
                          value={position}
                          onChange={setPosition}
                        />
                      </>
                    )}

                    <SliderRow
                      label="Central tendency"
                      display={`L${level} · ${LEVEL_LABELS[level]}`}
                      min={1}
                      max={4}
                      step={1}
                      value={level}
                      onChange={(v) => setLevel(v as CentralLevel)}
                    />

                    <SliderRow
                      label="Spread"
                      display={spread <= 0.1 ? "Tight" : spread >= 0.9 ? "Random" : `${Math.round(spread * 100)}%`}
                      min={0}
                      max={1}
                      step={0.05}
                      value={spread}
                      onChange={setSpread}
                    />

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerate}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md"
                      >
                        <Wand2 size={13} />
                        Generate
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-primary-strong"
                        title="Clear the sandbox"
                      >
                        <Trash2 size={13} />
                        Reset
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  )
}

function SliderRow({
  label,
  display,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  display: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-foreground">{label}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-primary"
      />
    </div>
  )
}
