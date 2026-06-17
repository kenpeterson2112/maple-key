import type { CSSProperties } from "react"

/** Stylized maple key (samara) — the Maple Key brand mark, drawn inline so it
 *  scales crisply and inherits its color from `currentColor`. Shared by the
 *  lesson-building loader and the suggested-resources header. */
export default function MapleKeyIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} style={style} aria-hidden="true">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* wing */}
        <path d="M18 46 C 9 28, 27 8, 54 12 C 46 31, 33 44, 18 46 Z" strokeWidth={3.5} />
        {/* veins */}
        <path d="M21 43 C 27 31, 38 21, 50 16" strokeWidth={2} opacity={0.7} />
        <path d="M24 45 C 31 35, 41 27, 52 20" strokeWidth={2} opacity={0.5} />
      </g>
      {/* seed pod */}
      <circle cx="16" cy="47" r="7" fill="currentColor" />
    </svg>
  )
}
