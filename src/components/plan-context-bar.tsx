"use client"

import { useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Building2 } from "lucide-react"
import type { PickerOption } from "@/components/inline-picker"
import { GRADES, SUBJECTS, PROVINCES } from "@/components/hero-personalize"
import { getStrandOptions } from "@/lib/get-strand-options"
import type { Filters } from "@/lib/types"

interface PlanContextBarProps {
  filters: Filters
  setFilters: (filters: Filters) => void
}

export default function PlanContextBar({ filters, setFilters }: PlanContextBarProps) {
  const primaryGrade = (filters.grade || "").split(",").filter(Boolean)[0] ?? ""
  const strandOptions: PickerOption[] = filters.subject
    ? getStrandOptions(filters.subject, primaryGrade).map((o) => (o.value === "" ? { ...o, label: "Any strand" } : o))
    : [{ value: "", label: "Any strand" }]
  const provinceLabel = PROVINCES.find((p) => p.value === filters.province)?.label ?? "Any province"

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <ChipPicker
        value={filters.province || ""}
        options={PROVINCES.map((p) => (p.value === "" ? { ...p, label: "Any province" } : p))}
        onChange={(v) => setFilters({ ...filters, province: v })}
        ariaLabel={`Change province, currently ${provinceLabel}`}
        display={filters.province ? provinceLabel : "Any province"}
        variant="solid"
      />
      <ChipPicker
        value={primaryGrade}
        options={GRADES.map((g) => (g.value === "" ? { ...g, label: "Any grade" } : g))}
        onChange={(v) => setFilters({ ...filters, grade: v })}
        ariaLabel={`Change grade, currently ${primaryGrade ? `Grade ${primaryGrade}` : "any grade"}`}
        display={primaryGrade ? `Grade ${primaryGrade}` : "Any grade"}
        variant="solid"
      />
      <ChipPicker
        value={filters.subject || ""}
        options={SUBJECTS.map((s) => (s.value === "" ? { ...s, label: "Any subject" } : s))}
        onChange={(v) => setFilters({ ...filters, subject: v, strand: "" })}
        ariaLabel={`Change subject, currently ${filters.subject || "any subject"}`}
        display={filters.subject || "Any subject"}
        variant="solid"
      />
      <ChipPicker
        value={filters.strand || ""}
        options={strandOptions}
        onChange={(v) => setFilters({ ...filters, strand: v })}
        ariaLabel={`Filter by strand, currently ${filters.strand || "any strand"}. Optional.`}
        display={filters.strand || "Any strand"}
        variant={filters.strand ? "outline-set" : "outline"}
      />
      <TopicInput value={filters.topic || ""} onChange={(v) => setFilters({ ...filters, topic: v })} />
      <DistrictBadge />
    </div>
  )
}

function ChipPicker({
  value,
  options,
  onChange,
  ariaLabel,
  display,
  variant,
}: {
  value: string
  options: PickerOption[]
  onChange: (value: string) => void
  ariaLabel: string
  display: string
  variant: "solid" | "outline" | "outline-set"
}) {
  const [open, setOpen] = useState(false)

  const baseClasses = "inline-flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
  const variantClasses =
    variant === "solid"
      ? "bg-primary-tint text-primary-strong hover:bg-primary-tint"
      : variant === "outline-set"
        ? "border border-border-strong text-foreground hover:border-primary hover:text-primary"
        : "border border-dashed border-border-strong text-muted-foreground hover:border-primary hover:text-primary"

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" aria-label={ariaLabel} aria-haspopup="listbox" className={`${baseClasses} ${variantClasses}`}>
          <span>{display}</span>
          <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild sideOffset={6} align="start">
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                role="listbox"
                className="z-[60] min-w-[200px] max-w-[280px] rounded-2xl border-2 border-border bg-card p-2 shadow-xl"
              >
                <div className="max-h-[280px] overflow-y-auto">
                  {options.map((opt) => {
                    const isSelected = opt.value === value
                    return (
                      <button
                        key={opt.value || "__any"}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onChange(opt.value)
                          setOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ${
                          isSelected ? "bg-primary-tint text-primary-strong" : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  )
}

// Free-text topic hint. Unlike the chips it never narrows the resource set —
// it's a soft ranking signal (see topicScore in use-filtered-resources.ts), so
// a typo or off-list phrase just means no boost, never an empty list.
function TopicInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Topic (e.g. fractions)"
      aria-label="Topic you're teaching (optional)"
      className="inline-flex h-[34px] w-40 flex-shrink-0 rounded-full border border-dashed border-border-strong bg-transparent px-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
    />
  )
}

function DistrictBadge() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="District settings active — tap for details"
          className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-secondary-strong transition-colors hover:bg-secondary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <Building2 size={16} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="z-[60] w-60 rounded-xl border border-secondary/40 bg-card p-3 text-xs leading-relaxed text-foreground shadow-xl"
        >
          <p className="mb-1 font-semibold">District Settings Active</p>
          <p>
            Lesson planning is aligned to your district's approved pedagogical frameworks and instructional
            standards.
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
