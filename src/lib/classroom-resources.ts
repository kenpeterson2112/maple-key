export interface ClassroomResourceOption {
  id: string
  label: string
  category: string
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
  { id: "base-ten-blocks", label: "Base Ten Blocks", category: "math-manipulatives" },
  { id: "cuisenaire-rods", label: "Cuisenaire Rods", category: "math-manipulatives" },
  { id: "pattern-blocks", label: "Pattern Blocks", category: "math-manipulatives" },
  { id: "fraction-tiles", label: "Fraction Tiles", category: "math-manipulatives" },
  { id: "connecting-cubes", label: "Connecting Cubes", category: "math-manipulatives" },
  { id: "geoboards", label: "Geoboards", category: "math-manipulatives" },
  { id: "tangrams", label: "Tangrams", category: "math-manipulatives" },
  { id: "algebra-tiles", label: "Algebra Tiles", category: "math-manipulatives" },
  { id: "two-colour-counters", label: "Two-Colour Counters", category: "math-manipulatives" },
  { id: "rekenreks", label: "Rekenreks", category: "math-manipulatives" },
  { id: "geometric-solids", label: "Geometric Solids", category: "math-manipulatives" },
  { id: "rulers-measuring", label: "Rulers & Measuring Tapes", category: "math-manipulatives" },
  { id: "protractors", label: "Protractors", category: "math-manipulatives" },
  { id: "dice", label: "Dice (various)", category: "math-manipulatives" },
  { id: "spinners", label: "Spinners", category: "math-manipulatives" },
  // Technology
  { id: "projector", label: "Projector", category: "technology" },
  { id: "smart-board", label: "Interactive Whiteboard", category: "technology" },
  { id: "document-camera", label: "Document Camera", category: "technology" },
  { id: "chromebook-cart", label: "Chromebook Cart", category: "technology" },
  { id: "ipad-cart", label: "iPad / Tablet Cart", category: "technology" },
  { id: "student-clickers", label: "Student Response Clickers", category: "technology" },
  { id: "3d-printer", label: "3D Printer", category: "technology" },
  { id: "coding-kits", label: "Coding Kits (Sphero / Micro:bit)", category: "technology" },
  // Spaces & Furniture
  { id: "whiteboard", label: "Whiteboard", category: "spaces" },
  { id: "chalkboard", label: "Chalkboard", category: "spaces" },
  { id: "bulletin-board", label: "Bulletin Board Space", category: "spaces" },
  { id: "flexible-seating", label: "Flexible Seating", category: "spaces" },
  { id: "standing-desks", label: "Standing Desks", category: "spaces" },
  { id: "carpet-area", label: "Carpet / Meeting Area", category: "spaces" },
  { id: "outdoor-classroom", label: "Outdoor Classroom", category: "spaces" },
  { id: "maker-space", label: "Maker Space Access", category: "spaces" },
  { id: "library-access", label: "School Library Access", category: "spaces" },
  { id: "science-lab", label: "Science Lab Access", category: "spaces" },
  // Supplies & Materials
  { id: "graph-paper", label: "Graph Paper", category: "supplies" },
  { id: "construction-paper", label: "Construction Paper", category: "supplies" },
  { id: "art-supplies", label: "Art Supplies", category: "supplies" },
  { id: "math-games", label: "Math Games / Card Games", category: "supplies" },
  { id: "whiteboards-mini", label: "Mini Whiteboards", category: "supplies" },
  { id: "sticky-notes", label: "Sticky Notes / Chart Paper", category: "supplies" },
  { id: "calculators", label: "Calculators (class set)", category: "supplies" },
  { id: "science-equipment", label: "Basic Science Equipment", category: "supplies" },
  // Print Resources
  { id: "nelson-literacy", label: "Nelson Literacy", category: "print-resources" },
  { id: "levelled-readers", label: "Levelled Readers", category: "print-resources" },
  { id: "nelson-math", label: "Nelson Math", category: "print-resources" },
  { id: "math-up", label: "Math UP", category: "print-resources" },
  // Digital Resources
  { id: "edwin", label: "Edwin", category: "digital-resources" },
  { id: "knowledgehook", label: "Knowledgehook", category: "digital-resources" },
  { id: "ixl", label: "IXL", category: "digital-resources" },
  { id: "myon", label: "MyON", category: "digital-resources" },
  // Digital Tools
  { id: "book-creator", label: "Book Creator", category: "digital-tools" },
  { id: "pixton", label: "Pixton", category: "digital-tools" },
  { id: "canva-education", label: "Canva for Education", category: "digital-tools" },
  { id: "padlet", label: "Padlet", category: "digital-tools" },
  { id: "kahoot", label: "Kahoot", category: "digital-tools" },
]

const STORAGE_KEY = "maplekey_classroom"
const CUSTOM_STORAGE_KEY = "maplekey_classroom_custom"

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
}

export function getClassroomResourceLabels(ids: string[]): string[] {
  return ids.flatMap((id) => {
    const option = CLASSROOM_RESOURCE_OPTIONS.find((o) => o.id === id)
    return option ? [option.label] : []
  })
}

export interface CustomClassroomResource {
  label: string
  category: string
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
        return [entry as CustomClassroomResource]
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
