import type { LevelCounts } from "./assessment-results"
import { overallLabel } from "./curriculum-codes"

// Sample dataset for the district-leader dashboard (#district).
//
// Everything here is illustrative. Assessment tallies live on each teacher's
// device today, so a real district roll-up needs sign-in and a server-side
// store first. The shapes below are deliberately the ones that roll-up would
// aggregate: lessons carry expectation codes, library resource ids, in-class
// material ids (the Settings → Materials catalog) and whole-class LevelCounts.
// No student identities, and teachers are only ever an opaque id.
//
// The dataset is generated from a fixed seed so every load (and every
// screenshot) shows the same numbers.

export const SAMPLE_DISTRICT = {
  name: "Northshore District School Board",
  term: "Fall 2026 · Sep 7 – Oct 30",
  grades: ["6", "7", "8"],
}

export interface DistrictSchool {
  id: string
  name: string
  /** Grade 6–8 classroom teachers on staff. */
  teachers: number
  /** Share of those teachers who planned at least one lesson this term. */
  adoption: number
  /** Nudges Quick Check results, so schools don't all look identical. */
  effect: number
}

export const DISTRICT_SCHOOLS: DistrictSchool[] = [
  { id: "birchwood", name: "Birchwood PS", teachers: 18, adoption: 0.83, effect: 0.02 },
  { id: "cedar-ridge", name: "Cedar Ridge PS", teachers: 22, adoption: 0.64, effect: -0.04 },
  { id: "lakeshore", name: "Lakeshore Intermediate", teachers: 34, adoption: 0.88, effect: 0.03 },
  { id: "maple-grove", name: "Maple Grove PS", teachers: 16, adoption: 0.56, effect: -0.06 },
  { id: "pinecrest", name: "Pinecrest Senior PS", teachers: 28, adoption: 0.79, effect: 0.01 },
  { id: "riverside", name: "Riverside PS", teachers: 20, adoption: 0.7, effect: -0.01 },
]

export const DISTRICT_SUBJECTS = ["Math", "Science", "History", "Geography", "Social Studies"] as const
export type DistrictSubject = (typeof DISTRICT_SUBJECTS)[number]

// ---- Library resources (a snapshot of real public/resources.json entries) ----

export type LibraryResourceType = "interactive" | "digital" | "print" | "video" | "physical"

export interface LibraryResource {
  id: string
  title: string
  publisher: string
  type: LibraryResourceType
}

export const LIBRARY_RESOURCES: LibraryResource[] = [
  { id: "r-1077", title: "Polypad — Working with Fractions", publisher: "Amplify", type: "interactive" },
  { id: "r-1078", title: "GeoGebra — Fractions on a Number Line", publisher: "GeoGebra", type: "interactive" },
  { id: "r-1089", title: "Desmos Classroom — Adding & Subtracting Fractions", publisher: "Desmos", type: "interactive" },
  { id: "r-1003", title: "Khan Academy — Patterning and Algebra (Grade 7)", publisher: "Khan Academy", type: "video" },
  { id: "r-1004", title: "Desmos Activities & Amplify Desmos Math", publisher: "Amplify", type: "interactive" },
  { id: "r-1005", title: "GeoGebra — Learn Algebraic Patterns", publisher: "GeoGebra", type: "interactive" },
  { id: "r-1006", title: "GeoGebra — Learn Algebra", publisher: "GeoGebra", type: "interactive" },
  { id: "r-1010", title: "Edwin App — Ontario Math", publisher: "Edwin", type: "interactive" },
  { id: "r-1061", title: "NRICH — Geometry Problem Collection", publisher: "University of Cambridge", type: "digital" },
  { id: "r-1338", title: "GeoGebra — Discover Pythagorean Theorem", publisher: "GeoGebra", type: "interactive" },
  { id: "r-1", title: "Mathies Data Tools", publisher: "Ontario Ministry of Education", type: "interactive" },
  { id: "r-3", title: "Nelson Math Focus: Data Management Unit", publisher: "Nelson Education", type: "print" },
  { id: "r-105", title: "Our World in Data: Global Data Explorer", publisher: "Our World in Data", type: "interactive" },
  { id: "r-143", title: "BMO SmartSteps Financial Literacy", publisher: "BMO Financial Group", type: "digital" },
  { id: "r-44", title: "iNaturalist: Citizen Science for Classrooms", publisher: "California Academy of Sciences", type: "interactive" },
  { id: "r-1909", title: "Edwin — Ontario Science Resources Hub", publisher: "Edwin", type: "interactive" },
  { id: "r-2164", title: "Let's Talk Science — What is the Water Cycle?", publisher: "Let's Talk Science", type: "digital" },
  { id: "r-1885", title: "STAO — Science Teachers' Association of Ontario", publisher: "STAO", type: "digital" },
  { id: "r-1893", title: "Canadian Wildlife Federation — Lesson Plans", publisher: "Canadian Wildlife Federation", type: "digital" },
  { id: "r-56", title: "PhET Physics Simulations", publisher: "University of Colorado Boulder", type: "interactive" },
  { id: "r-46", title: "Indigenous Peoples Atlas of Canada", publisher: "Canadian Geographic", type: "interactive" },
  { id: "r-47", title: "Crown-Indigenous Relations: Treaties", publisher: "Government of Canada", type: "digital" },
  { id: "r-61", title: "Canadian Museum of Immigration at Pier 21", publisher: "Pier 21", type: "physical" },
  { id: "r-2042", title: "Historica Canada — Forces of Immigration Guide", publisher: "Historica Canada", type: "print" },
  { id: "r-1953", title: "Atlas of Canada — Thematic Maps Collection", publisher: "Natural Resources Canada", type: "digital" },
  { id: "r-1952", title: "Atlas of Canada — Toporama Topographic Maps", publisher: "Natural Resources Canada", type: "interactive" },
  { id: "r-2281", title: "UNICEF Canada — Resources for Teachers", publisher: "UNICEF Canada", type: "digital" },
  { id: "r-32", title: "My Canada Project", publisher: "The Learning Partnership", type: "interactive" },
]

