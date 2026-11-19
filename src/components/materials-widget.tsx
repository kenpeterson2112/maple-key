"use client"

import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus } from "lucide-react"
import { SUBJECTS } from "@/components/hero-personalize"
import { CATEGORY_DOT } from "@/components/materials-summary"
import { useGlobalFilters } from "@/lib/global-filters"
import {
  CLASSROOM_RESOURCE_CATEGORIES,
  getClassroomResources,
  getCustomClassroomResources,
  isMaterialSubject,
  setClassroomResources,
  subscribeMaterials,
} from "@/lib/classroom-resources"
import { groupMaterials, listMyMaterials, suggestionsFor, type MyMaterial } from "@/lib/materials-for-subject"

// The landing page's Materials widget: what the teacher has in their room,
// browsable in place, ordered for the class in the top nav (Math puts the
// manipulatives first, Language the books and reading spaces, Science the lab),
// with quick adds for that subject. It replaces the header's Materials button.
// Edits happen in the Classroom profile; the widget only adds from suggestions.

// Short names for the type filters, so they fit one row in a narrow column.
const SHORT_LABEL: Record<string, string> = {
  "math-manipulatives": "Manipulatives",
  technology: "Tech",
  spaces: "Spaces",
  supplies: "Supplies",
  "print-resources": "Print",
  "digital-resources": "Digital",
  "digital-tools": "Tools",
}

function useMyMaterials() {
  const read = () => ({ ids: getClassroomResources(), customs: getCustomClassroomResources() })
  const [state, setState] = useState(read)
  useEffect(() => subscribeMaterials(() => setState(read())), [])
  return state
}

export default function MaterialsWidget({ onEdit }: { onEdit: () => void }) {
  const { state: filters } = useGlobalFilters()
  const { ids, customs } = useMyMaterials()
  const [category, setCategory] = useState<string>("all")

  const subject = isMaterialSubject(filters.subject) ? filters.subject : ""
  const meta = SUBJECTS.find((s) => s.value === subject)
  const subjectLabel = meta?.label ?? subject
  const color = meta?.color ?? "var(--primary)"

  const all = useMemo(() => listMyMaterials(ids, customs), [ids, customs])
  const shown = category === "all" ? all : all.filter((m) => m.category === category)
  const groups = useMemo(() => groupMaterials(shown, subject, subjectLabel), [shown, subject, subjectLabel])
  const suggestions = useMemo(() => suggestionsFor(subject, ids, 6), [subject, ids])
  const fits = subject ? all.filter((m) => m.subjects.includes(subject)).length : 0

  // Only the types the teacher actually has, so every filter shows something.
  const presentCategories = CLASSROOM_RESOURCE_CATEGORIES.filter((c) => all.some((m) => m.category === c.id))
  useEffect(() => {
    if (category !== "all" && !presentCategories.some((c) => c.id === category)) setCategory("all")
  }, [category, presentCategories])

  const add = (id: string) => setClassroomResources([...ids, id])

  const summary =
    all.length === 0
      ? "Tell Maple Key what's in your room, and lessons plan around what you have."
      : subject
        ? fits > 0
          ? `${fits} of your ${all.length} fit ${subjectLabel}, so they come first.`
          : `None of yours are tagged for ${subjectLabel} yet. Add some below.`
        : "Everything in your room, by type. Pick a subject to see what fits it first."

  return (
    <section aria-labelledby="home-materials-heading" className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 id="home-materials-heading" className="font-display text-xl font-semibold text-card-foreground">
          Your materials
          {all.length > 0 && <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">{all.length}</span>}
        </h2>
        {all.length > 0 && (
          <button
            type="button"
            onClick={onEdit}
            className="flex min-h-8 flex-shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-secondary-strong hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </button>
        )}
      </div>
      <p className="-mt-1 text-sm text-muted-foreground">{summary}</p>

      {all.length === 0 && (
        <button
          type="button"
          onClick={onEdit}
          className="self-start rounded-lg border border-border-strong bg-card px-3 py-2 text-sm font-semibold text-secondary-strong hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Add your materials
        </button>
      )}

      {presentCategories.length > 1 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Show materials of type">
          <FilterChip label="All" count={all.length} active={category === "all"} onClick={() => setCategory("all")} />
          {presentCategories.map((c) => (
            <FilterChip
              key={c.id}
              label={SHORT_LABEL[c.id] ?? c.label}
              title={c.label}
              count={all.filter((m) => m.category === c.id).length}
              dot={CATEGORY_DOT[c.id]}
              active={category === c.id}
              onClick={() => setCategory(c.id)}
            />
          ))}
        </div>
      )}

      {groups.length > 0 && (
        <div className="-mx-2 max-h-80 overflow-y-auto px-2">
          {groups.map((g) => (
            <div key={g.id} className="py-1.5">
              <h3
                className="mb-1 flex items-baseline justify-between font-sans text-xs font-semibold uppercase tracking-wide"
                style={{ color: g.id === "subject" ? color : "var(--muted-foreground)" }}
              >
                {g.label}
                <span className="font-normal normal-case tracking-normal text-muted-foreground">{g.items.length}</span>
              </h3>
              <ul className="flex flex-col">
                {g.items.map((m) => (
                  <MaterialRow key={m.key} material={m} detail={g.id === "other" ? subjectsText(m) : undefined} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">Common for {subjectLabel}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {suggestions.map((m) => (
              <li key={m.key}>
                <button
                  type="button"
                  onClick={() => add(m.key)}
                  aria-label={`Add ${m.label} to your materials`}
                  className="flex min-h-8 items-center gap-1 rounded-full border border-dashed border-border-strong px-2.5 text-xs font-semibold text-foreground hover:border-secondary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus size={12} aria-hidden="true" />
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function subjectsText(m: MyMaterial): string {
  return m.subjects.map((s) => SUBJECTS.find((o) => o.value === s)?.label ?? s).join(", ")
}

function MaterialRow({ material: m, detail }: { material: MyMaterial; detail?: string }) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm">
      <span className={`size-2 flex-shrink-0 rounded-full ${CATEGORY_DOT[m.category] ?? "bg-muted-foreground"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-foreground">
        {m.label}
        {m.custom && <span className="ml-1.5 text-xs text-muted-foreground">(yours)</span>}
      </span>
      {detail && <span className="max-w-1/2 flex-shrink-0 truncate text-xs text-muted-foreground">{detail}</span>}
    </li>
  )
}

function FilterChip({
  label,
  count,
  active,
  dot,
  title,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  dot?: string
  title?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? "border-secondary bg-secondary-tint text-secondary-strong" : "border-border-strong text-foreground hover:bg-muted"
      }`}
    >
      {dot && <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />}
      {label}
      <span className="font-normal text-muted-foreground">{count}</span>
    </button>
  )
}
