"use client"

import { useGlobalFilters } from "@/lib/global-filters"
import { PROVINCES, GRADES, SUBJECTS } from "@/components/hero-personalize"
import { getStrandOptions } from "@/lib/get-strand-options"
import InlinePicker from "@/components/inline-picker"
import { Zap } from "lucide-react"

export default function CurriculumFilterBar() {
  const { state, setProvince, setGrade, setSubject, setStrand, setSandbox } = useGlobalFilters()

  const strandOptions = getStrandOptions(state.subject)
  const isStrandDisabled = state.subject === ""

  return (
    <div className="border-t border-border bg-white px-4 md:px-6 py-3">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-2">
          {/* Province */}
          <div className="flex-1 md:flex-none">
            <InlinePicker
              value={state.province}
              placeholder="anywhere in Canada"
              options={PROVINCES}
              onChange={setProvince}
              ariaLabel="Choose province"
            />
          </div>

          {/* Grade */}
          <div className="flex-1 md:flex-none">
            <InlinePicker
              value={state.grade}
              placeholder="any grade"
              options={GRADES}
              onChange={setGrade}
              ariaLabel="Choose grade"
            />
          </div>

          {/* Subject */}
          <div className="flex-1 md:flex-none">
            <InlinePicker
              value={state.subject}
              placeholder="any subject"
              options={SUBJECTS}
              onChange={setSubject}
              ariaLabel="Choose subject"
            />
          </div>

          {/* Strand */}
          {!isStrandDisabled && (
            <div className="flex-1 md:flex-none">
              <InlinePicker
                value={state.strand}
                placeholder="any strand"
                options={strandOptions}
                onChange={setStrand}
                disabled={isStrandDisabled}
                ariaLabel="Choose strand"
              />
            </div>
          )}

          {/* Spacer */}
          <div className="hidden md:flex-1" />

          {/* Sandbox Toggle */}
          <button
            onClick={() => setSandbox(!state.isSandbox)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              state.isSandbox
                ? "bg-[#FFF3E0] text-[#E65100] border border-[#FFB74D]"
                : "bg-muted text-muted-foreground border border-border hover:bg-[#F5F5F5]"
            }`}
            title={state.isSandbox ? "Using sandbox data" : "Using actual data"}
          >
            <Zap size={16} className={state.isSandbox ? "fill-current" : ""} />
            <span>{state.isSandbox ? "Sandbox" : "Actual"}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
