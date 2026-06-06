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
  POOL_SIZE,
  MIN_QUANTITY,
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
  const [quantity, setQuantity] = useState(Math.min(POOL_SIZE, 12))
  const [level, setLevel] = useState<CentralLevel>(3)
  const [spread, setSpread] = useState(0.25)

  const switchMode = (on: boolean) => {
    if (on === sandbox) return
    setSandboxMode(on)
    setSandbox(on)
    onChanged() // re-read whichever store is now active
  }

  const handleGenerate = () => {
    if (scope.kind === "global") seedGlobal({ quantity, level, spread })
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
              ? "border-[#FF6B35] bg-[#FFE5CC] text-[#C65D3B]"
              : "border-dashed border-[#C8B6A6] bg-white/70 text-[#8B7355] hover:border-[#FF6B35] hover:text-[#C65D3B]"
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
                className="z-[100] w-72 rounded-2xl border-2 border-[#E8D5C4] bg-white p-4 shadow-xl"
              >
                <div className="mb-3 flex items-center gap-1.5">
                  <FlaskConical size={14} className="text-[#C65D3B]" />
                  <p className="text-xs font-bold text-[#2C2C2C]">Sample data</p>
                  <span className="ml-auto rounded-full bg-[#FFE5CC] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#C65D3B]">
                    Dev
                  </span>
                </div>

                {/* Data-source toggle: real localStorage vs. the sample-data sandbox */}
                <div className="mb-1.5 text-[11px] font-semibold text-[#8B4513]">Data source</div>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-[#E8D5C4] bg-[#FAF3E0] p-0.5">
                  <button
                    type="button"
                    onClick={() => switchMode(false)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      !sandbox ? "bg-white text-[#2C2C2C] shadow-sm" : "text-[#888] hover:text-[#2C2C2C]"
                    }`}
                  >
                    <Database size={12} />
                    Actual
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode(true)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      sandbox ? "bg-[#FF6B35] text-white shadow-sm" : "text-[#888] hover:text-[#2C2C2C]"
                    }`}
                  >
                    <FlaskConical size={12} />
                    Sandbox
                  </button>
                </div>
                <p className="mb-3 mt-2 text-[10px] leading-snug text-[#888]">
                  {sandbox
                    ? "Showing a sandbox of sample data. Your real data is untouched — flip to Actual to return to it."
                    : "Showing your real saved data. Switch to Sandbox to generate and explore sample data safely."}
                </p>

                {sandbox && (
                  <>
                    {scope.kind === "global" && (
                      <SliderRow
                        label="Quantity"
                        display={`${quantity} expectations`}
                        min={MIN_QUANTITY}
                        max={POOL_SIZE}
                        step={1}
                        value={quantity}
                        onChange={setQuantity}
                      />
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
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#C65D3B] px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md"
                      >
                        <Wand2 size={13} />
                        Generate
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E8D5C4] px-3 py-2 text-xs font-semibold text-[#888] transition-colors hover:bg-[#FAF3E0] hover:text-[#C65D3B]"
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
        <span className="text-[11px] font-semibold text-[#8B4513]">{label}</span>
        <span className="text-[11px] font-medium text-[#888]">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-[#FF6B35]"
      />
    </div>
  )
}
