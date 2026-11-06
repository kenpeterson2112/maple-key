import type { LevelCounts } from "./assessment-results"
import {
  DISTRICT_EXPECTATIONS,
  DISTRICT_SCHOOLS,
  DISTRICT_SUBJECTS,
  LESSON_DESIGNS,
  LIBRARY_RESOURCES,
  MATERIAL_INVENTORY,
  RESOURCE_SOURCES,
  SOURCE_KIND_LABELS,
  TERM_WEEKS,
  resourceSourceIds,
  type DistrictExpectation,
  type DistrictLesson,
  type DistrictSubject,
  type LessonDesign,
  type LibraryResource,
  type SourceKind,
} from "./district-sample"

// Aggregations behind the district dashboard. Pure functions over a filtered
// lesson list, so the school / subject / grade filters can never make two
// panels disagree. "Meeting" always means Levels 3–4 as a share of all Quick
// Check responses — the provincial standard, not a grade.

export interface DistrictFilter {
  schoolId: string
  subject: string
  grade: string
}

export function filterLessons(lessons: DistrictLesson[], f: DistrictFilter): DistrictLesson[] {
  return lessons.filter(
    (l) =>
      (!f.schoolId || l.schoolId === f.schoolId) &&
      (!f.subject || l.subject === f.subject) &&
      (!f.grade || l.grade === f.grade)
  )
}

const EMPTY: LevelCounts = { level1: 0, level2: 0, level3: 0, level4: 0 }

export function sumLevels(lessons: DistrictLesson[]): LevelCounts {
  return lessons.reduce<LevelCounts>(
    (acc, l) =>
      l.results
        ? {
            level1: acc.level1 + l.results.level1,
            level2: acc.level2 + l.results.level2,
            level3: acc.level3 + l.results.level3,
            level4: acc.level4 + l.results.level4,
          }
        : acc,
    EMPTY
  )
}

export function totalResponses(c: LevelCounts): number {
  return c.level1 + c.level2 + c.level3 + c.level4
}

/** Share of responses at Levels 3–4, or null when nothing was assessed. */
export function meetingRate(c: LevelCounts): number | null {
  const total = totalResponses(c)
  return total === 0 ? null : (c.level3 + c.level4) / total
}

function distinct<T>(values: T[]): number {
  return new Set(values).size
}

// ---- Headline ----

export interface DistrictKpis {
  activeTeachers: number
  totalTeachers: number
  lessons: number
  quickCheckRate: number
  responses: number
  meeting: number | null
  levels: LevelCounts
  expectationsTaught: number
  expectationsTotal: number
}

export function expectationsInScope(f: DistrictFilter): DistrictExpectation[] {
  return DISTRICT_EXPECTATIONS.filter(
    (e) => (!f.subject || e.subject === f.subject) && (!f.grade || e.grade === f.grade)
  )
}

const expectationKey = (subject: string, grade: string, code: string) => `${subject}|${grade}|${code}`

export function computeKpis(lessons: DistrictLesson[], f: DistrictFilter): DistrictKpis {
  const schools = f.schoolId ? DISTRICT_SCHOOLS.filter((s) => s.id === f.schoolId) : DISTRICT_SCHOOLS
  const levels = sumLevels(lessons)
  const taught = new Set(lessons.flatMap((l) => l.codes.map((c) => expectationKey(l.subject, l.grade, c))))
  return {
    activeTeachers: distinct(lessons.map((l) => l.teacherId)),
    totalTeachers: schools.reduce((sum, s) => sum + s.teachers, 0),
    lessons: lessons.length,
    quickCheckRate: lessons.length ? lessons.filter((l) => l.results).length / lessons.length : 0,
    responses: totalResponses(levels),
    meeting: meetingRate(levels),
    levels,
    expectationsTaught: taught.size,
    expectationsTotal: expectationsInScope(f).length,
  }
}

export function lessonsByWeek(lessons: DistrictLesson[]): { week: string; lessons: number }[] {
  return TERM_WEEKS.map((week, i) => ({ week, lessons: lessons.filter((l) => l.week === i).length }))
}

// ---- Subjects ----

export interface SubjectRow {
  subject: DistrictSubject
  lessons: number
  teachers: number
  levels: LevelCounts
  meeting: number | null
}

export function subjectBreakdown(lessons: DistrictLesson[]): SubjectRow[] {
  return DISTRICT_SUBJECTS.map((subject) => {
    const rows = lessons.filter((l) => l.subject === subject)
    const levels = sumLevels(rows)
    return {
      subject,
      lessons: rows.length,
      teachers: distinct(rows.map((l) => l.teacherId)),
      levels,
      meeting: meetingRate(levels),
    }
  })
    .filter((r) => r.lessons > 0)
    .sort((a, b) => b.lessons - a.lessons)
}

// ---- Resources ----

