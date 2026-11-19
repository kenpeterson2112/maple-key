import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { ChevronDown, Settings } from "lucide-react"
import { withBasePath } from "@/lib/base-path"
import { SPACE_ITEMS } from "@/lib/nav-items"
import { contrast, mixOklab, parseOklch, type Oklch } from "./contrast"
import { CURRENT_PRIMARY, ORANGE_CANDIDATES, type OrangeCandidate, type PrimaryFamily } from "./orange-candidates"

// Stage 1 of the landing-page handoff: header mock-ups and softer-orange
// proposals, at #header-preview. Nothing here changes the real app. Every
// colour is a token from src/index.css (the orange candidates override the
// --primary family on their own panels), and every ratio on the page is
// computed from those tokens as they render.

const SUBJECTS = [
  { key: "math", label: "Math" },
  { key: "science", label: "Science" },
  { key: "language", label: "Language" },
  { key: "social", label: "Social Studies" },
  { key: "fsl", label: "FSL" },
  { key: "health", label: "Health & PE" },
  { key: "arts", label: "Arts" },
  { key: "history", label: "History" },
  { key: "geography", label: "Geography" },
] as const

type SubjectKey = (typeof SUBJECTS)[number]["key"]

const TOKEN_NAMES = ["background", "foreground", "card", "primary", ...SUBJECTS.map((s) => `subject-${s.key}`)]

type Mode = "light" | "dark"
type Tokens = Record<string, Oklch>

const MARK = { src: "/maple-key-mark.png", ratio: 320 / 202 }
const LOCKUP = { src: "/maple-key-logo.png", ratio: 785 / 673 }

interface Variant {
  id: string
  name: string
  summary: string
  /** How much of the subject colour goes into the bar (the rest is --background). */
  barPct: number
  barClass: string
  gapClass: string
  logo: "mark-word" | "lockup" | "mark"
  logoClass: string
  wordClass?: string
  specs: string[]
}

const VARIANTS: Variant[] = [
  {
    id: "1",
    name: "1 · Soft wash",
    summary: "A light wash of the subject colour. Small mark with the wordmark beside it, tight spacing.",
    barPct: 14,
    barClass: "h-16 px-6",
    gapClass: "gap-2",
    logo: "mark-word",
    logoClass: "h-8",
    wordClass: "text-lg",
    specs: ["Bar: 14% subject colour", "Height 64px", "Mark 32px, wordmark 18px", "8px between mark and wordmark", "Phones: mark only"],
  },
  {
    id: "2",
    name: "2 · Mid tone",
    summary: "A stronger bar with a bigger logo and more air around it.",
    barPct: 30,
    barClass: "h-16 px-8",
    gapClass: "gap-3",
    logo: "mark-word",
    logoClass: "h-10",
    wordClass: "text-2xl",
    specs: ["Bar: 30% subject colour", "Height 64px", "Mark 40px, wordmark 24px", "12px between mark and wordmark", "Phones: mark only"],
  },
  {
    id: "3",
    name: "3 · Stacked lockup",
    summary: "The full logo, wing over the wordmark, in a taller bar. The most brand-forward.",
    barPct: 20,
    barClass: "h-20 px-6",
    gapClass: "gap-3",
    logo: "lockup",
    logoClass: "h-16",
    specs: ["Bar: 20% subject colour", "Height 80px", "Lockup 64px tall", "Wordmark is part of the image"],
  },
  {
    id: "4",
    name: "4 · Mark only",
    summary: "The most colour, the least logo: just the wing, compact bar. Leaves room for the nav.",
    barPct: 42,
    barClass: "h-14 px-4",
    gapClass: "gap-1",
    logo: "mark",
    logoClass: "h-7",
    specs: ["Bar: 42% subject colour", "Height 56px", "Mark 28px, no wordmark", "Tightest spacing"],
  },
]

const barBackground = (colorVar: string, pct: number) => `color-mix(in oklab, ${colorVar} ${pct}%, var(--background))`

function familyVars(family: PrimaryFamily): CSSProperties {
  return Object.fromEntries(Object.entries(family).map(([k, v]) => [`--${k}`, v])) as CSSProperties
}

