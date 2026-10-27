import { useMemo, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  Award,
  BookMarked,
  BookOpen,
  Info,
  Library,
  PackageOpen,
  Shapes,
  Target,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { withBasePath } from "@/lib/base-path"
import type { LevelCounts } from "@/lib/assessment-results"
import { CLASSROOM_RESOURCE_CATEGORIES, CLASSROOM_RESOURCE_OPTIONS } from "@/lib/classroom-resources"
import {
  BOARD_RESOURCES,
  DISTRICT_LESSONS,
  DISTRICT_SCHOOLS,
  DISTRICT_SUBJECTS,
  LIBRARY_RESOURCES,
  RESOURCE_SOURCES,
  SAMPLE_DISTRICT,
  type SourceKind,
} from "@/lib/district-sample"
import {
  MIN_DESIGN_RESPONSES,
  MIN_DESIGN_TEACHERS,
  computeKpis,
  designImpact,
  expectationCoverage,
  filterLessons,
  lessonsByWeek,
  libraryUsage,
  materialUsage,
  resourceMix,
  sourceMixBySchool,
  sourceUsage,
  subjectBreakdown,
  totalResponses,
  type DistrictFilter,
  type ExpectationRow,
  type ExpectationStatus,
  type SchoolSourceRow,
  type SourceGrouping,
  type SourceRow,
} from "@/lib/district-metrics"

// District-leader view of how teachers plan with Maple Key — reached via
// #district (see main.tsx). Runs entirely on the generated sample in
// district-sample.ts; nothing here reads teacher localStorage.

const ALL: DistrictFilter = { schoolId: "", subject: "", grade: "" }

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`)
const pts = (n: number | null) => (n === null ? "—" : `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n * 100))} pts`)
const fmt = (n: number) => n.toLocaleString("en-CA")

function materialLabel(id: string): string {
  return CLASSROOM_RESOURCE_OPTIONS.find((o) => o.id === id)?.label ?? id
}

function materialCategory(id: string): string {
  const category = CLASSROOM_RESOURCE_OPTIONS.find((o) => o.id === id)?.category
  return CLASSROOM_RESOURCE_CATEGORIES.find((c) => c.id === category)?.label ?? ""
}

function libraryTitle(id: string): string {
  return LIBRARY_RESOURCES.find((r) => r.id === id)?.title ?? id
}

function boardResourceLabel(id: string): string {
  const item = BOARD_RESOURCES.find((b) => b.id === id)
  if (!item) return id
  const source = RESOURCE_SOURCES.find((s) => s.id === item.sourceId)
  return source && source.kind === "licensed" ? `${item.title} (${source.name})` : item.title
}

const DISTRICT_TEACHERS = DISTRICT_SCHOOLS.reduce((sum, s) => sum + s.teachers, 0)

export default function DistrictSpace() {
  const [filter, setFilter] = useState<DistrictFilter>(ALL)
  const lessons = useMemo(() => filterLessons(DISTRICT_LESSONS, filter), [filter])

  const kpis = useMemo(() => computeKpis(lessons, filter), [lessons, filter])
  const weekly = useMemo(() => lessonsByWeek(lessons), [lessons])
  const subjects = useMemo(() => subjectBreakdown(lessons), [lessons])
  const library = useMemo(() => libraryUsage(lessons), [lessons])
  const materials = useMemo(() => materialUsage(lessons), [lessons])
  const mix = useMemo(() => resourceMix(lessons), [lessons])
  const [grouping, setGrouping] = useState<SourceGrouping>("provider")
  const sources = useMemo(() => sourceUsage(lessons, grouping), [lessons, grouping])
  const schoolSources = useMemo(() => sourceMixBySchool(lessons, grouping), [lessons, grouping])
  const coverage = useMemo(() => expectationCoverage(lessons, filter), [lessons, filter])
  const designs = useMemo(() => designImpact(lessons), [lessons])

  const isFiltered = filter.schoolId || filter.subject || filter.grade

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-6">
          <img
            src={withBasePath("/maple-key-logo.png")}
            alt="Maple Key"
            width={785}
            height={673}
            className="h-10 w-auto object-contain"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold md:text-lg">District Insights</h1>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                Sample data
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {SAMPLE_DISTRICT.name} · Grades 6–8 · {SAMPLE_DISTRICT.term}
            </p>
          </div>
          <a
            href={withBasePath("/")}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted/40"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to Maple Key</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6">
        <FilterBar filter={filter} onChange={setFilter} onReset={isFiltered ? () => setFilter(ALL) : undefined} />

        {/* Headline */}
        <section aria-label="Headline numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            icon={Users}
            label="Teachers planning"
            value={fmt(kpis.activeTeachers)}
            detail={`of ${fmt(kpis.totalTeachers)} grade 6–8 teachers · ${pct(kpis.totalTeachers ? kpis.activeTeachers / kpis.totalTeachers : null)}`}
          />
          <Kpi
            icon={BookOpen}
            label="Lessons planned"
            value={fmt(kpis.lessons)}
            detail={`${pct(kpis.quickCheckRate)} ended with a Quick Check`}
          />
          <Kpi
            icon={Target}
            label="Expectations taught"
            value={`${kpis.expectationsTaught} / ${kpis.expectationsTotal}`}
            detail="overall expectations reached at least once"
          />
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Award size={14} className="text-primary" />
              Meeting the standard
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{pct(kpis.meeting)}</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Levels 3–4 across {fmt(kpis.responses)} responses
            </p>
            <LevelBar levels={kpis.levels} />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-5">
          <Panel title="Planning activity" subtitle="Lessons planned per week" className="lg:col-span-2">
            <WeeklyBars data={weekly} />
          </Panel>
          <Panel title="Subjects" subtitle="Where planning time goes, and how those lessons land" className="lg:col-span-3">
            <SubjectRows rows={subjects} />
          </Panel>
        </div>

        {/* Resources */}
        <section className="space-y-4">
          <SectionHeading
            icon={Library}
            title="Resources teachers are building with"
            blurb="Maple Key plans around everything a teacher can reach: the curated library, the board's licensed programs and district-made units, and what is physically in each classroom — manipulatives, tech carts, lab space. That last part is invisible to every other planning tool."
          />
          <Panel
            title="Where resources come from"
            subtitle="Share of lessons that drew on each source"
            action={<GroupingToggle value={grouping} onChange={setGrouping} />}
          >
            <SourceRows rows={sources} licenceScale={kpis.totalTeachers / DISTRICT_TEACHERS} />
          </Panel>
          <Panel title="Source mix by school" subtitle="Share of each school's lessons that drew on each source">
            <SchoolSourceMatrix rows={schoolSources} columns={sources} grouping={grouping} />
          </Panel>
          <Panel
            title="Pairing resources with hands-on materials"
            subtitle="Share of Quick Check responses meeting the standard, by what the lesson was built from"
          >
            <MixBars rows={mix} />
          </Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Library resources" subtitle="Most-planned resources from the Maple Key library">
              <ResourceTable
                rows={library.slice(0, 8).map((r) => ({
                  key: r.resource.id,
                  title: r.resource.title,
                  meta: `${r.resource.publisher} · ${r.resource.type}`,
                  lessons: r.lessons,
                  reach: `${r.schools} ${r.schools === 1 ? "school" : "schools"}`,
                  lift: r.lift,
                }))}
              />
            </Panel>
            <Panel title="In-class materials" subtitle="From teachers' classroom Materials profiles">
              <ResourceTable
                rows={materials.slice(0, 8).map((r) => ({
                  key: r.id,
                  title: materialLabel(r.id),
                  meta: `${materialCategory(r.id)} · in ${pct(r.inventory)} of classrooms`,
                  lessons: r.lessons,
                  reach: `${r.teachers} ${r.teachers === 1 ? "teacher" : "teachers"}`,
                  lift: r.lift,
                }))}
              />
            </Panel>
          </div>
          <UntappedCallout rows={materials.filter((m) => m.untapped)} />
        </section>

        {/* Expectations */}
        <section className="space-y-4">
          <SectionHeading
            icon={Target}
            title="Curriculum expectations"
            blurb="Every Maple Key lesson declares the Ontario overall expectations it teaches, and its Quick Check is tagged to the same codes — so coverage and results line up one-to-one."
          />
          <Panel title="Coverage and results by expectation" subtitle="Each tile is one overall expectation">
            <CoverageGrid rows={coverage} />
          </Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Taught, but students need support" subtitle="Lowest share meeting the standard">
              <ExpectationList
                rows={coverage
                  .filter((r) => r.status === "needs-support" || r.status === "approaching")
                  .sort((a, b) => (a.meeting ?? 1) - (b.meeting ?? 1))
                  .slice(0, 6)}
                empty="No taught expectation is below 62% meeting."
                value={(r) => pct(r.meeting)}
              />
            </Panel>
            <Panel title="Not yet taught this term" subtitle="Worth checking against long-range plans">
              <ExpectationList
                rows={coverage.filter((r) => r.status === "not-taught").slice(0, 6)}
                empty="Every expectation in scope has been taught at least once."
                value={() => "0 lessons"}
                more={Math.max(0, coverage.filter((r) => r.status === "not-taught").length - 6)}
              />
            </Panel>
          </div>
        </section>

        {/* Lesson impact */}
        <section className="space-y-4">
          <SectionHeading
            icon={Award}
            title="Lessons with the greatest impact"
            blurb={`Lessons grouped by design — the same expectations, library resources and in-class materials — and ranked by Quick Check results. Only designs taught by at least ${MIN_DESIGN_TEACHERS} teachers with ${MIN_DESIGN_RESPONSES}+ responses are ranked.`}
          />
          {designs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Not enough Quick Check evidence in this slice to rank lessons yet.
            </p>
          ) : (
            <ol className="grid gap-3 md:grid-cols-2">
              {designs.slice(0, 6).map((row, i) => (
                <DesignCard key={row.design.id} rank={i + 1} row={row} />
              ))}
            </ol>
          )}
        </section>

        <MethodNote />
      </main>
    </div>
  )
}

// ---- Layout pieces ----

function FilterBar({
  filter,
  onChange,
  onReset,
}: {
  filter: DistrictFilter
  onChange: (f: DistrictFilter) => void
  onReset?: () => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="School"
        value={filter.schoolId}
        onChange={(schoolId) => onChange({ ...filter, schoolId })}
        options={[{ value: "", label: "All schools" }, ...DISTRICT_SCHOOLS.map((s) => ({ value: s.id, label: s.name }))]}
      />
      <Select
        label="Subject"
        value={filter.subject}
        onChange={(subject) => onChange({ ...filter, subject })}
        options={[{ value: "", label: "All subjects" }, ...DISTRICT_SUBJECTS.map((s) => ({ value: s, label: s }))]}
      />
      <Select
        label="Grade"
        value={filter.grade}
        onChange={(grade) => onChange({ ...filter, grade })}
        options={[{ value: "", label: "Grades 6–8" }, ...SAMPLE_DISTRICT.grades.map((g) => ({ value: g, label: `Grade ${g}` }))]}
      />
      {onReset && (
        <button type="button" onClick={onReset} className="pb-2 text-sm font-semibold text-primary hover:underline">
          Clear filters
        </button>
      )}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs font-semibold text-muted-foreground sm:flex-none">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon size={14} className="text-primary" />
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string
  subtitle?: string
  /** Right-aligned control in the panel header. */
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-border bg-card p-4 md:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function SectionHeading({ icon: Icon, title, blurb }: { icon: typeof Users; title: string; blurb: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Icon size={18} className="text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">{blurb}</p>
      </div>
    </div>
  )
}

// ---- Charts ----

const LEVELS: { key: keyof LevelCounts; label: string; bar: string }[] = [
  { key: "level1", label: "Level 1", bar: "bg-signal-1" },
  { key: "level2", label: "Level 2", bar: "bg-signal-2" },
  { key: "level3", label: "Level 3", bar: "bg-signal-3" },
  { key: "level4", label: "Level 4", bar: "bg-signal-4" },
]

function LevelBar({ levels, legend = true }: { levels: LevelCounts; legend?: boolean }) {
  const total = totalResponses(levels)
  if (total === 0) return <div className="h-2.5 rounded-full bg-muted" title="No Quick Check data" />
  return (
    <div>
      <div className="flex h-2.5 gap-0.5" role="img" aria-label={LEVELS.map((l) => `${l.label} ${pct(levels[l.key] / total)}`).join(", ")}>
        {LEVELS.map((l) =>
          levels[l.key] > 0 ? (
            <div
              key={l.key}
              className={cn("rounded-sm first:rounded-l-full last:rounded-r-full", l.bar)}
              style={{ width: `${(levels[l.key] / total) * 100}%` }}
              title={`${l.label}: ${pct(levels[l.key] / total)} (${fmt(levels[l.key])})`}
            />
          ) : null
        )}
      </div>
      {legend && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {LEVELS.map((l) => (
            <span key={l.key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", l.bar)} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function WeeklyBars({ data }: { data: { week: string; lessons: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.lessons))
  const last = data[data.length - 1]
  return (
    <div>
      <div className="flex h-40 items-end gap-2" role="img" aria-label="Lessons planned per week">
        {data.map((d) => (
          <div key={d.week} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`Week of ${d.week}: ${d.lessons} lessons`}>
            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {d.lessons}
            </span>
            <div
              className="w-full rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary"
              style={{ height: `${(d.lessons / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 border-t border-border pt-1.5">
        {data.map((d, i) => (
          <span key={d.week} className="flex-1 text-center text-[10px] text-muted-foreground">
            {i % 2 === 0 ? d.week : ""}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{last.lessons} lessons</span> in the week of {last.week}
      </p>
    </div>
  )
}

function SubjectRows({ rows }: { rows: ReturnType<typeof subjectBreakdown> }) {
  const max = Math.max(1, ...rows.map((r) => r.lessons))
  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[7rem_1fr_9rem] gap-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
        <span>Subject</span>
        <span>Lessons planned</span>
        <span>Meeting standard</span>
      </div>
      {rows.map((r) => (
        <div key={r.subject} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[7rem_1fr_9rem]">
          <span className="text-sm font-semibold">{r.subject}</span>
          <div className="order-3 col-span-2 flex items-center gap-2 sm:order-none sm:col-span-1">
            <div className="h-3 flex-1">
              <div
                className="h-full rounded-r-sm bg-primary/70"
                style={{ width: `${(r.lessons / max) * 100}%` }}
                title={`${r.lessons} lessons by ${r.teachers} teachers`}
              />
            </div>
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{fmt(r.lessons)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-9 text-right text-xs font-semibold tabular-nums">{pct(r.meeting)}</span>
            <div className="hidden w-20 sm:block">
              <LevelBar levels={r.levels} legend={false} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MixBars({ rows }: { rows: ReturnType<typeof resourceMix> }) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[16rem_1fr_3rem]">
          <span className="text-sm">
            <span className="font-semibold">{r.label}</span>
            <span className="text-xs text-muted-foreground"> · {fmt(r.lessons)} lessons</span>
          </span>
          <div className="order-3 col-span-2 h-3 sm:order-none sm:col-span-1">
            <div
              className={cn("h-full rounded-r-sm", r.key === "both" ? "bg-primary" : "bg-muted-foreground/40")}
              style={{ width: `${(r.meeting ?? 0) * 100}%` }}
              title={`${r.label}: ${pct(r.meeting)} meeting the standard`}
            />
          </div>
          <span className="text-right text-sm font-bold tabular-nums">{pct(r.meeting)}</span>
        </div>
      ))}
    </div>
  )
}

function Lift({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-xs text-muted-foreground" title="No other lessons on the same expectations to compare against yet">
        —
      </span>
    )
  }
  const strong = value >= 0.05
  const weak = value <= -0.05
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        strong && "bg-signal-3 text-signal-3-foreground",
        weak && "bg-signal-1/20 text-signal-1-foreground",
        !strong && !weak && "bg-muted/60 text-muted-foreground"
      )}
      title="Difference in share meeting the standard vs. other lessons on the same expectations"
    >
      {pts(value)}
    </span>
  )
}

