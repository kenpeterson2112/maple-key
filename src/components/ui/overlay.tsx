import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useFocusTrap } from "@/lib/use-focus-trap"

// A modal overlay for the hand-rolled dialogs (Radix ones use their own
// portal). It renders into <body>, so a dialog opened from inside a space
// still covers the top nav and tab bar: a space sits in a z-10 layer under
// the z-50 nav, which hid any fixed overlay drawn there. The backdrop pads
// the safe areas (`overlay-pad`); give the panel `max-h-dialog` and its own
// scroll. Escape closes it, and focus stays inside it while it's open
// (useFocusTrap), returning to whatever opened it.

export default function Overlay({
  onClose,
  labelledBy,
  closeOnBackdrop = false,
  z = "z-[200]",
  children,
}: {
  onClose: () => void
  /** id of the dialog's title. */
  labelledBy?: string
  /** Forms keep what's typed: a stray tap outside doesn't close them by default. */
  closeOnBackdrop?: boolean
  /** Stacking order class, for a dialog that opens over another. */
  z?: string
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return createPortal(
    <div
      className={`fixed inset-0 ${z} flex items-center justify-center bg-black/50 overlay-pad`}
      onClick={closeOnBackdrop ? (e) => e.target === e.currentTarget && onClose() : undefined}
    >
      {/* Clicks beside the panel fall through to the backdrop. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="pointer-events-none flex w-full justify-center outline-none [&>*]:pointer-events-auto"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