export default function HeaderPreview() {
  const [subject, setSubject] = useState<SubjectKey>("math")
  const [orangeId, setOrangeId] = useState<string>(ORANGE_CANDIDATES[0].id)
  const orange = [CURRENT_PRIMARY, ...ORANGE_CANDIDATES].find((o) => o.id === orangeId) ?? CURRENT_PRIMARY

  // This page shows both modes side by side, so the root stays light and each
  // dark panel scopes `.dark` to itself.
  useEffect(() => {
    document.documentElement.classList.remove("dark")
    document.title = "Header mock-ups · Maple Key"
  }, [])

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8 md:px-8 md:py-12">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-muted-foreground">Landing page handoff · Stage 1 · Preview only</p>
          <h1 className="text-3xl font-bold md:text-4xl">Header mock-ups</h1>
          <p className="max-w-3xl text-base text-muted-foreground">
            Four top bars with the logo sitting straight on the bar in one flat colour (dark in light mode, light in
            dark mode), and three softer oranges to replace the apple red. Every ratio below is worked out from the real
            tokens as they render. Body text needs 4.5:1.
          </p>
        </header>

        <Controls subject={subject} onSubject={setSubject} orangeId={orangeId} onOrange={setOrangeId} />

        <WhyNotFullFill />

        {VARIANTS.map((v) => (
          <VariantSection key={v.id} variant={v} subject={subject} orange={orange} />
        ))}

        <OrangeSection selectedId={orangeId} onSelect={setOrangeId} />
      </div>
    </div>
  )
}

