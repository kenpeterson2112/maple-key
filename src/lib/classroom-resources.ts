import { SUBJECTS, type Subject } from "../../shared/resource-schema"

/** Which subjects a material serves. "General" is for anything that serves
 *  every subject (a projector, sticky notes) and is never mixed with a subject.
 *  Subjects come from schema/resource-schema.json, so a new subject is added
 *  there, not here. */
export type MaterialSubject = Subject | "General"

export interface ClassroomResourceOption {
  id: string
  label: string
  category: string
  /** One or more subjects, or ["General"]. Every built-in material is tagged
   *  (classroom-resources.test.ts checks it). */
  subjects: MaterialSubject[]
}

export interface ClassroomResourceCategory {
  id: string
  label: string
  color: string
}

export const CLASSROOM_RESOURCE_CATEGORIES: ClassroomResourceCategory[] = [
  { id: "math-manipulatives", label: "Math Manipulatives", color: "emerald" },
  { id: "technology", label: "Technology", color: "blue" },
  { id: "spaces", label: "Spaces & Furniture", color: "amber" },
  { id: "supplies", label: "Supplies & Materials", color: "violet" },
  { id: "print-resources", label: "Print Resources", color: "orange" },
  { id: "digital-resources", label: "Digital Resources", color: "rose" },
  { id: "digital-tools", label: "Digital Tools", color: "cyan" },
]

export const CLASSROOM_RESOURCE_OPTIONS: ClassroomResourceOption[] = [
  // Math Manipulatives
  { id: "base-ten-blocks", label: "Base Ten Blocks", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "cuisenaire-rods", label: "Cuisenaire Rods", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "pattern-blocks", label: "Pattern Blocks", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "fraction-tiles", label: "Fraction Tiles", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "connecting-cubes", label: "Connecting Cubes", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "geoboards", label: "Geoboards", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "tangrams", label: "Tangrams", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "algebra-tiles", label: "Algebra Tiles", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "two-colour-counters", label: "Two-Colour Counters", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "rekenreks", label: "Rekenreks", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "geometric-solids", label: "Geometric Solids", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "rulers-measuring", label: "Rulers & Measuring Tapes", category: "math-manipulatives" , subjects: ["Math", "Science"] },
  { id: "protractors", label: "Protractors", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "dice", label: "Dice (various)", category: "math-manipulatives" , subjects: ["Math"] },
  { id: "spinners", label: "Spinners", category: "math-manipulatives" , subjects: ["Math"] },
  // Technology
  { id: "projector", label: "Projector", category: "technology" , subjects: ["General"] },
  { id: "smart-board", label: "Interactive Whiteboard", category: "technology" , subjects: ["General"] },
  { id: "document-camera", label: "Document Camera", category: "technology" , subjects: ["General"] },
  { id: "chromebook-cart", label: "Chromebook Cart", category: "technology" , subjects: ["General"] },
  { id: "ipad-cart", label: "iPad / Tablet Cart", category: "technology" , subjects: ["General"] },
  { id: "student-clickers", label: "Student Response Clickers", category: "technology" , subjects: ["General"] },
  { id: "3d-printer", label: "3D Printer", category: "technology" , subjects: ["Science"] },
  { id: "coding-kits", label: "Coding Kits (Sphero / Micro:bit)", category: "technology" , subjects: ["Math", "Science"] },
  // Spaces & Furniture
  { id: "whiteboard", label: "Whiteboard", category: "spaces" , subjects: ["General"] },
  { id: "chalkboard", label: "Chalkboard", category: "spaces" , subjects: ["General"] },
  { id: "bulletin-board", label: "Bulletin Board Space", category: "spaces" , subjects: ["General"] },
  { id: "flexible-seating", label: "Flexible Seating", category: "spaces" , subjects: ["General"] },
  { id: "standing-desks", label: "Standing Desks", category: "spaces" , subjects: ["General"] },
  { id: "carpet-area", label: "Carpet / Meeting Area", category: "spaces" , subjects: ["Language"] },
  { id: "outdoor-classroom", label: "Outdoor Classroom", category: "spaces" , subjects: ["Science", "Health & Physical Education"] },
  { id: "maker-space", label: "Maker Space Access", category: "spaces" , subjects: ["Science"] },
  { id: "library-access", label: "School Library Access", category: "spaces" , subjects: ["Language"] },
  { id: "science-lab", label: "Science Lab Access", category: "spaces" , subjects: ["Science"] },
  // Supplies & Materials
  { id: "graph-paper", label: "Graph Paper", category: "supplies" , subjects: ["Math"] },
  { id: "construction-paper", label: "Construction Paper", category: "supplies" , subjects: ["General"] },
  { id: "art-supplies", label: "Art Supplies", category: "supplies" , subjects: ["General"] },
  { id: "math-games", label: "Math Games / Card Games", category: "supplies" , subjects: ["Math"] },
  { id: "whiteboards-mini", label: "Mini Whiteboards", category: "supplies" , subjects: ["General"] },
  { id: "sticky-notes", label: "Sticky Notes / Chart Paper", category: "supplies" , subjects: ["General"] },
  { id: "calculators", label: "Calculators (class set)", category: "supplies" , subjects: ["Math", "Science"] },
  { id: "science-equipment", label: "Basic Science Equipment", category: "supplies" , subjects: ["Science"] },
  // Print Resources
  { id: "nelson-literacy", label: "Nelson Literacy", category: "print-resources" , subjects: ["Language"] },
  { id: "levelled-readers", label: "Levelled Readers", category: "print-resources" , subjects: ["Language"] },
  { id: "nelson-math", label: "Nelson Math", category: "print-resources" , subjects: ["Math"] },
  { id: "math-up", label: "Math UP", category: "print-resources" , subjects: ["Math"] },
  // Digital Resources
  { id: "edwin", label: "Edwin", category: "digital-resources" , subjects: ["General"] },
  { id: "knowledgehook", label: "Knowledgehook", category: "digital-resources" , subjects: ["Math"] },
  { id: "ixl", label: "IXL", category: "digital-resources" , subjects: ["Math", "Language"] },
  { id: "myon", label: "MyON", category: "digital-resources" , subjects: ["Language"] },
  // Digital Tools
  { id: "book-creator", label: "Book Creator", category: "digital-tools" , subjects: ["Language"] },
  { id: "pixton", label: "Pixton", category: "digital-tools" , subjects: ["Language"] },
  { id: "canva-education", label: "Canva for Education", category: "digital-tools" , subjects: ["General"] },
  { id: "padlet", label: "Padlet", category: "digital-tools" , subjects: ["General"] },
  { id: "kahoot", label: "Kahoot", category: "digital-tools" , subjects: ["General"] },
]