// Lift compares a lesson's result to lessons on the same expectations that
// did NOT use the item, so a resource isn't credited for simply being used in
// an easier unit. Weighted by responses; null when either side has no data.
function liftFor(lessons: DistrictLesson[], uses: (l: DistrictLesson) => boolean): number | null {
  const withItem = lessons.filter(uses)
  const comparisonKeys = new Set(withItem.flatMap((l) => l.codes.map((c) => expectationKey(l.subject, l.grade, c))))
  const without = lessons.filter(
    (l) => !uses(l) && l.codes.some((c) => comparisonKeys.has(expectationKey(l.subject, l.grade, c)))
  )
  const a = meetingRate(sumLevels(withItem))
  const b = meetingRate(sumLevels(without))
  return a === null || b === null ? null : a - b
}

export interface LibraryRow {
  resource: LibraryResource
  lessons: number
  teachers: number
  schools: number
  meeting: number | null
  lift: number | null
}

export function libraryUsage(lessons: DistrictLesson[]): LibraryRow[] {
  return LIBRARY_RESOURCES.map((resource) => {
    const uses = (l: DistrictLesson) => l.libraryIds.includes(resource.id)
    const rows = lessons.filter(uses)
    return {
      resource,
      lessons: rows.length,
      teachers: distinct(rows.map((l) => l.teacherId)),
      schools: distinct(rows.map((l) => l.schoolId)),
      meeting: meetingRate(sumLevels(rows)),
      lift: liftFor(lessons, uses),
    }
  })
    .filter((r) => r.lessons > 0)
    .sort((a, b) => b.lessons - a.lessons)
}

export interface MaterialRow {
  id: string
  lessons: number
  teachers: number
  /** Share of classrooms that list this material in their Materials profile. */
  inventory: number
  meeting: number | null
  lift: number | null
  /** Owned widely, used rarely, and lessons that use it outperform. */
  untapped: boolean
}

export function materialUsage(lessons: DistrictLesson[]): MaterialRow[] {
  return Object.entries(MATERIAL_INVENTORY)
    .map(([id, inventory]) => {
      const uses = (l: DistrictLesson) => l.materialIds.includes(id)
      const rows = lessons.filter(uses)
      const lift = liftFor(lessons, uses)
      // Usage among lessons in the subjects this material actually serves.
      const subjects = new Set(rows.map((l) => l.subject))
      const pool = lessons.filter((l) => subjects.has(l.subject)).length
      const usageShare = pool ? rows.length / pool : 0
      return {
        id,
        lessons: rows.length,
        teachers: distinct(rows.map((l) => l.teacherId)),
        inventory,
        meeting: meetingRate(sumLevels(rows)),
        lift,
        untapped: inventory >= 0.4 && usageShare < 0.08 && (lift ?? 0) >= 0.08,
      }
    })
    .filter((r) => r.lessons > 0)
    .sort((a, b) => b.lessons - a.lessons)
}

export interface MixRow {
  key: "both" | "library" | "materials" | "neither"
  label: string
  lessons: number
  meeting: number | null
}

// ---- Sources ----

export type SourceGrouping = "provider" | "kind"

function kindOf(sourceId: string): SourceKind {
  return RESOURCE_SOURCES.find((s) => s.id === sourceId)?.kind ?? "open"
}

/** The groups a lesson draws on, as provider ids or source kinds. */
export function lessonGroups(l: DistrictLesson, grouping: SourceGrouping): string[] {
  const ids = resourceSourceIds(l)
  return [...new Set(grouping === "provider" ? ids : ids.map(kindOf))]
}

export interface SourceGroupMeta {
  id: string
  label: string
  kind: SourceKind
  licensedTeachers?: number
}

export function sourceGroups(grouping: SourceGrouping): SourceGroupMeta[] {
  if (grouping === "provider") {
    return RESOURCE_SOURCES.map((s) => ({ id: s.id, label: s.name, kind: s.kind, licensedTeachers: s.licensedTeachers }))
  }
  return (Object.keys(SOURCE_KIND_LABELS) as SourceKind[]).map((kind) => ({
    id: kind,
    label: SOURCE_KIND_LABELS[kind],
    kind,
  }))
}

export interface SourceRow extends SourceGroupMeta {
  lessons: number
  /** Share of all lessons in the slice that drew on this group. */
  share: number
  teachers: number
  schools: number
  meeting: number | null
  lift: number | null
}

// A lesson can draw on several sources (a Nelson text plus a GeoGebra
// applet), so shares are "lessons that used it" and don't sum to 100%.
export function sourceUsage(lessons: DistrictLesson[], grouping: SourceGrouping): SourceRow[] {
  return sourceGroups(grouping)
    .map((group) => {
      const uses = (l: DistrictLesson) => lessonGroups(l, grouping).includes(group.id)
      const rows = lessons.filter(uses)
      return {
        ...group,
        lessons: rows.length,
        share: lessons.length ? rows.length / lessons.length : 0,
        teachers: distinct(rows.map((l) => l.teacherId)),
        schools: distinct(rows.map((l) => l.schoolId)),
        meeting: meetingRate(sumLevels(rows)),
        lift: liftFor(lessons, uses),
      }
    })
    .sort((a, b) => b.lessons - a.lessons)
}