function Controls({
  subject,
  onSubject,
  orangeId,
  onOrange,
}: {
  subject: SubjectKey
  onSubject: (s: SubjectKey) => void
  orangeId: string
  onOrange: (id: string) => void
}) {
  return (
    <div className="z-10 -mx-4 md:sticky md:top-0 flex flex-wrap items-end gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
        Subject in the big bars
        <select
          value={subject}
          onChange={(e) => onSubject(e.target.value as SubjectKey)}
          className="h-10 rounded-xl border border-border-strong bg-input px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SUBJECTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-xs font-semibold text-muted-foreground">Orange (no subject picked)</legend>
        <div className="flex flex-wrap gap-1.5">
          {[CURRENT_PRIMARY, ...ORANGE_CANDIDATES].map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={o.id === orangeId}
              onClick={() => onOrange(o.id)}
              className={`h-10 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                o.id === orangeId
                  ? "border-secondary bg-secondary-tint text-secondary-strong"
                  : "border-border-strong bg-card text-foreground hover:bg-muted"
              }`}
            >
              <span
                className="mr-2 inline-block size-3 rounded-full align-middle"
                style={{ background: o.light.primary }}
                aria-hidden="true"
              />
              {o.name.replace("Current: ", "")}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

/** A light or dark panel. Reads its own tokens back so the ratios are real. */
function ModePanel({
  mode,
  orange,
  children,
  className = "",
}: {
  mode: Mode
  orange: OrangeCandidate
  children: (tokens: Tokens | null) => ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [tokens, setTokens] = useState<Tokens | null>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    const style = getComputedStyle(ref.current)
    const out: Tokens = {}
    for (const name of TOKEN_NAMES) {
      const parsed = parseOklch(style.getPropertyValue(`--${name}`))
      if (parsed) out[name] = parsed
    }
    setTokens(out)
  }, [mode, orange])

  return (
    <div ref={ref} className={mode === "dark" ? "dark" : ""} style={familyVars(orange[mode])}>
      <div className={`flex flex-col gap-3 rounded-2xl border border-border bg-background p-3 text-foreground md:p-4 ${className}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{mode === "dark" ? "Dark mode" : "Light mode"}</p>
        {children(tokens)}
      </div>
    </div>
  )
}

function ratioFor(tokens: Tokens | null, colorToken: string, pct: number): number | null {
  const fill = tokens?.[colorToken]
  if (!tokens || !fill || !tokens.background || !tokens.foreground) return null
  return contrast(tokens.foreground, mixOklab(fill, tokens.background, pct))
}

function Verdict({ ratio }: { ratio: number | null }) {
  if (ratio === null) return <span className="text-xs text-muted-foreground">…</span>
  const pass = ratio >= 4.5
  const large = !pass && ratio >= 3
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
        pass ? "bg-success-tint text-success" : large ? "bg-pop-tint text-pop-strong" : "bg-destructive/10 text-destructive"
      }`}
    >
      {ratio.toFixed(2)}:1 {pass ? "AA" : large ? "logo only" : "fails"}
    </span>
  )
}

/** The logo as one flat colour: the PNG's alpha is a mask over currentColor. */
function FlatLogo({ kind, className }: { kind: "mark" | "lockup"; className: string }) {
  const img = kind === "mark" ? MARK : LOCKUP
  const url = `url(${withBasePath(img.src)})`
  return (
    <span
      className={`block flex-shrink-0 ${className}`}
      style={{
        aspectRatio: img.ratio,
        backgroundColor: "currentColor",
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
      aria-hidden="true"
    />
  )
}

function Logo({ variant }: { variant: Variant }) {
  return (
    <span className={`flex flex-shrink-0 items-center ${variant.gapClass}`} role="img" aria-label="Maple Key">
      <FlatLogo kind={variant.logo === "lockup" ? "lockup" : "mark"} className={variant.logoClass} />
      {variant.logo === "mark-word" && (
        <span className={`hidden whitespace-nowrap font-display font-bold leading-none @md:inline ${variant.wordClass}`} aria-hidden="true">
          Maple Key
        </span>
      )}
    </span>
  )
}

/** One mock top bar. `colorVar` is the subject's token, or --primary with none. */
function MockBar({ variant, colorVar, label }: { variant: Variant; colorVar: string; label: string }) {
  const pillText = colorVar === "var(--primary)" ? "var(--primary-strong)" : colorVar
  return (
    <div className="@container overflow-hidden rounded-xl">
      <div
        className={`flex items-center ${variant.barClass} gap-3 text-foreground`}
        style={{ background: barBackground(colorVar, variant.barPct) }}
      >
        <Logo variant={variant} />
        <div className="ml-1 hidden items-center gap-2 @xl:flex">
          <Pill color={pillText}>{label}</Pill>
          <Pill color={pillText}>Grade 5</Pill>
          <span className="hidden text-sm font-semibold @4xl:inline">Ontario</span>
        </div>
        <span
          className="ml-1 flex h-9 min-w-0 items-center gap-1 truncate rounded-full bg-card px-3 text-sm font-bold shadow-sm @xl:hidden"
          style={{ color: pillText }}
        >
          <span className="truncate">{label} · Grade 5</span>
          <ChevronDown size={14} aria-hidden="true" />
        </span>
        <nav className="ml-auto hidden items-center gap-1 @3xl:flex" aria-hidden="true">
          {SPACE_ITEMS.map((s, i) => (
            <span key={s.id} className={`rounded-lg px-2.5 py-1.5 text-sm font-semibold ${i === 0 ? "underline decoration-2 underline-offset-[6px]" : ""}`}>
              {s.label}
            </span>
          ))}
        </nav>
        <span className="ml-auto flex size-10 flex-shrink-0 items-center justify-center rounded-full @3xl:ml-0" aria-hidden="true">
          <Settings size={20} />
        </span>
      </div>
    </div>
  )
}

function Pill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-card pl-4 pr-3 text-sm font-bold shadow-sm" style={{ color }}>
      {children}
      <ChevronDown size={14} aria-hidden="true" />
    </span>
  )
}

/** Every subject at once: a small bar per subject with the logo and its ratio. */
function SubjectGrid({ tokens, pct, logo }: { tokens: Tokens | null; pct: number; logo: "mark" | "lockup" }) {
  return (
    <div className="@container">
    <ul className="grid grid-cols-1 gap-2 @lg:grid-cols-2 @4xl:grid-cols-3">
      {[{ key: "", label: "No subject (brand)" }, ...SUBJECTS].map((s) => {
        const token = s.key ? `subject-${s.key}` : "primary"
        return (
          <li key={s.key || "brand"} className="flex items-center gap-2 rounded-lg p-2 text-foreground" style={{ background: barBackground(`var(--${token})`, pct) }}>
            <FlatLogo kind={logo} className="h-6" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.label}</span>
            <span className="rounded-full bg-card px-0.5">
              <Verdict ratio={ratioFor(tokens, token, pct)} />
            </span>
          </li>
        )
      })}
    </ul>
    </div>
  )
}

function WhyNotFullFill() {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="why-full">
      <div className="flex flex-col gap-1">
        <h2 id="why-full" className="text-2xl font-bold">
          Why the bars are a mix, not the full subject colour
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Today the subject colours are deep in light mode (white text sits on them) and bright in dark mode (dark text
          sits on them). That's the opposite of a dark logo in light mode and a light logo in dark mode. At full strength,
          the logo fails on almost every subject. So each variant mixes the subject colour into the page background
          instead (in OKLab, so the hue stays true), which keeps the bar clearly in the subject's colour and the logo readable.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["light", "dark"] as const).map((mode) => (
          <ModePanel key={mode} mode={mode} orange={CURRENT_PRIMARY}>
            {(tokens) => <SubjectGrid tokens={tokens} pct={100} logo="mark" />}
          </ModePanel>
        ))}
      </div>
    </section>
  )
}

