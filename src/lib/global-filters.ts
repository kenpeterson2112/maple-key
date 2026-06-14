import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react"
import { SUBJECT_STRANDS } from "@/components/hero-personalize"
import { isSandboxMode, setSandboxMode } from "@/lib/assessment-results"

export interface GlobalFiltersState {
  province: string
  grade: string
  subject: string
  strand: string
  isSandbox: boolean
}

const STORAGE_KEY = "maplekey_global_filters"

const initialState: GlobalFiltersState = {
  province: "",
  grade: "",
  subject: "",
  strand: "",
  isSandbox: isSandboxMode(),
}

type GlobalFiltersAction =
  | { type: "SET_PROVINCE"; payload: string }
  | { type: "SET_GRADE"; payload: string }
  | { type: "SET_SUBJECT"; payload: string }
  | { type: "SET_STRAND"; payload: string }
  | { type: "SET_SANDBOX"; payload: boolean }
  | { type: "LOAD_FROM_STORAGE"; payload: GlobalFiltersState }

function globalFiltersReducer(state: GlobalFiltersState, action: GlobalFiltersAction): GlobalFiltersState {
  switch (action.type) {
    case "SET_PROVINCE":
      return { ...state, province: action.payload }
    case "SET_GRADE":
      return { ...state, grade: action.payload }
    case "SET_SUBJECT": {
      const newSubject = action.payload
      // When subject changes, clear strand if it's not valid for the new subject
      let newStrand = state.strand
      if (newSubject === "") {
        newStrand = ""
      } else if (newSubject !== state.subject) {
        // Subject changed to a different value
        const validStrands = SUBJECT_STRANDS[newSubject] ?? []
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
      const validStrands = SUBJECT_STRANDS[state.subject] ?? []
      if (action.payload === "" || validStrands.includes(action.payload)) {
        return { ...state, strand: action.payload }
      }
      return state
    }
    case "SET_SANDBOX": {
      setSandboxMode(action.payload)
      return { ...state, isSandbox: action.payload }
    }
    case "LOAD_FROM_STORAGE":
      return action.payload
    default:
      return state
  }
}

const GlobalFiltersContext = createContext<
  { state: GlobalFiltersState; dispatch: React.Dispatch<GlobalFiltersAction> } | undefined
>(undefined)

export function GlobalFiltersProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(globalFiltersReducer, initialState, (initial) => {
    // Load from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as GlobalFiltersState
        return {
          ...initial,
          ...parsed,
        }
      }
    } catch (e) {
      console.error("Failed to load global filters from localStorage:", e)
    }
    return initial
  })

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.error("Failed to save global filters to localStorage:", e)
    }
  }, [state])

  return React.createElement(GlobalFiltersContext.Provider, { value: { state, dispatch } }, children)
}

export function useGlobalFilters() {
  const context = useContext(GlobalFiltersContext)
  if (!context) {
    throw new Error("useGlobalFilters must be used within GlobalFiltersProvider")
  }

  const { state, dispatch } = context

  return {
    state,
    setProvince: useCallback((province: string) => {
      dispatch({ type: "SET_PROVINCE", payload: province })
    }, []),
    setGrade: useCallback((grade: string) => {
      dispatch({ type: "SET_GRADE", payload: grade })
    }, []),
    setSubject: useCallback((subject: string) => {
      dispatch({ type: "SET_SUBJECT", payload: subject })
    }, []),
    setStrand: useCallback((strand: string) => {
      dispatch({ type: "SET_STRAND", payload: strand })
    }, []),
    setSandbox: useCallback((isSandbox: boolean) => {
      dispatch({ type: "SET_SANDBOX", payload: isSandbox })
    }, []),
  }
}