// ---- In-class materials: share of classrooms that list each one ----
// From teachers' Materials profiles (CLASSROOM_RESOURCE_OPTIONS ids). This is
// what lets the dashboard say "you already own this, and it works" rather
// than only "buy more of the library".
export const MATERIAL_INVENTORY: Record<string, number> = {
  "base-ten-blocks": 0.86,
  "fraction-tiles": 0.72,
  "algebra-tiles": 0.58,
  "two-colour-counters": 0.81,
  "connecting-cubes": 0.88,
  geoboards: 0.46,
  dice: 0.9,
  spinners: 0.61,
  "rulers-measuring": 0.95,
  "graph-paper": 0.9,
  calculators: 0.85,
  "whiteboards-mini": 0.7,
  "chromebook-cart": 0.93,
  "ipad-cart": 0.41,
  "coding-kits": 0.22,
  "document-camera": 0.66,
  projector: 0.97,
  "science-equipment": 0.55,
  "science-lab": 0.3,
  "maker-space": 0.25,
  "outdoor-classroom": 0.38,
  "library-access": 0.92,
  "sticky-notes": 0.96,
  "construction-paper": 0.9,
  padlet: 0.5,
}

// ---- Expectation catalog (overall expectations, grades 6–8) ----

export interface DistrictExpectation {
  subject: DistrictSubject
  grade: string
  code: string
  title: string
}

const MATH_OVERALLS: Record<string, string> = {
  B1: "Number Sense",
  B2: "Operations",
  C1: "Patterns and Relationships",
  C2: "Equations and Inequalities",
  C3: "Coding",
  D1: "Data Literacy",
  D2: "Probability",
  E1: "Geometric and Spatial Reasoning",
  E2: "Measurement",
  F1: "Money and Finances",
}

// Science & Technology (2022): each strand has a topic per grade, and every
// strand splits into X1 (connections to society) and X2 (concepts).
const SCIENCE_TOPICS: Record<string, Record<string, string>> = {
  "6": { B: "Biodiversity", C: "Electrical Phenomena", D: "Flight", E: "Space" },
  "7": { B: "Interactions in the Environment", C: "Pure Substances and Mixtures", D: "Form and Function", E: "Heat in the Environment" },
  "8": { B: "Cells", C: "Fluids", D: "Systems in Action", E: "Water Systems" },
}

const SOCIAL_STUDIES_GRADES: Partial<Record<DistrictSubject, string[]>> = {
  History: ["7", "8"],
  Geography: ["7", "8"],
  "Social Studies": ["6"],
}

