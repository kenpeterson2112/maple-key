"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

/**
 * Whimsical-but-honest progress lines shown while the lesson generates.
 * Generation takes ~30–60s, so we interleave real steps ("reviewing
 * curriculum") with self-aware teacher humor ("is it summer yet?"). One line
 * surfaces roughly every 5s; we hold on the final reassurance line rather than
 * looping, since generation almost always finishes before the list runs out.
 */
const BUILD_MESSAGES = [
  "Reviewing your curriculum expectations…",
  "Taking a sip of coffee…",
  "Reading through your selected resources…",
  "Factoring in where your class is at…",
  "Resisting the urge to make one more anchor chart…",
  "Differentiating the activities…",
  "Sweet-talking the photocopier…",
  "Lining up materials and prep…",
  "Is it summer yet?…",
  "Balancing the lesson timing…",
  "Writing a quick formative check…",
  "Pretending we didn't hear the recess bell…",
  "Adding the finishing touches…",
  "Almost there…",
]

const MESSAGE_MS = 5000

/** Stylized maple key (samara) — the brand mark, drawn inline so we can flip
 *  it and flutter small copies. Color comes from `currentColor`. */
function MapleKeyIcon({ className, style }: { className?: string; style?: CSSProperties }) {
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

/** Stable per-key flutter config so the descending keys don't reshuffle on
 *  every render. Spread across the width with varied size/speed/spin. */
const FLUTTER_KEYS = [
  { left: 8, size: 26, duration: 11, delay: 0, sway: 18, spin: 60, opacity: 0.5 },
  { left: 22, size: 18, duration: 14, delay: 1.5, sway: 14, spin: -40, opacity: 0.35 },
  { left: 35, size: 32, duration: 9.5, delay: 0.6, sway: 22, spin: 90, opacity: 0.55 },
  { left: 48, size: 16, duration: 13, delay: 2.4, sway: 12, spin: -70, opacity: 0.3 },
  { left: 60, size: 28, duration: 10.5, delay: 0.2, sway: 20, spin: 50, opacity: 0.5 },
  { left: 72, size: 20, duration: 12.5, delay: 1.1, sway: 16, spin: -55, opacity: 0.4 },
  { left: 85, size: 30, duration: 10, delay: 2.0, sway: 24, spin: 80, opacity: 0.5 },
  { left: 92, size: 15, duration: 13.5, delay: 0.9, sway: 10, spin: -35, opacity: 0.3 },
  { left: 15, size: 22, duration: 12, delay: 3.0, sway: 18, spin: 65, opacity: 0.4 },
]

export default function LessonBuildingLoader() {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(640)

  // Advance the message every ~5s, holding on the final reassurance line.
  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i < BUILD_MESSAGES.length - 1 ? i + 1 : i))
    }, MESSAGE_MS)
    return () => window.clearInterval(id)
  }, [])

  // Measure available height so fluttering keys fall the full distance.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setHeight(el.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Each message change triggers a full flip, alternating axis for variety:
  // odd steps spin around the vertical axis, even steps around the horizontal.
  const rotateY = Math.ceil(index / 2) * 360
  const rotateX = Math.floor(index / 2) * 360

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      {/* Maple keys fluttering down behind the message */}
      {!reduceMotion && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {FLUTTER_KEYS.map((k, i) => (
            <motion.div
              key={i}
              className="absolute top-0 text-primary"
              style={{ left: `${k.left}%` }}
              initial={{ y: -40, opacity: 0 }}
              animate={{
                y: [-40, height + 40],
                x: [0, k.sway, -k.sway, k.sway * 0.4, 0],
                rotate: [0, k.spin],
                opacity: [0, k.opacity, k.opacity, 0],
              }}
              transition={{
                duration: k.duration,
                delay: k.delay,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <MapleKeyIcon style={{ width: k.size, height: k.size }} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Maple key logo — a gentle bob, plus a flip on each new message */}
      <motion.div
        className="relative z-10"
        animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div style={{ perspective: 700 }}>
          <motion.div
            style={{ transformStyle: "preserve-3d" }}
            animate={reduceMotion ? undefined : { rotateX, rotateY }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          >
            <MapleKeyIcon className="h-16 w-16 text-primary drop-shadow-sm" />
          </motion.div>
        </div>
      </motion.div>

      {/* Cycling whimsical message */}
      <div
        className="relative z-10 mt-8 flex min-h-14 max-w-sm items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-lg font-semibold text-foreground"
          >
            {BUILD_MESSAGES[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Persistent reassurance — sets the time expectation teachers were missing */}
      <p className="relative z-10 mt-1 text-sm text-muted-foreground">
        Building your lesson — this usually takes 30–60 seconds.
      </p>

      {/* Indeterminate progress shimmer */}
      <div className="relative z-10 mt-7 h-1.5 w-44 overflow-hidden rounded-full bg-primary/15">
        {reduceMotion ? (
          <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary/60" />
        ) : (
          <motion.div
            className="absolute inset-y-0 w-1/3 rounded-full bg-primary/60"
            animate={{ x: ["-110%", "320%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
    </div>
  )
}
