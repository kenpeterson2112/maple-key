import { useEffect, type RefObject } from "react"

// Keeps keyboard focus inside a modal while it's open (WCAG 2.4.3, and what
// aria-modal promises): focus moves to the dialog on open, Tab and Shift+Tab
// wrap within it, and focus returns to whatever opened it on close.
//
// The dialog element itself takes the first focus (give it tabIndex={-1}), so
// a screen reader starts at its title and no control shows a ring until the
// teacher presses Tab. A control that's already focused inside (autoFocus)
// keeps it. Focus inside a Radix popover is left alone: those portal outside
// the dialog's DOM.

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

const inPopover = (el: Element | null) => !!el?.closest("[data-radix-popper-content-wrapper]")

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active = true): void {
  useEffect(() => {
    if (!active) return
    const root = ref.current
    if (!root) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null

    if (!root.contains(document.activeElement)) root.focus({ preventScroll: true })

    const focusables = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.closest("[inert], [aria-hidden='true']") && el.getClientRects().length > 0,
      )

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      const current = document.activeElement
      if (inPopover(current)) return
      const list = focusables()
      if (list.length === 0) {
        e.preventDefault()
        root.focus()
        return
      }
      const first = list[0]
      const last = list[list.length - 1]
      const outside = !root.contains(current)
      if (e.shiftKey && (outside || current === first || current === root)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (outside || current === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      if (opener && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [ref, active])
}
