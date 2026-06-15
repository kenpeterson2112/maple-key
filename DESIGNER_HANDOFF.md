# Resource Card Redesign Handoff

## 1. Current Component Implementation

**File:** `src/components/resource-card.tsx`

The card is a React 19 + TypeScript component with inline styling logic. Key entry point:

```typescript
export default function CompactResourceCard({ 
  resource, 
  codeProgress?: Record<string, LevelCounts> 
}) { ... }
```

**Props:**
- `resource: Resource` — Full resource object from `resources.json` (see schema below)
- `codeProgress?: Record<string, LevelCounts>` — Optional assessment progress per curriculum code (drives readiness pill coloring)

---

## 2. Real Resource Examples (4 diversity cases)

### Example 1: English, Free, Single Grade, Interactive (r-1)
```json
{
  "id": "r-1",
  "topic_title": "Mathies Data Tools",
  "description": "Interactive tools from the Ontario Ministry of Education for exploring data visualization, including bar graphs, pictographs, and circle graphs. Students can input their own data and see it represented in multiple formats.",
  "url": "https://www.mathies.ca/activities.php",
  "publisher_creator": "Ontario Ministry of Education",
  "grade_level": [6],
  "grade_band": "intermediate",
  "subject": "Math",
  "strand": ["Data Literacy"],
  "province": "ON",
  "jurisdiction": "ontario",
  "modality": ["Interactive", "Online"],
  "resource_type": "interactive",
  "access_type": "free",
  "is_paid": false,
  "curriculum_expectations": ["D1.1", "D1.2", "D1.3"],
  "accessibility": ["No Concerns"],
  "instructional_modes": ["individual", "small-group", "whole-class"],
  "usage_notes": "Open-ended structure supports inquiry; assign on individual devices for self-directed exploration or project whole-class to guide discussion.",
  "alignments": [
    {
      "jurisdiction": "ontario",
      "grade": 6,
      "subject": "mathematics",
      "strand": "data_literacy",
      "expectation_code": "D1.1",
      "expectation_description": null,
      "alignment_strength": "primary"
    },
    {
      "jurisdiction": "ontario",
      "grade": 6,
      "subject": "mathematics",
      "strand": "data_literacy",
      "expectation_code": "D1.2",
      "expectation_description": null,
      "alignment_strength": "primary"
    },
    {
      "jurisdiction": "ontario",
      "grade": 6,
      "subject": "mathematics",
      "strand": "data_literacy",
      "expectation_code": "D1.3",
      "expectation_description": null,
      "alignment_strength": "primary"
    }
  ],
  "metadata": {
    "added_at": "2025-11-10",
    "added_by": "maple_key_team",
    "verified": false,
    "needs_review": true
  },
  "language": "en"
}
```

### Example 2: French, Free, Kindergarten, Health & PE (r-2532)
```json
{
  "id": "r-2532",
  "topic_title": "Ressource d'apprentissage de la petite enfance",
  "description": "La Ressource d'apprentissage de la petite enfance d'Ophea aide les enseignants de la maternelle et du jardin d'enfants, les éducateurs de la petite enfance et les équipes responsables de l'apprentissage de la petite enfance à mettre en œuvre le Programme de la maternelle et du jardin d'enfants.",
  "url": "https://ophea.net/fr/ressource-dapprentissage-de-la-petite-enfance",
  "publisher_creator": "Ophea",
  "grade_level": ["K"],
  "grade_band": "primary",
  "subject": "Health & Physical Education",
  "language": "fr",
  "strand": ["Active Living", "Healthy Living"],
  "province": "ON",
  "jurisdiction": "ontario",
  "modality": ["Online", "Interactive"],
  "resource_type": "interactive",
  "access_type": "free",
  "is_paid": false,
  "curriculum_expectations": [],
  "accessibility": ["No Concerns"],
  "instructional_modes": ["individual", "small-group", "whole-class"],
  "usage_notes": null,
  "alignments": [
    {
      "jurisdiction": "ontario",
      "grade": null,
      "subject": "health_and_physical_education",
      "strand": "active_living",
      "expectation_code": null,
      "expectation_description": null,
      "alignment_strength": "primary"
    }
  ],
  "metadata": {
    "added_at": "2026-06-12",
    "added_by": "maple_key_team",
    "verified": false,
    "needs_review": true
  }
}
```