export interface SchoolSourceRow {
  schoolId: string
  schoolName: string
  lessons: number
  /** group id → share of this school's lessons that drew on it. */
  shares: Record<string, number>
}

export function sourceMixBySchool(lessons: DistrictLesson[], grouping: SourceGrouping): SchoolSourceRow[] {
  const groups = sourceGroups(grouping)
  return DISTRICT_SCHOOLS.map((school) => {
    const rows = lessons.filter((l) => l.schoolId === school.id)
    const shares = Object.fromEntries(
      groups.map((g) => [
        g.id,
        rows.length ? rows.filter((l) => lessonGroups(l, grouping).includes(g.id)).length / rows.length : 0,
      ])
    )
    return { schoolId: school.id, schoolName: school.name, lessons: rows.length, shares }
  }).filter((r) => r.lessons > 0)
}

/** Text or digital resource (library or board) + hands-on material vs. either alone. */
export function resourceMix(lessons: DistrictLesson[]): MixRow[] {
  // Projectors and doc cams are how a library resource gets shown, not a
  // hands-on material — counting them would credit "both" for a slideshow.
  const display = new Set(["projector", "document-camera", "smart-board"])
  const hasMaterial = (l: DistrictLesson) => l.materialIds.some((m) => !display.has(m))
  const hasResource = (l: DistrictLesson) => l.libraryIds.length > 0 || l.boardIds.length > 0
  const buckets: { key: MixRow["key"]; label: string; test: (l: DistrictLesson) => boolean }[] = [
    { key: "both", label: "Text or digital resource + in-class materials", test: (l) => hasResource(l) && hasMaterial(l) },
    { key: "library", label: "Text or digital resource only", test: (l) => hasResource(l) && !hasMaterial(l) },
    { key: "materials", label: "In-class materials only", test: (l) => !hasResource(l) && hasMaterial(l) },
    { key: "neither", label: "Neither", test: (l) => !hasResource(l) && !hasMaterial(l) },
  ]
  return buckets
    .map(({ key, label, test }) => {
      const rows = lessons.filter(test)
      return { key, label, lessons: rows.length, meeting: meetingRate(sumLevels(rows)) }
    })
    .filter((r) => r.lessons > 0)
}

// ---- Expectations ----

export type ExpectationStatus = "not-taught" | "needs-support" | "approaching" | "on-track" | "strong"

export interface ExpectationRow extends DistrictExpectation {
  lessons: number
  teachers: number
  meeting: number | null
  status: ExpectationStatus
}

export function statusFor(meeting: number | null, lessons: number): ExpectationStatus {
  if (lessons === 0) return "not-taught"
  if (meeting === null) return "approaching"
  if (meeting >= 0.75) return "strong"
  if (meeting >= 0.62) return "on-track"
  if (meeting >= 0.5) return "approaching"
  return "needs-support"
}

export function expectationCoverage(lessons: DistrictLesson[], f: DistrictFilter): ExpectationRow[] {
  return expectationsInScope(f).map((e) => {
    const rows = lessons.filter((l) => l.subject === e.subject && l.grade === e.grade && l.codes.includes(e.code))
    const meeting = meetingRate(sumLevels(rows))
    return {
      ...e,
      lessons: rows.length,
      teachers: distinct(rows.map((l) => l.teacherId)),
      meeting,
      status: statusFor(meeting, rows.length),
    }
  })
}

// ---- Lesson designs ----

export interface DesignRow {
  design: LessonDesign
  lessons: number
  teachers: number
  schools: number
  responses: number
  meeting: number | null
  /** vs. other designs teaching the same expectations. */
  lift: number | null
}

// Below these, a design's result is too thin to rank against the others.
export const MIN_DESIGN_RESPONSES = 150
export const MIN_DESIGN_TEACHERS = 3

export function designImpact(lessons: DistrictLesson[]): DesignRow[] {
  return LESSON_DESIGNS.map((design) => {
    const uses = (l: DistrictLesson) => l.designId === design.id
    const rows = lessons.filter(uses)
    const levels = sumLevels(rows)
    return {
      design,
      lessons: rows.length,
      teachers: distinct(rows.map((l) => l.teacherId)),
      schools: distinct(rows.map((l) => l.schoolId)),
      responses: totalResponses(levels),
      meeting: meetingRate(levels),
      lift: liftFor(lessons, uses),
    }
  })
    .filter((r) => r.responses >= MIN_DESIGN_RESPONSES && r.teachers >= MIN_DESIGN_TEACHERS)
    .sort((a, b) => (b.meeting ?? 0) - (a.meeting ?? 0))
}
