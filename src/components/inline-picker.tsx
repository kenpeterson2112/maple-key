"use client"

import * as Popover from "@radix-ui/react-popover"
import { ChevronDown, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"

export interface PickerOption {
  value: string
  label: string
  /** Optional dot color (hex) — shown in trigger and dropdown for visual subject coding. */
  color?: string
}

interface InlinePickerProps {
  /** The current value (may be empty string for "any"). */
  value: string
  /** Visible label for the trigger when no value is set. */
  placeholder: string
  options: PickerOption[]
  onChange: (value: string) => void
  /** Optional: short label rendered before the value, e.g. "Grade ". */
  prefix?: string
  /** Disabled state — useful for chained pickers (e.g. strand depends on subject). */
  disabled?: boolean
  /** Optional aria label override. */
  ariaLabel?: string
  /**
   * Visual treatment.
   * - `sentence` (default): big underlined display text for the "I teach …" hero.
   * - `compact`: small, chip-sized text for the inline header filter cluster.
   */
  variant?: "sentence" | "compact"
}

export default function InlinePicker({
  value,
  placeholder,
  options,
  onChange,
  prefix,
  disabled,
  ariaLabel,
  variant = "sentence",
}: InlinePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const display = selected ? `${prefix ?? ""}${selected.label}` : placeholder
  const isCompact = variant === "compact"

  const stateClasses = disabled
    ? "cursor-not-allowed text-[#A8998E] opacity-60"
    : selected
      ? "text-[#8B4513] hover:bg-[#FFE5CC]"
      : "text-[#C65D3B] hover:bg-[#FFE5CC]"

  const triggerClasses = isCompact
    ? `group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tracking-tight transition-colors duration-200 ${stateClasses}`
    : `group inline-flex items-center gap-1 rounded-lg px-2 py-1 text-lg md:text-2xl font-semibold tracking-tight transition-colors duration-200 ${stateClasses} underline decoration-[#FF6B35]/35 decoration-1 underline-offset-4 hover:decoration-[#FF6B35]`

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? display}
          className={triggerClasses}
        >
          {selected?.color && (
            <span
              className={`inline-block rounded-full flex-shrink-0 ${isCompact ? "w-2 h-2" : "w-2.5 h-2.5"}`}
              style={{ backgroundColor: selected.color }}
            />
          )}
          <span>{display}</span>
          <ChevronDown
            size={isCompact ? 14 : 20}
            className={`text-[#C65D3B] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </Popover.Trigger>

      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild sideOffset={8} align="start">
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="z-[60] min-w-[220px] max-w-[320px] rounded-2xl border-2 border-[#E8D5C4] bg-white p-2 shadow-xl"
              >
                <div className="max-h-[300px] overflow-y-auto">
                  {options.map((opt) => {
                    const isSelected = opt.value === value
                    return (
                      <button
                        key={opt.value || "__any"}
                        onClick={() => {
                          onChange(opt.value)
                          setOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-base font-medium transition-colors duration-150 ${
                          isSelected
                            ? "bg-[#FFE5CC] text-[#8B4513]"
                            : "text-[#2C2C2C] hover:bg-[#FFF5ED]"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {opt.color && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: opt.color }}
                            />
                          )}
                          {opt.label}
                        </span>
                        {isSelected && <Check size={16} className="text-[#FF6B35]" strokeWidth={3} />}
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