function ResourceTable({
  rows,
}: {
  rows: { key: string; title: string; meta: string; lessons: number; reach: string; lift: number | null }[]
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">None used in this slice.</p>
  return (
    <div>
      <div className="mb-2 grid grid-cols-[1fr_4rem_4.5rem] gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Resource</span>
        <span className="text-right">Lessons</span>
        <span className="text-right">Impact</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[1fr_4rem_4.5rem] items-center gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" title={r.title}>{r.title}</p>
              <p className="truncate text-xs text-muted-foreground">{r.meta} · {r.reach}</p>
            </div>
            <span className="text-right text-sm tabular-nums">{fmt(r.lessons)}</span>
            <span className="text-right"><Lift value={r.lift} /></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const KIND_BADGE: Record<SourceKind, string> = {
  licensed: "Licensed",
  district: "District-made",
  open: "Open",
}

function GroupingToggle({ value, onChange }: { value: SourceGrouping; onChange: (g: SourceGrouping) => void }) {
  const options: { id: SourceGrouping; label: string }[] = [
    { id: "provider", label: "By provider" },
    { id: "kind", label: "By type" },
  ]
  return (
    <div role="radiogroup" aria-label="Group sources" className="flex rounded-full border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            value === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SourceRows({ rows, licenceScale }: { rows: SourceRow[]; licenceScale: number }) {
  const max = Math.max(0.01, ...rows.map((r) => r.share))
  return (
    <div>
      <div className="mb-2 grid grid-cols-[1fr_3.5rem_4.5rem] gap-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[minmax(0,13rem)_1fr_3.5rem_4.5rem]">
        <span>Source</span>
        <span className="hidden sm:block">Share of lessons</span>
        <span className="text-right">Meeting</span>
        <span className="text-right">Impact</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => {
          // A licence covers the whole district; scale it to the school filter.
          const licensed = r.licensedTeachers ? Math.round(r.licensedTeachers * licenceScale) : 0
          return (
            <li
              key={r.id}
              className="grid grid-cols-[1fr_3.5rem_4.5rem] items-center gap-x-3 gap-y-1 py-2 sm:grid-cols-[minmax(0,13rem)_1fr_3.5rem_4.5rem]"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="truncate">{r.label}</span>
                  {r.label !== KIND_BADGE[r.kind] && !r.label.startsWith(KIND_BADGE[r.kind]) && (
                    <span className="flex-shrink-0 rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {KIND_BADGE[r.kind]}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {licensed > 0
                    ? `Used by ${r.teachers} of ${licensed} licensed teachers`
                    : `${r.teachers} ${r.teachers === 1 ? "teacher" : "teachers"} · ${r.schools} ${r.schools === 1 ? "school" : "schools"}`}
                </p>
              </div>
              <div className="order-last col-span-3 flex items-center gap-2 sm:order-none sm:col-span-1">
                <div className="h-3 flex-1">
                  <div
                    className="h-full rounded-r-sm bg-primary/70"
                    style={{ width: `${(r.share / max) * 100}%` }}
                    title={`${r.label}: ${r.lessons} of the lessons in this slice (${pct(r.share)})`}
                  />
                </div>
                <span className="w-9 text-right text-xs font-semibold tabular-nums">{pct(r.share)}</span>
              </div>
              <span className="text-right text-sm tabular-nums">{pct(r.meeting)}</span>
              <span className="text-right"><Lift value={r.lift} /></span>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        A lesson can draw on more than one source — a Nelson text with a GeoGebra applet — so shares don't add to 100%.
      </p>
    </div>
  )
}

// Sequential single hue: deeper orange = a larger share of the school's lessons.
function shareTile(share: number): string {
  if (share === 0) return "bg-muted/30 text-muted-foreground"
  if (share < 0.1) return "bg-primary/10 text-foreground"
  if (share < 0.25) return "bg-primary/25 text-foreground"
  if (share < 0.4) return "bg-primary/45 text-foreground"
  if (share < 0.6) return "bg-primary/70 text-primary-foreground"
  return "bg-primary text-primary-foreground"
}

function SchoolSourceMatrix({
  rows,
  columns,
  grouping,
}: {
  rows: SchoolSourceRow[]
  /** Same order as the ranked list above, so the two read together. */
  columns: SourceRow[]
  grouping: SourceGrouping
}) {
  const groups = columns
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No lessons in this slice.</p>
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[36rem] table-fixed border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 w-28 bg-card" />
            {groups.map((g) => (
              <th key={g.id} scope="col" className="px-0.5 pb-1 align-bottom text-[10px] font-semibold leading-tight text-muted-foreground">
                {grouping === "provider" ? g.label : KIND_BADGE[g.kind]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.schoolId}>
              <th scope="row" className="sticky left-0 whitespace-nowrap bg-card pr-2 text-left font-semibold">
                {r.schoolName.replace(/ (PS|Intermediate|Senior PS)$/, "")}
              </th>
              {groups.map((g) => (
                <td
                  key={g.id}
                  className={cn("h-8 rounded-md text-center tabular-nums", shareTile(r.shares[g.id]))}
                  title={`${r.schoolName} · ${g.label}: ${pct(r.shares[g.id])} of ${r.lessons} lessons`}
                >
                  {r.shares[g.id] ? pct(r.shares[g.id]) : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UntappedCallout({ rows }: { rows: ReturnType<typeof materialUsage> }) {
  if (rows.length === 0) return null
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 md:p-6">
      <p className="flex items-center gap-2 text-sm font-bold">
        <PackageOpen size={16} className="text-primary" />
        Already in classrooms, rarely planned with
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Materials most classrooms already own, where the few lessons that use them clearly outperform. A PD or
        lesson-sharing target that needs no new purchase.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-border bg-card p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Shapes size={14} className="text-primary" />
              {materialLabel(r.id)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              In {pct(r.inventory)} of classrooms · {r.lessons} lessons by {r.teachers} teachers
            </p>
            <p className="mt-2"><Lift value={r.lift} /></p>
          </li>
        ))}
      </ul>
    </div>
  )
}

const STATUS: Record<ExpectationStatus, { label: string; tile: string }> = {
  strong: { label: "75%+ meeting", tile: "bg-signal-4 text-signal-4-foreground" },
  "on-track": { label: "62–74%", tile: "bg-signal-3 text-signal-3-foreground" },
  approaching: { label: "50–61%", tile: "bg-signal-2 text-signal-2-foreground" },
  "needs-support": { label: "Under 50%", tile: "bg-signal-1 text-primary-foreground" },
  "not-taught": { label: "Not yet taught", tile: "border border-dashed border-muted-foreground/40 text-muted-foreground" },
}

function CoverageGrid({ rows }: { rows: ExpectationRow[] }) {
  // One strip per subject + grade, in catalog order.
  const groups = rows.reduce<Map<string, ExpectationRow[]>>((acc, r) => {
    const key = `${r.subject} · Grade ${r.grade}`
    acc.set(key, [...(acc.get(key) ?? []), r])
    return acc
  }, new Map())
  return (
    <div>
      <div className="space-y-3">
        {[...groups.entries()].map(([label, items]) => (
          <div key={label} className="grid gap-1.5 sm:grid-cols-[11rem_1fr] sm:items-center">
            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            <div className="flex flex-wrap gap-1">
              {items.map((r) => (
                <span
                  key={r.code}
                  className={cn("flex h-8 w-11 items-center justify-center rounded-md text-[11px] font-bold", STATUS[r.status].tile)}
                  title={`${r.code} ${r.title}\n${r.lessons ? `${r.lessons} lessons · ${r.teachers} teachers · ${pct(r.meeting)} meeting` : "Not yet taught"}`}
                >
                  {r.code}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3">
        {(["strong", "on-track", "approaching", "needs-support", "not-taught"] as ExpectationStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("h-3 w-4 rounded-sm", STATUS[s].tile)} />
            {STATUS[s].label}
          </span>
        ))}
      </div>
    </div>
  )
}

function ExpectationList({
  rows,
  empty,
  value,
  more = 0,
}: {
  rows: ExpectationRow[]
  empty: string
  value: (r: ExpectationRow) => string
  more?: number
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={`${r.subject}-${r.grade}-${r.code}`} className="flex items-center gap-3 py-2">
          <span className={cn("flex h-7 w-10 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold", STATUS[r.status].tile)}>
            {r.code}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" title={r.title}>{r.title}</p>
            <p className="text-xs text-muted-foreground">
              {r.subject} · Grade {r.grade}
              {r.lessons > 0 && ` · ${r.lessons} lessons`}
            </p>
          </div>
          <span className="text-sm font-semibold tabular-nums">{value(r)}</span>
        </li>
      ))}
      {more > 0 && <li className="pt-2 text-xs text-muted-foreground">+ {more} more in the grid above</li>}
    </ul>
  )
}

function DesignCard({ rank, row }: { rank: number; row: ReturnType<typeof designImpact>[number] }) {
  const { design } = row
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{design.title}</p>
          <p className="text-xs text-muted-foreground">
            {design.subject} · Grade {design.grade} · {design.codes.join(", ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tabular-nums">{pct(row.meeting)}</p>
          <p className="text-[10px] text-muted-foreground">meeting</p>
        </div>
      </div>

      {row.lift !== null && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Lift value={row.lift} />
          <span>vs. other lessons on {design.codes.length > 1 ? "these expectations" : design.codes[0]}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {design.libraryIds.map((id) => (
          <span key={id} className="flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-xs">
            <Library size={11} className="text-muted-foreground" />
            {libraryTitle(id)}
          </span>
        ))}
        {design.boardIds.map((id) => (
          <span key={id} className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
            <BookMarked size={11} className="text-muted-foreground" />
            {boardResourceLabel(id)}
          </span>
        ))}
        {design.materialIds.map((id) => (
          <span key={id} className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold">
            <Shapes size={11} className="text-primary" />
            {materialLabel(id)}
          </span>
        ))}
      </div>

      <p className="mt-auto border-t border-border pt-2 text-xs text-muted-foreground">
        {design.template} · {design.mode} · taught {row.lessons}× by {row.teachers} teachers at {row.schools}{" "}
        {row.schools === 1 ? "school" : "schools"} · {fmt(row.responses)} responses
      </p>
    </li>
  )
}

function MethodNote() {
  return (
    <aside className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground md:p-6">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
        <Info size={14} />
        How to read this
      </p>
      <ul className="list-disc space-y-1 pl-4">
        <li>
          <span className="font-semibold text-foreground">Meeting the standard</span> is the share of Quick Check
          responses at Growing Success Levels 3–4. Quick Checks are short, end-of-lesson signals — about one question
          per expectation — not report-card evidence.
        </li>
        <li>
          <span className="font-semibold text-foreground">Impact</span> compares lessons that used a resource, material
          or design with other lessons on the same expectations. It shows association, not cause: teachers who reach for
          manipulatives may differ in other ways too.
        </li>
        <li>
          Results are whole-class tallies. No student is identified, and individual teachers are never named — the
          finest grain is a school.
        </li>
        <li>
          This page runs on generated sample data for a fictional board. Today Quick Check results stay on each
          teacher's device; a live district view needs sign-in and a shared store first.
        </li>
      </ul>
    </aside>
  )
}