function VariantSection({ variant, subject, orange }: { variant: Variant; subject: SubjectKey; orange: OrangeCandidate }) {
  const subjectLabel = SUBJECTS.find((s) => s.key === subject)?.label ?? subject
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`variant-${variant.id}`}>
      <div className="flex flex-col gap-2">
        <h2 id={`variant-${variant.id}`} className="text-2xl font-bold">
          {variant.name}
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">{variant.summary}</p>
        <ul className="flex flex-wrap gap-1.5">
          {variant.specs.map((s) => (
            <li key={s} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {s}
            </li>
          ))}
        </ul>
      </div>
      {(["light", "dark"] as const).map((mode) => (
        <ModePanel key={mode} mode={mode} orange={orange}>
          {(tokens) => (
            <>
              <MockBar variant={variant} colorVar={`var(--subject-${subject})`} label={subjectLabel} />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                Logo and nav on {subjectLabel}: <Verdict ratio={ratioFor(tokens, `subject-${subject}`, variant.barPct)} />
              </div>
              <MockBar variant={variant} colorVar="var(--primary)" label="All subjects" />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                No subject picked ({orange.name.replace("Current: ", "")}): <Verdict ratio={ratioFor(tokens, "primary", variant.barPct)} />
              </div>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">Every subject at this strength</p>
              <SubjectGrid tokens={tokens} pct={variant.barPct} logo={variant.logo === "lockup" ? "lockup" : "mark"} />
            </>
          )}
        </ModePanel>
      ))}
    </section>
  )
}

const FAMILY_KEYS: (keyof PrimaryFamily)[] = ["primary", "primary-hover", "primary-strong", "primary-tint"]

function OrangeSection({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="oranges">
      <div className="flex flex-col gap-1">
        <h2 id="oranges" className="text-2xl font-bold">
          Softer orange for <code className="font-mono text-xl">--primary</code>
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          The red-orange is the <code className="font-mono">--primary</code> family in <code className="font-mono">src/index.css</code>{" "}
          (apple red, <code className="font-mono">#D93A26</code> / dark <code className="font-mono">#FF5A43</code>). Each option
          replaces all four of its tokens in both modes and keeps the contract: white text on the fill, and the fill
          readable as text on the page. All three pass every pair in <code className="font-mono">pnpm check:contrast</code>.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[CURRENT_PRIMARY, ...ORANGE_CANDIDATES].map((o) => (
          <article
            key={o.id}
            className={`flex flex-col gap-3 rounded-2xl border bg-card p-4 ${o.id === selectedId ? "border-secondary ring-2 ring-ring" : "border-border"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold">{o.name}</h3>
                <p className="text-sm text-muted-foreground">{o.blurb}</p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(o.id)}
                aria-pressed={o.id === selectedId}
                className="flex-shrink-0 rounded-full border border-border-strong px-3 py-1.5 text-xs font-semibold text-secondary-strong hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {o.id === selectedId ? "In the bars" : "Try in the bars"}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["light", "dark"] as const).map((mode) => (
                <ModePanel key={mode} mode={mode} orange={o} className="!gap-2">
                  {() => <OrangeSample orange={o} mode={mode} />}
                </ModePanel>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function OrangeSample({ orange, mode }: { orange: OrangeCandidate; mode: Mode }) {
  const values = orange[mode]
  const hex = orange.hex[mode]
  const tint = parseOklch(values["primary-tint"])
  const strong = parseOklch(values["primary-strong"])
  const ratio = tint && strong ? contrast(strong, tint) : null
  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        {FAMILY_KEYS.map((k) => (
          <div key={k} className="flex flex-col gap-1">
            <span className="h-8 rounded-md border border-border" style={{ background: `var(--${k})` }} />
            <span className="text-xs text-muted-foreground">
              {k.replace("primary-", "") === "primary" ? "fill" : k.replace("primary-", "")}{" "}
              <span className="font-mono">{hex[k]}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">Generate lesson</span>
        <span className="rounded-full bg-primary-tint px-2.5 py-1 text-xs font-semibold text-primary-strong">Selected</span>
        <span className="text-sm font-semibold text-primary">Link text</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Red text on its tint: {ratio ? `${ratio.toFixed(2)}:1` : "…"}
      </p>
    </>
  )
}
