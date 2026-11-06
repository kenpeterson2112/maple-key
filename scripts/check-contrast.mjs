#!/usr/bin/env node
// WCAG contrast check for the design tokens in src/index.css.
//
// Reads the :root (light) and .dark blocks, resolves var() aliases, converts
// each OKLCH value to sRGB, and checks every foreground/background pairing the
// design system allows (see CLAUDE.md, "Color tokens"). It also checks that the
// hex in each token's trailing comment still matches its OKLCH value, so the
// comments can't drift from what renders.
//
//   node scripts/check-contrast.mjs          table of every pair, exit 1 on a failure
//   node scripts/check-contrast.mjs --quiet  print failures only
//
// AA thresholds: 4.5:1 for text, 3:1 for UI parts (focus rings, indicators,
// outline borders). The --signal-* assessment scale is out of scope: it carries
// meaning and stays fixed, so it is not tuned here.

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const CSS_PATH = fileURLToPath(new URL("../src/index.css", import.meta.url))
const quiet = process.argv.includes("--quiet")

const TEXT = 4.5
const UI = 3

const LIGHT_SURFACES = ["background", "card", "muted", "popover"]
const TINTS = ["primary-tint", "secondary-tint", "pop-tint"]

// [foreground token, background tokens, minimum ratio, what the pair is for]
const PAIRS = [
  ["foreground", [...LIGHT_SURFACES, ...TINTS], TEXT, "body text"],
  ["card-foreground", ["card"], TEXT, "text on cards"],
  ["popover-foreground", ["popover"], TEXT, "text in popovers"],
  ["muted-foreground", [...LIGHT_SURFACES, ...TINTS], TEXT, "secondary text"],
  ["primary-foreground", ["primary", "primary-hover"], TEXT, "primary button label"],
  ["primary", ["background", "card"], TEXT, "red text on page or card"],
  ["primary-strong", [...LIGHT_SURFACES, ...TINTS], TEXT, "red text on tints and muted"],
  ["secondary-foreground", ["secondary"], TEXT, "text on a teal fill"],
  ["secondary-strong", [...LIGHT_SURFACES, ...TINTS], TEXT, "teal text and links"],
  ["accent-foreground", ["accent"], TEXT, "accent text"],
  ["pop-foreground", ["pop"], TEXT, "text on goldenrod"],
  ["pop-strong", [...LIGHT_SURFACES, ...TINTS], TEXT, "goldenrod-family text"],
  ["destructive", [...LIGHT_SURFACES], TEXT, "error text"],
  ["destructive-foreground", ["destructive"], TEXT, "destructive button label"],
  ["ring", [...LIGHT_SURFACES, ...TINTS], UI, "focus ring"],
  ["secondary", ["background", "card", "muted"], UI, "teal indicator / outline"],
  ["primary", ["muted"], UI, "red fill on muted"],
]

// Reported for information only. Borders are decorative (cards, dividers) and
// goldenrod is "pop only", so neither may be the sole carrier of meaning.
const INFO = [
  ["border", ["background", "card"], "decorative border"],
  ["border-strong", ["background", "card"], "stronger divider"],
  ["pop", ["background", "card"], "goldenrod dot / badge fill"],
]

// ---------------------------------------------------------------------------

function block(css, selector) {
  const start = css.search(new RegExp(`(^|\\n)${selector.replace(".", "\\.")}\\s*\\{`))
  if (start < 0) throw new Error(`No ${selector} block in ${CSS_PATH}`)
  const open = css.indexOf("{", start)
  const close = css.indexOf("\n}", open)
  return css.slice(open + 1, close)
}

function tokens(body) {
  const out = {}
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*--([\w-]+):\s*([^;]+);\s*(?:\/\*\s*(#[0-9A-Fa-f]{6})?)?/)
    if (m) out[m[1]] = { value: m[2].trim(), commentHex: m[3]?.toUpperCase() }
  }
  return out
}

function resolve(map, name, seen = new Set()) {
  const tok = map[name]
  if (!tok) throw new Error(`Unknown token --${name}`)
  const ref = tok.value.match(/^var\(--([\w-]+)\)$/)
  if (!ref) return tok.value
  if (seen.has(name)) throw new Error(`Cycle at --${name}`)
  seen.add(name)
  return resolve(map, ref[1], seen)
}

function oklchToRgb(value) {
  const m = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/)
  if (!m) throw new Error(`Not a plain oklch() value: ${value}`)
  const [L, C, H] = m.slice(1).map(Number)
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ]
  return lin.map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
    return Math.max(0, Math.min(255, Math.round(v * 255)))
  })
}

const hex = (rgb) => "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()

function luminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// ---------------------------------------------------------------------------

const css = readFileSync(CSS_PATH, "utf8")
const light = tokens(block(css, ":root"))
const modes = { light, dark: { ...light, ...tokens(block(css, ".dark")) } }

let failures = 0
const log = (s) => !quiet && console.log(s)

for (const [mode, map] of Object.entries(modes)) {
  const rgb = (name) => oklchToRgb(resolve(map, name))
  log(`\n${mode.toUpperCase()}`)

  for (const [name, tok] of Object.entries(map)) {
    if (!tok.commentHex || tok.value.startsWith("var(")) continue
    const actual = hex(rgb(name))
    if (actual !== tok.commentHex) {
      failures++
      console.log(`  DRIFT  [${mode}] --${name} renders ${actual}, comment says ${tok.commentHex}`)
    }
  }

  for (const [fg, bgs, min, label] of PAIRS) {
    for (const bg of bgs) {
      const r = ratio(rgb(fg), rgb(bg))
      const ok = r >= min
      if (!ok) failures++
      const line = `  ${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)} ≥ ${min}  ${fg} on ${bg}  (${label})`
      if (ok) log(line)
      else console.log(quiet ? `[${mode}] ${line.trim()}` : line)
    }
  }
  for (const [fg, bgs, label] of INFO) {
    for (const bg of bgs) {
      log(`  info  ${ratio(rgb(fg), rgb(bg)).toFixed(2).padStart(5)}        ${fg} on ${bg}  (${label})`)
    }
  }
}

if (failures) {
  console.log(`\n${failures} contrast check(s) failed.`)
  process.exit(1)
}
log("\nAll contrast checks pass.")