export const DISTRICT_EXPECTATIONS: DistrictExpectation[] = [
  ...SAMPLE_DISTRICT.grades.flatMap((grade) =>
    Object.entries(MATH_OVERALLS).map(([code, title]) => ({ subject: "Math" as const, grade, code, title }))
  ),
  ...SAMPLE_DISTRICT.grades.flatMap((grade) =>
    Object.entries(SCIENCE_TOPICS[grade]).flatMap(([strand, topic]) => [
      { subject: "Science" as const, grade, code: `${strand}1`, title: `${topic}: connections to society` },
      { subject: "Science" as const, grade, code: `${strand}2`, title: `${topic}: core concepts` },
    ])
  ),
  ...(Object.entries(SOCIAL_STUDIES_GRADES) as [DistrictSubject, string[]][]).flatMap(([subject, grades]) =>
    grades.flatMap((grade) =>
      ["A1", "A2", "A3", "B1", "B2", "B3"].map((code) => ({
        subject,
        grade,
        code,
        title: overallLabel(subject, code, grade),
      }))
    )
  ),
]

// ---- Lesson designs ----
// Maple Key generates a fresh lesson for every teacher, so "the same lesson"
// across classrooms is really a design: the same expectations, taught with the
// same library resources and in-class materials. Impact is reported per design.

export interface LessonDesign {
  id: string
  title: string
  subject: DistrictSubject
  grade: string
  codes: string[]
  libraryIds: string[]
  materialIds: string[]
  template: "3-Part Lesson" | "5E Model" | "Madeline Hunter" | "CLAASS"
  mode: "Whole class" | "Small groups" | "Stations" | "Outdoors"
  /** Underlying share of responses meeting the standard (Levels 3–4). */
  base: number
  /** Relative popularity when teachers of this grade pick a lesson. */
  weight: number
}

