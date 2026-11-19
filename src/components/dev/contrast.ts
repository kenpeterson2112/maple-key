// WCAG contrast for the header preview, computed from the live tokens so the
// numbers on the page follow src/index.css (and the orange being previewed).
// Same OKLCH → sRGB maths as scripts/check-contrast.mjs.

export type Oklch = [number, number, number]

/** Parses "oklch(L C H)" as written in src/index.css. */
export function parseOklch(value: string): Oklch | null {
  const m = value.trim().match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

/** color-mix(in oklab, a pct%, b), returned as OKLCH. Mixing in OKLab keeps
 *  a true tint; OKLCH would swing the hue through the background's hue. */
export function mixOklab(a: Oklch, b: Oklch, pct: number): Oklch {
  const t = pct / 100
  const lab = ([L, C, H]: Oklch) => [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)]
  const [la, aa, ba] = lab(a)
  const [lb, ab, bb] = lab(b)
  const [L, A, B] = [lb + (la - lb) * t, ab + (aa - ab) * t, bb + (ba - bb) * t]
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360]
}

function toRgb([L, C, H]: Oklch): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  const [r, g, bl] = lin.map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
    return Math.max(0, Math.min(255, Math.round(v * 255)))
  })
  return [r, g, bl]
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(toRgb(a)), luminance(toRgb(b))].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