### Example 3: Paid Textbook, Multiple Strands, Single Grade (r-3)
```json
{
  "id": "r-3",
  "topic_title": "Nelson Math Focus: Data Management Unit",
  "description": "Comprehensive textbook unit covering data collection, organization, display, and analysis. Includes probability connections and real-world applications appropriate for Ontario curriculum.",
  "url": "https://www.nelson.com/mathfocus",
  "publisher_creator": "Nelson Education",
  "grade_level": [6],
  "grade_band": "intermediate",
  "subject": "Math",
  "strand": ["Data Literacy", "Probability"],
  "province": "ON",
  "jurisdiction": "ontario",
  "modality": ["Books & Print Media"],
  "resource_type": "print",
  "access_type": "purchase",
  "is_paid": true,
  "curriculum_expectations": ["D1.1", "D1.2", "D1.3", "D1.4", "D1.5", "D2.1", "D2.2"],
  "accessibility": ["Some Concerns"],
  "instructional_modes": ["individual", "small-group"],
  "usage_notes": "A print textbook or unit resource; assign specific pages for individual reading or guided partner work. No technology required.",
  "alignments": [
    {
      "jurisdiction": "ontario",
      "grade": 6,
      "subject": "mathematics",
      "strand": "data_literacy",
      "expectation_code": "D1.1",
      "expectation_description": null,
      "alignment_strength": "primary"
    },
    {
      "jurisdiction": "ontario",
      "grade": 6,
      "subject": "mathematics",
      "strand": "data_literacy",
      "expectation_code": "D1.2",
      "expectation_description": null,
      "alignment_strength": "primary"
    },
    {
      "jurisdiction": "ontario",
      "grade": 6,
      "subject": "mathematics",
      "strand": "data_literacy",
      "expectation_code": "D1.3",
      "expectation_description": null,
      "alignment_strength": "primary"
    },
    {
      "jurisdiction": "ontario",
      "grade": 6,
      "subject": "mathematics",
      "strand": "data_literacy",
      "expectation_code": "D1.4",
      "expectation_description": null,
      "alignment_strength": "primary"
    },
    {
      "jurisdiction": "ontario",
      "grade": 6,
      "subject": "mathematics",
      "strand": "data_literacy",
      "expectation_code": "D1.5",
      "expectation_description": null,
      "alignment_strength": "primary"
    },
    {
      "jurisdiction": "ontario",
      "grade": 6,
      "subject": "mathematics",
      "strand": "data_literacy",
      "expectation_code": "D2.1",
      "expectation_description": null,
      "alignment_strength": "primary"
    },
    {
      "jurisdiction": "ontario",
      "grade": 6,
      "subject": "mathematics",
      "strand": "data_literacy",
      "expectation_code": "D2.2",
      "expectation_description": null,
      "alignment_strength": "primary"
    }
  ],
  "metadata": {
    "added_at": "2025-11-10",
    "added_by": "maple_key_team",
    "verified": false,
    "needs_review": true
  },
  "is_collection": true,
  "language": "en"
}
```