export const LESSON_DESIGNS: LessonDesign[] = [
  // Math
  { id: "m6-fraction-tiles", title: "Comparing fractions with fraction tiles", subject: "Math", grade: "6", codes: ["B1", "B2"], libraryIds: ["r-1077"], materialIds: ["fraction-tiles", "whiteboards-mini"], template: "3-Part Lesson", mode: "Small groups", base: 0.82, weight: 9 },
  { id: "m6-fractions-digital", title: "Adding fractions on a number line", subject: "Math", grade: "6", codes: ["B2"], libraryIds: ["r-1089", "r-1078"], materialIds: ["chromebook-cart"], template: "3-Part Lesson", mode: "Whole class", base: 0.61, weight: 8 },
  { id: "m6-probability", title: "Experimental vs. theoretical probability", subject: "Math", grade: "6", codes: ["D2"], libraryIds: ["r-3"], materialIds: ["dice", "spinners"], template: "3-Part Lesson", mode: "Stations", base: 0.77, weight: 6 },
  { id: "m6-cartesian", title: "Plotting shapes on the Cartesian plane", subject: "Math", grade: "6", codes: ["E1"], libraryIds: ["r-1061"], materialIds: ["graph-paper"], template: "Madeline Hunter", mode: "Whole class", base: 0.63, weight: 5 },
  { id: "m6-data", title: "Reading and building double bar graphs", subject: "Math", grade: "6", codes: ["D1"], libraryIds: ["r-1"], materialIds: [], template: "Madeline Hunter", mode: "Whole class", base: 0.6, weight: 5 },
  { id: "m6-base-ten", title: "Decimal place value with base ten blocks", subject: "Math", grade: "6", codes: ["B1"], libraryIds: [], materialIds: ["base-ten-blocks", "whiteboards-mini"], template: "3-Part Lesson", mode: "Small groups", base: 0.72, weight: 4 },
  { id: "m7-ratio-talk", title: "Number talk: reasoning with ratios", subject: "Math", grade: "7", codes: ["B1"], libraryIds: [], materialIds: [], template: "3-Part Lesson", mode: "Whole class", base: 0.55, weight: 5 },
  { id: "m7-algebra-tiles", title: "Solving equations with algebra tiles", subject: "Math", grade: "7", codes: ["C2"], libraryIds: ["r-1006"], materialIds: ["algebra-tiles"], template: "3-Part Lesson", mode: "Small groups", base: 0.8, weight: 3 },
  { id: "m7-equations", title: "Solving one-step equations", subject: "Math", grade: "7", codes: ["C2"], libraryIds: ["r-1003"], materialIds: [], template: "Madeline Hunter", mode: "Whole class", base: 0.51, weight: 10 },
  { id: "m7-growing-patterns", title: "Growing patterns with connecting cubes", subject: "Math", grade: "7", codes: ["C1"], libraryIds: ["r-1005"], materialIds: ["connecting-cubes", "graph-paper"], template: "5E Model", mode: "Small groups", base: 0.77, weight: 6 },
  { id: "m7-integers", title: "Integer operations with two-colour counters", subject: "Math", grade: "7", codes: ["B2"], libraryIds: ["r-1010"], materialIds: ["two-colour-counters"], template: "3-Part Lesson", mode: "Small groups", base: 0.74, weight: 7 },
  { id: "m7-number-sense", title: "Ratios and rates in everyday life", subject: "Math", grade: "7", codes: ["B1"], libraryIds: ["r-1010"], materialIds: ["calculators"], template: "Madeline Hunter", mode: "Whole class", base: 0.58, weight: 6 },
  { id: "m8-pythagoras", title: "Discovering the Pythagorean relationship", subject: "Math", grade: "8", codes: ["E2"], libraryIds: ["r-1338"], materialIds: ["geoboards", "rulers-measuring"], template: "5E Model", mode: "Small groups", base: 0.8, weight: 5 },
  { id: "m8-survey", title: "Designing a class survey", subject: "Math", grade: "8", codes: ["D1"], libraryIds: ["r-105", "r-1"], materialIds: ["chromebook-cart", "sticky-notes"], template: "5E Model", mode: "Small groups", base: 0.71, weight: 7 },
  { id: "m8-interest", title: "Comparing interest and saving plans", subject: "Math", grade: "8", codes: ["F1"], libraryIds: ["r-143"], materialIds: ["calculators"], template: "3-Part Lesson", mode: "Whole class", base: 0.57, weight: 6 },
  { id: "m8-coding", title: "Coding with conditional loops", subject: "Math", grade: "8", codes: ["C3"], libraryIds: ["r-1004"], materialIds: ["coding-kits", "chromebook-cart"], template: "5E Model", mode: "Stations", base: 0.69, weight: 3 },
  { id: "m8-equations", title: "Multi-step equations practice", subject: "Math", grade: "8", codes: ["C2"], libraryIds: ["r-1004"], materialIds: [], template: "Madeline Hunter", mode: "Whole class", base: 0.53, weight: 7 },
  // Science
  { id: "s6-glider", title: "Designing a glider: the forces of flight", subject: "Science", grade: "6", codes: ["D2"], libraryIds: ["r-1885"], materialIds: ["maker-space", "construction-paper"], template: "5E Model", mode: "Small groups", base: 0.78, weight: 4 },
  { id: "s6-biodiversity", title: "Classifying local species", subject: "Science", grade: "6", codes: ["B2"], libraryIds: ["r-1893"], materialIds: ["projector"], template: "3-Part Lesson", mode: "Whole class", base: 0.6, weight: 5 },
  { id: "s7-bioblitz", title: "Schoolyard BioBlitz: building food webs", subject: "Science", grade: "7", codes: ["B2", "B1"], libraryIds: ["r-44"], materialIds: ["outdoor-classroom", "ipad-cart"], template: "5E Model", mode: "Outdoors", base: 0.81, weight: 5 },
  { id: "s7-mixtures", title: "Separating mixtures lab", subject: "Science", grade: "7", codes: ["C2"], libraryIds: ["r-1909"], materialIds: ["science-equipment", "science-lab"], template: "5E Model", mode: "Stations", base: 0.75, weight: 5 },
  { id: "s7-insulators", title: "Insulator challenge: keeping ice frozen", subject: "Science", grade: "7", codes: ["E2"], libraryIds: [], materialIds: ["science-equipment", "construction-paper"], template: "5E Model", mode: "Small groups", base: 0.7, weight: 3 },
  { id: "s7-heat", title: "Heat transfer in the environment", subject: "Science", grade: "7", codes: ["E2"], libraryIds: ["r-2164"], materialIds: ["projector"], template: "Madeline Hunter", mode: "Whole class", base: 0.54, weight: 6 },
  { id: "s8-cells", title: "Cell structures and their functions", subject: "Science", grade: "8", codes: ["B2"], libraryIds: ["r-1893"], materialIds: ["document-camera"], template: "3-Part Lesson", mode: "Whole class", base: 0.56, weight: 6 },
  { id: "s8-density", title: "Density and buoyancy simulation", subject: "Science", grade: "8", codes: ["C2"], libraryIds: ["r-56"], materialIds: ["chromebook-cart", "science-equipment"], template: "5E Model", mode: "Small groups", base: 0.71, weight: 5 },
  // History, Geography, Social Studies
  { id: "h7-treaties", title: "Treaty perspectives in British North America", subject: "History", grade: "7", codes: ["A2", "A3"], libraryIds: ["r-47", "r-46"], materialIds: ["sticky-notes"], template: "CLAASS", mode: "Small groups", base: 0.66, weight: 5 },
  { id: "h8-pier21", title: "Immigration stories from Pier 21", subject: "History", grade: "8", codes: ["B2", "B3"], libraryIds: ["r-61", "r-2042"], materialIds: ["library-access", "chromebook-cart"], template: "3-Part Lesson", mode: "Stations", base: 0.73, weight: 4 },
  { id: "g7-resources", title: "Mapping Canada's natural resources", subject: "Geography", grade: "7", codes: ["B1", "B3"], libraryIds: ["r-1953"], materialIds: ["chromebook-cart"], template: "3-Part Lesson", mode: "Whole class", base: 0.62, weight: 5 },
  { id: "g8-settlement", title: "Why people settle where they do", subject: "Geography", grade: "8", codes: ["A1", "A3"], libraryIds: ["r-1952"], materialIds: ["projector"], template: "Madeline Hunter", mode: "Whole class", base: 0.54, weight: 4 },
  { id: "ss6-global", title: "Canada's role in global issues", subject: "Social Studies", grade: "6", codes: ["B1", "B2"], libraryIds: ["r-2281", "r-32"], materialIds: ["padlet", "chromebook-cart"], template: "CLAASS", mode: "Small groups", base: 0.64, weight: 4 },
]

