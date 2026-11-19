// A teacher's classroom materials, arranged for the class they're working on:
// what serves this subject first (in the order that subject reaches for things),
// then what serves every subject, then the rest. With no subject picked, the
// materials stay grouped by type. Pure: the Materials widget reads storage and
// passes the selection in.

import {
  CLASSROOM_RESOURCE_CATEGORIES,
  CLASSROOM_RESOURCE_OPTIONS,
  customMaterialSubjects,
  type CustomClassroomResource,
  type MaterialSubject,
} from "./classroom-resources"

export interface MyMaterial {
  /** Built-in id, or "custom:<label>". */
  key: string
  label: string
  category: string
  subjects: MaterialSubject[]
  custom: boolean
}

export interface MaterialGroup {
  id: "subject" | "general" | "other" | string
  label: string
  items: MyMaterial[]
}

/** Which material types each subject reaches for first. A subject not listed
 *  uses the categories' own order. Math puts manipulatives first, Language
 *  books and the reading spaces, Science the lab (spaces, then equipment). */
const CATEGORY_PRIORITY: Partial<Record<MaterialSubject, string[]>> = {
  Math: ["math-manipulatives", "supplies", "print-resources", "digital-resources", "digital-tools", "technology", "spaces"],
  Language: ["print-resources", "spaces", "digital-resources", "digital-tools", "supplies", "technology", "math-manipulatives"],
  FSL: ["print-resources", "digital-resources", "digital-tools", "spaces", "supplies", "technology", "math-manipulatives"],
  Science: ["spaces", "supplies", "technology", "math-manipulatives", "digital-resources", "digital-tools", "print-resources"],
}

const DEFAULT_ORDER = CLASSROOM_RESOURCE_CATEGORIES.map((c) => c.id)

function categoryRank(subject: MaterialSubject | "", category: string): number {
  const order = (subject && CATEGORY_PRIORITY[subject]) || DEFAULT_ORDER
  const i = order.indexOf(category)
  return i === -1 ? order.length : i
}

/** The materials the teacher has: ticked built-ins plus their own. */
export function listMyMaterials(selectedIds: string[], customs: CustomClassroomResource[]): MyMaterial[] {
  const selected = new Set(selectedIds)
  const builtIns = CLASSROOM_RESOURCE_OPTIONS.filter((o) => selected.has(o.id)).map((o) => ({
    key: o.id,
    label: o.label,
    category: o.category,
    subjects: o.subjects,
    custom: false,
  }))
  const own = customs.map((c) => ({
    key: `custom:${c.label}`,
    label: c.label,
    category: c.category,
    subjects: customMaterialSubjects(c),
    custom: true,
  }))
  return [...builtIns, ...own]
}

function sortFor(subject: MaterialSubject | "", items: MyMaterial[]): MyMaterial[] {
  return [...items].sort(
    (a, b) => categoryRank(subject, a.category) - categoryRank(subject, b.category) || a.label.localeCompare(b.label),
  )
}

/**
 * Groups for the widget. With a subject: "For <subject>", "Every subject"
 * (General), "Other subjects", each sorted by that subject's category order.
 * Without one: a group per material type. Empty groups are left out.
 */
export function groupMaterials(items: MyMaterial[], subject: MaterialSubject | "", subjectLabel: string = subject): MaterialGroup[] {
  if (!subject) {
    return CLASSROOM_RESOURCE_CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      items: items.filter((m) => m.category === c.id).sort((a, b) => a.label.localeCompare(b.label)),
    })).filter((g) => g.items.length > 0)
  }
  const mine = items.filter((m) => m.subjects.includes(subject))
  const general = items.filter((m) => m.subjects.includes("General"))
  const other = items.filter((m) => !m.subjects.includes(subject) && !m.subjects.includes("General"))
  return [
    { id: "subject", label: `For ${subjectLabel}`, items: sortFor(subject, mine) },
    { id: "general", label: "Every subject", items: sortFor(subject, general) },
    { id: "other", label: "Other subjects", items: sortFor(subject, other) },
  ].filter((g) => g.items.length > 0)
}

/** Built-in materials for this subject the teacher hasn't added, in the
 *  subject's order: quick adds that make the list fit their room. */
export function suggestionsFor(subject: MaterialSubject | "", selectedIds: string[], limit = 6): MyMaterial[] {
  if (!subject) return []
  const selected = new Set(selectedIds)
  const candidates = CLASSROOM_RESOURCE_OPTIONS.filter((o) => !selected.has(o.id) && o.subjects.includes(subject)).map((o) => ({
    key: o.id,
    label: o.label,
    category: o.category,
    subjects: o.subjects,
    custom: false,
  }))
  return sortFor(subject, candidates).slice(0, limit)
}