### Example 4: Multi-Grade (3–5), Free Interactive (r-98)
```json
{
  "id": "r-98",
  "topic_title": "Hands-On Probability Games for Kids",
  "description": "Collection of low-prep probability games using cards, dice, spinners, and coins. Each activity includes instructions, discussion questions, and extensions for different ability levels.",
  "url": "https://www.lovetoknow.com/parenting/kids/probability-games-kids",
  "publisher_creator": "LoveToKnow Media",
  "grade_level": [3, 4, 5],
  "grade_band": "multi",
  "subject": "Math",
  "strand": ["Probability"],
  "province": "ON",
  "jurisdiction": "ontario",
  "modality": ["Interactive"],
  "resource_type": "interactive",
  "access_type": "free",
  "is_paid": false,
  "curriculum_expectations": ["D2.1", "D2.2"],
  "accessibility": ["No Concerns"],
  "instructional_modes": ["individual", "small-group", "whole-class"],
  "usage_notes": "Works well on individual devices for self-paced practice or projected whole-class for competitive whole-group play. No station rotation needed.",
  "alignments": [
    {
      "jurisdiction": "ontario",
      "grade": null,
      "subject": "mathematics",
      "strand": "probability",
      "expectation_code": "D2.1",
      "expectation_description": null,
      "alignment_strength": "primary"
    },
    {
      "jurisdiction": "ontario",
      "grade": null,
      "subject": "mathematics",
      "strand": "probability",
      "expectation_code": "D2.2",
      "expectation_description": null,
      "alignment_strength": "primary"
    }
  ],
  "metadata": {
    "added_at": "2025-11-10",
    "added_by": "maple_key_team",
    "verified": false,
    "needs_review": true
  },
  "language": "en"
}
```

---

## 3. Design Tokens (from `src/index.css`)

### Color Palette (OKLCH)
```css
:root {
  --background: oklch(0.96 0.02 65);        /* warm cream */
  --foreground: oklch(0.18 0.02 25);        /* dark brown */
  --card: oklch(0.99 0.005 70);             /* off-white */
  --card-foreground: oklch(0.18 0.02 25);   /* dark brown */
  --primary: oklch(0.6 0.2 30);             /* maple orange */
  --primary-foreground: oklch(0.99 0.005 70);
  --secondary: oklch(0.55 0.22 25);         /* dark orange */
  --secondary-foreground: oklch(0.99 0.005 70);
  --muted: oklch(0.85 0.02 50);             /* light gray */
  --muted-foreground: oklch(0.4 0.02 25);   /* medium gray */
  --accent: oklch(0.6 0.2 30);              /* same as primary */
  --accent-foreground: oklch(0.99 0.005 70);
  --destructive: oklch(0.55 0.24 15);       /* red */
  --destructive-foreground: oklch(0.99 0.005 70);
  --border: oklch(0.9 0.01 50);             /* light border */
  --input: oklch(0.99 0.005 70);            /* off-white */
  --ring: oklch(0.6 0.2 30);                /* maple orange */
  --radius: 0.875rem;

  /* Proficiency signal levels (Level 1–4) */
  --signal-1: oklch(0.62 0.19 45);          /* burnt orange — needs critical attention */
  --signal-2: oklch(0.84 0.15 95);          /* yellow — approaching standard */
  --signal-3: oklch(0.82 0.14 145);         /* light green — meeting standard */
  --signal-4: oklch(0.55 0.15 145);         /* dark green — surpassing standard */
}

/* Radius scale */
--radius-sm: calc(var(--radius) - 4px);    /* ~10px */
--radius-md: calc(var(--radius) - 2px);    /* ~12px */
--radius-lg: var(--radius);                /* 14px */
--radius-xl: calc(var(--radius) + 4px);    /* ~18px */
```

### Typography
```css
--font-sans: "Geist", system-ui, -apple-system, sans-serif;
--font-display: "Alteix Sans", "Geist", system-ui, sans-serif;
```
**Note:** Alteix Sans is loaded from `/public/fonts/AlteixsansRegulardemo-E4j1n.otf` with `font-display: swap`. Use `--font-display` only for marketing/hero headings; body copy uses `--font-sans`.

**PDF caveat:** Font rendering in exports differs from browser. Test PDFs when changing fonts.

---

## 4. Readiness Logic

**Location:** `src/lib/assessment-results.ts`

```typescript
export type ReadinessLevel = "poor" | "okay" | "good" | "great"

export function computeReadinessLevel(counts: LevelCounts): ReadinessLevel {
  const total = counts.level1 + counts.level2 + counts.level3 + counts.level4
  if (total === 0) return "okay"
  if (counts.level4 / total >= 0.8) return "great"        // ≥80% Level 4
  if ((counts.level3 + counts.level4) / total >= 0.5) return "good"   // ≥50% Level 3+4
  if (counts.level1 / total >= 0.5) return "poor"         // ≥50% Level 1
  return "okay"
}
```