// ---- Generated lessons ----

export const TERM_WEEKS = ["Sep 7", "Sep 14", "Sep 21", "Sep 28", "Oct 5", "Oct 12", "Oct 19", "Oct 26"]

export interface DistrictLesson {
  id: string
  designId: string
  schoolId: string
  /** Opaque — the dashboard never names a teacher. */
  teacherId: string
  subject: DistrictSubject
  grade: string
  codes: string[]
  libraryIds: string[]
  materialIds: string[]
  week: number
  /** Null when no Quick Check was recorded for the lesson. */
  results: LevelCounts | null
}

// mulberry32 — tiny deterministic PRNG so the sample never shifts between loads.
function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickWeighted<T>(items: T[], weight: (item: T) => number, rand: () => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0)
  let roll = rand() * total
  for (const item of items) {
    roll -= weight(item)
    if (roll <= 0) return item
  }
  return items[items.length - 1]
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function generateLessons(): DistrictLesson[] {
  const rand = seeded(2112)
  const lessons: DistrictLesson[] = []
  // Adoption ramps through the term, as it would after a September PD launch.
  const weekWeights = [0.45, 0.65, 0.8, 0.9, 1, 1.05, 1.1, 1.15]

  for (const school of DISTRICT_SCHOOLS) {
    const active = Math.round(school.teachers * school.adoption)
    for (let t = 0; t < active; t++) {
      const grade = SAMPLE_DISTRICT.grades[t % SAMPLE_DISTRICT.grades.length]
      const designs = LESSON_DESIGNS.filter((d) => d.grade === grade)
      const lessonCount = 4 + Math.floor(rand() * 13)
      // Teachers lean on what they already have — a classroom without the
      // listed materials mostly picks other designs.
      const owns = new Set(
        Object.entries(MATERIAL_INVENTORY).filter(([, share]) => rand() < share).map(([id]) => id)
      )
      for (let n = 0; n < lessonCount; n++) {
        const design = pickWeighted(
          designs,
          (d) => d.weight * (d.materialIds.every((m) => owns.has(m)) ? 1 : 0.25),
          rand
        )
        const week = TERM_WEEKS.indexOf(pickWeighted(TERM_WEEKS, (w) => weekWeights[TERM_WEEKS.indexOf(w)], rand))
        let results: LevelCounts | null = null
        if (rand() < 0.74) {
          const students = 20 + Math.floor(rand() * 10)
          const responses = students * design.codes.length
          const p = clamp(design.base + school.effect + (rand() - 0.5) * 0.16, 0.15, 0.97)
          const level4 = Math.round(responses * p * 0.45)
          const level3 = Math.round(responses * p) - level4
          const level1 = Math.round(responses * (1 - p) * 0.35)
          results = { level1, level2: responses - level1 - level3 - level4, level3, level4 }
        }
        lessons.push({
          id: `${school.id}-${t}-${n}`,
          designId: design.id,
          schoolId: school.id,
          teacherId: `${school.id}-t${t}`,
          subject: design.subject,
          grade,
          codes: design.codes,
          libraryIds: design.libraryIds,
          materialIds: design.materialIds,
          week,
          results,
        })
      }
    }
  }
  return lessons
}

export const DISTRICT_LESSONS: DistrictLesson[] = generateLessons()