const STORAGE_KEY = "maplekey_classroom"
const CUSTOM_STORAGE_KEY = "maplekey_classroom_custom"

/** Fired on window whenever this tab saves materials, so views that show them
 *  (the landing page's Materials widget) can refresh. Other tabs get the
 *  browser's own "storage" event; `subscribeMaterials` covers both. */
const MATERIALS_CHANGED = "mk-materials-changed"

function announce(): void {
  window.dispatchEvent(new Event(MATERIALS_CHANGED))
}

export function subscribeMaterials(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === CUSTOM_STORAGE_KEY) onChange()
  }
  window.addEventListener(MATERIALS_CHANGED, onChange)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(MATERIALS_CHANGED, onChange)
    window.removeEventListener("storage", onStorage)
  }
}

export function getClassroomResources(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    // ignore
  }
  return []
}

export function setClassroomResources(ids: string[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore quota / privacy errors
  }
  announce()
}

export function getClassroomResourceLabels(ids: string[]): string[] {
  return ids.flatMap((id) => {
    const option = CLASSROOM_RESOURCE_OPTIONS.find((o) => o.id === id)
    return option ? [option.label] : []
  })
}

export function isMaterialSubject(value: unknown): value is MaterialSubject {
  return value === "General" || (SUBJECTS as readonly unknown[]).includes(value)
}

/** A built-in material's subjects, by id; unknown ids are General. */
export function materialSubjects(id: string): MaterialSubject[] {
  return CLASSROOM_RESOURCE_OPTIONS.find((o) => o.id === id)?.subjects ?? ["General"]
}

export interface CustomClassroomResource {
  label: string
  category: string
  /** Set when the teacher tags it; untagged custom materials count as General. */
  subjects?: MaterialSubject[]
}

/** A custom material's subjects: what the teacher tagged, else General. */
export function customMaterialSubjects(item: CustomClassroomResource): MaterialSubject[] {
  return item.subjects && item.subjects.length > 0 ? item.subjects : ["General"]
}

export function getCustomClassroomResources(): CustomClassroomResource[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(CUSTOM_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((entry) => {
      if (
        entry &&
        typeof entry === "object" &&
        typeof (entry as CustomClassroomResource).label === "string" &&
        typeof (entry as CustomClassroomResource).category === "string"
      ) {
        const { label, category, subjects } = entry as CustomClassroomResource
        // Keep only valid tags, so a renamed subject can't leave a stray one behind.
        const valid = Array.isArray(subjects) ? subjects.filter(isMaterialSubject) : []
        return [valid.length > 0 ? { label, category, subjects: valid } : { label, category }]
      }
      return []
    })
  } catch {
    return []
  }
}

export function setCustomClassroomResources(items: CustomClassroomResource[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore quota / privacy errors
  }
  announce()
}

export interface MaterialsSnapshotRow {
  id: string
  label: string
  color: string
  items: string[]
}

export interface MaterialsSnapshot {
  byCategory: MaterialsSnapshotRow[]
  total: number
}

export function readMaterialsSnapshot(): MaterialsSnapshot {
  const selectedIds = new Set(getClassroomResources())
  const customs = getCustomClassroomResources()
  const byCategory = CLASSROOM_RESOURCE_CATEGORIES.map((cat) => {
    const catalogLabels = CLASSROOM_RESOURCE_OPTIONS
      .filter((o) => o.category === cat.id && selectedIds.has(o.id))
      .map((o) => o.label)
    const customLabels = customs.filter((c) => c.category === cat.id).map((c) => c.label)
    return {
      id: cat.id,
      label: cat.label,
      color: cat.color,
      items: [...catalogLabels, ...customLabels],
    }
  })
  const total = byCategory.reduce((sum, row) => sum + row.items.length, 0)
  return { byCategory, total }
}

export function getAllSelectedMaterialLabels(): string[] {
  const snapshot = readMaterialsSnapshot()
  return snapshot.byCategory.flatMap((row) => row.items)
}
