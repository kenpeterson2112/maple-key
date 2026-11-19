// Stage 1 mock-up data: softer autumnal oranges proposed to replace the
// Crisp orchard `--primary` family (#D93A26 apple red / #FF5A43 in dark).
// Preview only: nothing in the app reads this. Each value is the exact OKLCH
// form of the hex beside it, so it can be pasted into src/index.css as is.
// Every set was run through `pnpm check:contrast --css=…` (see the PR).

export interface PrimaryFamily {
  primary: string
  "primary-hover": string
  "primary-strong": string
  "primary-tint": string
}

export interface OrangeCandidate {
  id: string
  name: string
  blurb: string
  light: PrimaryFamily
  dark: PrimaryFamily
  /** The hex each value renders as, for the swatch captions. */
  hex: { light: PrimaryFamily; dark: PrimaryFamily }
}

export const CURRENT_PRIMARY: OrangeCandidate = {
  id: "current",
  name: "Current: apple red",
  blurb: "What ships today. Bright and saturated, reads as red-orange.",
  light: {
    primary: "oklch(0.587 0.199 30.8)",
    "primary-hover": "oklch(0.537 0.185 31)",
    "primary-strong": "oklch(0.515 0.179 30.9)",
    "primary-tint": "oklch(0.945 0.025 29.9)",
  },
  dark: {
    primary: "oklch(0.685 0.204 30.8)",
    "primary-hover": "oklch(0.72 0.175 29.8)",
    "primary-strong": "oklch(0.72 0.175 29.8)",
    "primary-tint": "oklch(0.284 0.045 30.9)",
  },
  hex: {
    light: { primary: "#D93A26", "primary-hover": "#C2301D", "primary-strong": "#B82C1A", "primary-tint": "#FDE7E3" },
    dark: { primary: "#FF5A43", "primary-hover": "#FF7360", "primary-strong": "#FF7360", "primary-tint": "#3D211C" },
  },
}

export const ORANGE_CANDIDATES: OrangeCandidate[] = [
  {
    id: "pumpkin",
    name: "A · Pumpkin",
    blurb: "The closest to a classic orange. Hue moves from 31° to 47°, chroma drops by a quarter.",
    light: {
      primary: "oklch(0.572 0.149 47.2)",
      "primary-hover": "oklch(0.532 0.145 47.1)",
      "primary-strong": "oklch(0.523 0.1428 46.9)",
      "primary-tint": "oklch(0.956 0.025 49.7)",
    },
    dark: {
      primary: "oklch(0.71 0.158 46.8)",
      "primary-hover": "oklch(0.75 0.142 46.9)",
      "primary-strong": "oklch(0.75 0.142 46.9)",
      "primary-tint": "oklch(0.29 0.04 46.3)",
    },
    hex: {
      light: { primary: "#BC5614", "primary-hover": "#AD4B04", "primary-strong": "#A94905", "primary-tint": "#FFECE2" },
      dark: { primary: "#EF7E41", "primary-hover": "#F68F5A", "primary-strong": "#F68F5A", "primary-tint": "#3C251A" },
    },
  },
  {
    id: "rust",
    name: "B · Rust",
    blurb: "Earthy and dusty, the softest of the three. Hue 40°, chroma about 0.125.",
    light: {
      primary: "oklch(0.57 0.126 39.9)",
      "primary-hover": "oklch(0.531 0.121 40.2)",
      "primary-strong": "oklch(0.52 0.12 39.8)",
      "primary-tint": "oklch(0.954 0.024 40.3)",
    },
    dark: {
      primary: "oklch(0.71 0.132 40.1)",
      "primary-hover": "oklch(0.75 0.119 40.1)",
      "primary-strong": "oklch(0.75 0.119 40.1)",
      "primary-tint": "oklch(0.289 0.04 39.2)",
    },
    hex: {
      light: { primary: "#B45A3A", "primary-hover": "#A55031", "primary-strong": "#A14D2F", "primary-tint": "#FFEBE4" },
      dark: { primary: "#E68360", "primary-hover": "#EE9373", "primary-strong": "#EE9373", "primary-tint": "#3C241C" },
    },
  },
  {
    id: "copper",
    name: "C · Copper",
    blurb: "Leans toward amber and maple syrup. Hue 55°, chroma about 0.12.",
    light: {
      primary: "oklch(0.5671 0.1195 55.3)",
      "primary-hover": "oklch(0.527 0.116 55)",
      "primary-strong": "oklch(0.518 0.114 55.3)",
      "primary-tint": "oklch(0.954 0.025 53.7)",
    },
    dark: {
      primary: "oklch(0.71 0.126 55.2)",
      "primary-hover": "oklch(0.751 0.114 54.9)",
      "primary-strong": "oklch(0.751 0.114 54.9)",
      "primary-tint": "oklch(0.29 0.041 55.9)",
    },
    hex: {
      light: { primary: "#AB6126", "primary-hover": "#9D561C", "primary-strong": "#99541B", "primary-tint": "#FEECE1" },
      dark: { primary: "#DD8B4F", "primary-hover": "#E69A65", "primary-strong": "#E69A65", "primary-tint": "#3B2617" },
    },
  },
]