**Data flow:**
1. Teachers record Quick Check responses → stored as `LevelCounts` per expectation code
2. Card receives `codeProgress: Record<string, LevelCounts>` as prop
3. `coverageForResource()` aggregates by overall expectation (D1.1, D1.2 → D1) and applies `computeReadinessLevel()`
4. Pills render colored (when data exists) or neutral gray (when null/not yet assessed)

**Pill coloring:**
```typescript
const READINESS_STYLES: Record<ReadinessLevel, { dot: string; text: string; label: string }> = {
  poor: { dot: "#B45309", text: "#92400E", label: "Needs Support" },
  okay: { dot: "#D97706", text: "#92400E", label: "Developing" },
  good: { dot: "#16A34A", text: "#15803D", label: "Strong" },
  great: { dot: "#166534", text: "#14532D", label: "Excelling" },
}
```

---

## 5. Modality → Icon & Color Map

**From `resource-card.tsx`:**

```typescript
function getPrimaryIcon(modality: string) {
  const m = (modality || "").toLowerCase()
  if (m.includes("interactive")) return { Icon: MousePointerClick, color: "#849657" }
  if (m.includes("video") || m.includes("film")) return { Icon: Video, color: "#FFC107" }
  if (m.includes("book") || m.includes("print")) return { Icon: BookOpen, color: "#D9742A" }
  if (m.includes("audio") || m.includes("podcast")) return { Icon: Headphones, color: "#FFC107" }
  if (m.includes("trip") || m.includes("field")) return { Icon: MapPin, color: "#4CAFB5" }
  if (m.includes("guest") || m.includes("speaker") || m.includes("workshop")) return { Icon: Users, color: "#849657" }
  if (m.includes("project")) return { Icon: Hammer, color: "#D9742A" }
  if (m.includes("podcast")) return { Icon: Mic, color: "#849657" }
  return { Icon: Globe, color: "#4CAFB5" }  // fallback
}
```

**Icons:** Lucide React (`lucide-react` package)

---

## 6. Accessibility Thresholds

```typescript
function getAccessibilityStyle(accessibilityArray) {
  const rating = (accessibilityArray?.[0] || "").toLowerCase()
  if (rating.includes("no concerns")) 
    return { icon: "/icons/accessibility-green.svg", label: "No accessibility concerns" }
  if (rating.includes("some concerns")) 
    return { icon: "/icons/accessibility-yellow.svg", label: "Some accessibility concerns" }
  return { icon: "/icons/accessibility-orange.svg", label: "Accessibility not reviewed" }
}
```

**Data:** `resource.accessibility` is an array (always check first element).

---

## 7. Subject Color Theme Map

**From `resource-card.tsx`:**

