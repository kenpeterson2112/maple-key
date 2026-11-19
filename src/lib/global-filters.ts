import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from "react"
import { getStrandValues } from "@/lib/get-strand-options"
import { isSandboxMode, setSandboxMode } from "@/lib/assessment-results"
import { inferProvinceFromTimeZone } from "@/lib/personalization"
import type { Filters } from "@/lib/types"

// The one store for "which class am I working on": province, grade, subject,
// strand, plus the planner's free-text topic. Every space reads it, the top nav
// reflects it, and it persists per browser. There used to be a second copy in
// App.tsx (saved under maplekey_prefs); that is migrated once below and gone.

export interface GlobalFiltersState {
  province: string
  grade: string
  subject: string
  strand: string
  /** Free-text planning topic. Lives for the session; not persisted. */
  topic: string
  isSandbox: boolean
}

const STORAGE_KEY = "maplekey_global_filters"
const LEGACY_PREFS_KEY = "maplekey_prefs"

const initialState: GlobalFiltersState = {
  province: "",
  grade: "",
  subject: "",
  strand: "",
  topic: "",
  isSandbox: isSandboxMode(),
}

type GlobalFiltersAction =
  | { type: "SET_PROVINCE"; payload: string }
  | { type: "SET_GRADE"; payload: string }
  | { type: "SET_SUBJECT"; payload: string }
  | { type: "SET_STRAND"; payload: string }
  | { type: "SET_TOPIC"; payload: string }
  | { type: "SET_SANDBOX"; payload: boolean }

function globalFiltersReducer(state: GlobalFiltersState, action: GlobalFiltersAction): GlobalFiltersState {
  switch (action.type) {
    case "SET_PROVINCE":
      return { ...state, province: action.payload }
    case "SET_GRADE": {
      // Grade-variant subjects (History, Geography) rename their strands by
      // grade, so a strand valid under the old grade may not be under the new one.
      const validStrands = state.subject ? getStrandValues(state.subject, action.payload) : []
      const newStrand = validStrands.includes(state.strand) ? state.strand : ""
      return { ...state, grade: action.payload, strand: newStrand }
    }
    case "SET_SUBJECT": {
      const newSubject = action.payload
      // When subject changes, clear strand if it's not valid for the new subject
      let newStrand = state.strand
      if (newSubject === "") {
        newStrand = ""
      } else if (newSubject !== state.subject) {
        const validStrands = getStrandValues(newSubject, state.grade)
        if (!validStrands.includes(newStrand)) {
          newStrand = ""
        }
      }
      return { ...state, subject: newSubject, strand: newStrand }
    }
    case "SET_STRAND": {
      // Validate that the strand exists for the current subject
      if (state.subject === "") {
        return state // Can't set strand when subject is "any"
      }
      const validStrands = getStrandValues(state.subject, state.grade)
      if (action.payload === "" || validStrands.includes(action.payload)) {
        return { ...state, strand: action.payload }
      }
      return state
    }
    case "SET_TOPIC":
      return { ...state, topic: action.payload }
    case "SET_SANDBOX": {
      setSandboxMode(action.payload)
      return { ...state, isSandbox: action.payload }
    }
    default:
      return state
  }
}

type Stored = Partial<Pick<GlobalFiltersState, "province" | "grade" | "subject" | "strand">>

function readJson(key: string): Stored | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}

// Saved state, else the old App-level prefs (moved here once), else a fresh
// start with the province guessed from the time zone. Province lives in
// Settings, so a new teacher should never land on "anywhere in Canada".
function loadInitial(initial: GlobalFiltersState): GlobalFiltersState {
  const stored = readJson(STORAGE_KEY)
  if (stored) return { ...initial, ...pickCurriculum(stored) }
  const legacy = readJson(LEGACY_PREFS_KEY)
  if (legacy) {
    try {
      localStorage.removeItem(LEGACY_PREFS_KEY)
    } catch {
      // ignore
    }
    return { ...initial, ...pickCurriculum(legacy), province: legacy.province || inferProvinceFromTimeZone() }
  }
  return { ...initial, province: inferProvinceFromTimeZone() }
}

function pickCurriculum(s: Stored): Stored {
  return {
    province: typeof s.province === "string" ? s.province : "",
    grade: typeof s.grade === "string" ? s.grade : "",
    subject: typeof s.subject === "string" ? s.subject : "",
    strand: typeof s.strand === "string" ? s.strand : "",
  }
}

const GlobalFiltersContext = createContext<
  { state: GlobalFiltersState; dispatch: React.Dispatch<GlobalFiltersAction> } | undefined
>(undefined)

export function GlobalFiltersProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(globalFiltersReducer, initialState, loadInitial)

  // Persist the class context (not the session-only topic or sandbox flag,
  // which has its own key in assessment-results.ts).
  useEffect(() => {
    try {
      const { province, grade, subject, strand } = state
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ province, grade, subject, strand }))
    } catch (e) {
      console.error("Failed to save global filters to localStorage:", e)
    }
  }, [state.province, state.grade, state.subject, state.strand])

  return React.createElement(GlobalFiltersContext.Provider, { value: { state, dispatch } }, children)
}

export function useGlobalFilters() {
  const context = useContext(GlobalFiltersContext)
  if (!context) {
    throw new Error("useGlobalFilters must be used within GlobalFiltersProvider")
  }

  const { state, dispatch } = context

  const setProvince = useCallback((province: string) => dispatch({ type: "SET_PROVINCE", payload: province }), [])
  const setGrade = useCallback((grade: string) => dispatch({ type: "SET_GRADE", payload: grade }), [])
  const setSubject = useCallback((subject: string) => dispatch({ type: "SET_SUBJECT", payload: subject }), [])
  const setStrand = useCallback((strand: string) => dispatch({ type: "SET_STRAND", payload: strand }), [])
  const setTopic = useCallback((topic: string) => dispatch({ type: "SET_TOPIC", payload: topic }), [])
  const setSandbox = useCallback((isSandbox: boolean) => dispatch({ type: "SET_SANDBOX", payload: isSandbox }), [])

  // The same context as the `Filters` shape the search and planner code take.
  const filters: Filters = useMemo(
    () => ({
      province: state.province,
      grade: state.grade,
      subject: state.subject,
      strand: state.strand,
      topic: state.topic,
      learningType: "",
    }),
    [state.province, state.grade, state.subject, state.strand, state.topic],
  )

  // Apply a whole `Filters` object, field by field, so subject/grade changes
  // still run the strand validation above. Order matters: subject before
  // strand, so a new strand is checked against the new subject.
  const setFilters = useCallback(
    (next: Filters) => {
      if (next.province !== state.province) setProvince(next.province)
      if (next.subject !== state.subject) setSubject(next.subject)
      if (next.grade !== state.grade) setGrade(next.grade)
      if (next.strand !== state.strand) setStrand(next.strand)
      if (next.topic !== state.topic) setTopic(next.topic)
    },
    [state, setProvince, setSubject, setGrade, setStrand, setTopic],
  )

  return { state, filters, setFilters, setProvince, setGrade, setSubject, setStrand, setTopic, setSandbox }
}