```typescript
function getSubjectTheme(subject: string) {
  const s = (subject || "").toLowerCase()
  if (s.includes("math"))
    return { bg: "bg-[#F0FDF4]", border: "border-[#86EFAC]", dot: "bg-[#166534]", 
             badge: "bg-gradient-to-r from-[#166534] to-[#14532D] text-white", label: "text-[#166534]" }
  if (s.includes("science"))
    return { bg: "bg-[#EFF6FF]", border: "border-[#93C5FD]", dot: "bg-[#1E40AF]", 
             badge: "bg-gradient-to-r from-[#1E3A8A] to-[#1E293B] text-white", label: "text-[#1E40AF]" }
  if (s.includes("fsl"))
    return { bg: "bg-[#F0FDFA]", border: "border-[#5EEAD4]", dot: "bg-[#0D9488]", 
             badge: "bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white", label: "text-[#0F766E]" }
  if (s.includes("language") || s.includes("english") || s.includes("french") || s.includes("literacy"))
    return { bg: "bg-[#FEFCE8]", border: "border-[#FDE047]", dot: "bg-[#CA8A04]", 
             badge: "bg-gradient-to-r from-[#CA8A04] to-[#A16207] text-white", label: "text-[#92400E]" }
  if (s.includes("social") || s.includes("history") || s.includes("geo"))
    return { bg: "bg-[#F5F3FF]", border: "border-[#C4B5FD]", dot: "bg-[#7C3AED]", 
             badge: "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white", label: "text-[#7C3AED]" }
  if (s.includes("health") || s.includes("physical"))
    return { bg: "bg-[#FFF7ED]", border: "border-[#FED7AA]", dot: "bg-[#EA580C]", 
             badge: "bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white", label: "text-[#EA580C]" }
  if (s.includes("art") || s.includes("music") || s.includes("drama") || s.includes("dance"))
    return { bg: "bg-[#FDF4FF]", border: "border-[#E9D5FF]", dot: "bg-[#A21CAF]", 
             badge: "bg-gradient-to-r from-[#A21CAF] to-[#86198F] text-white", label: "text-[#A21CAF]" }
  return { bg: "bg-[#FFF5ED]", border: "border-[#FFB627]", dot: "bg-[#FF6B35]", 
           badge: "bg-gradient-to-r from-[#FF6B35] to-[#C65D3B] text-white", label: "text-[#C65D3B]" }
}
```

---

## 8. Resource Type Definitions

**From `src/lib/types.ts`:**

```typescript
export interface Resource {
  id: string
  topic_title: string
  description: string
  url: string
  publisher_creator: string
  grade_level: (number | "K" | "PreK")[]
  grade_band: "primary" | "junior" | "intermediate" | "senior" | "multi"
  subject: string
  strand: string[]
  curriculum_expectations: string[]
  alignments: ResourceAlignment[]
  province: string
  jurisdiction: string
  modality: string[]
  resource_type: string
  access_type: "free" | "purchase" | "licensed"
  is_paid: boolean
  accessibility: string[]
  year_published?: number
  instructional_modes?: ("whole-class" | "small-group" | "individual" | "station-rotation")[]
  usage_notes?: string
  is_collection?: boolean
  metadata: ResourceMetadata
  language?: string
}

export interface ResourceAlignment {
  jurisdiction: string
  grade: number | "K" | "PreK" | null
  subject: string | null
  strand: string | null
  expectation_code: string | null
  expectation_description: string | null
  alignment_strength: "primary" | "secondary"
}
```

---

## 9. Canonical Deployment

**Vercel v0 build** (`vercel.json`):
```json
{
  "framework": "vite",
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install"
}
```

Live deployment is a **Vercel-hosted Vite React 19 + TypeScript application**, not standalone HTML with CDN React. Build targets modern browsers; no IE11 or legacy support needed.

---

## Key Implementation Notes

1. **No arbitrary colors in JSX.** All hardcoded hex values above are flagged as tech debt; the component should use tokens wherever possible.
2. **Assessment data is optional.** If `codeProgress` is not provided, all pills render neutral gray (not assessed).
3. **Resource.language defaults to "en"** if not provided; no special i18n wiring yet.
4. **usage_notes can be null.** Currently unused in the card; a redesign could surface it.
5. **instructional_modes** ("whole-class", "small-group", "individual", "station-rotation") is available but not displayed; good candidate for new design.
6. **Multiple strands/grades** are captured in arrays but card truncates to first of each.
7. **PDF exports use a different font stack.** Verify typography changes in actual PDF output, not just browser.

---

## Next Steps for Designer

1. Read `src/components/resource-card.tsx` end-to-end to see current layout/logic.
2. Map desired visual changes against the 4 example resources above (especially r-3 paid + multi-expectation, r-98 multi-grade).
3. Cross-ref design tokens to ensure colors/fonts match the `:root` declarations.
4. For any field not currently displayed (usage_notes, instructional_modes, full alignments), confirm visibility/prominence in redesign.
5. Consider mobile viewport behavior—sticky footer and IntersectionObserver interactions.

---

**Questions?** Refer to `CLAUDE.md` architecture section or ask the team.
