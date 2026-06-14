"use client"

import { useState } from "react"
import { useGlobalFilters } from "@/lib/global-filters"
import { PROVINCES, GRADES, SUBJECTS, STRAND_CODES } from "@/components/hero-personalize"
import { getStrandOptions } from "@/lib/get-strand-options"
import InlinePicker from "@/components/inline-picker"
import { Zap, Leaf, BookOpen, Calculator, Beaker, Globe, PenTool, X } from "lucide-react"

export default function CurriculumFilterBar() {
  const { state, setProvince, setGrade, setSubject, setStrand, setSandbox } = useGlobalFilters()
  const [mobileOpenFilter, setMobileOpenFilter] = useState<"province" | "grade" | "subject" | "strand" | null>(null)

  const strandOptions = getStrandOptions(state.subject)
  const isStrandDisabled = state.subject === ""

  // Mobile helper functions
  const getProvinceLabel = () => {
    if (!state.province) return "CA"
    return state.province.toUpperCase()
  }

  const getGradeLabel = () => {
    return state.grade ? state.grade : "K12"
  }

  const getSubjectIcon = () => {
    switch (state.subject) {
      case "Math":
        return <Calculator size={20} />
      case "Science":
        return <Beaker size={20} />
      case "Social Studies":
        return <Globe size={20} />
      case "Language":
        return <PenTool size={20} />
      case "FSL":
        return <span className="text-lg">⚜️</span> // Fleur-de-lys emoji
      default:
        return <BookOpen size={20} />
    }
  }

  const getStrandLabel = () => {
    if (!state.strand) return ""
    // Find the strand code letter
    return Object.entries(STRAND_CODES).find(([name]) => name === state.strand)?.[1] || state.strand[0]?.toUpperCase() || ""
  }

  return (
    <div className="border-t border-border bg-white px-4 md:px-6 py-3">
      <div className="mx-auto max-w-[1500px]">
        {/* Desktop Layout */}
        <div className="hidden md:flex flex-row items-center gap-2">
          {/* Province */}
          <InlinePicker
            value={state.province}
            placeholder="anywhere in Canada"
            options={PROVINCES}
            onChange={setProvince}
            ariaLabel="Choose province"
          />

          {/* Grade */}
          <InlinePicker
            value={state.grade}
            placeholder="any grade"
            options={GRADES}
            onChange={setGrade}
            ariaLabel="Choose grade"
          />

          {/* Subject */}
          <InlinePicker
            value={state.subject}
            placeholder="any subject"
            options={SUBJECTS}
            onChange={setSubject}
            ariaLabel="Choose subject"
          />

          {/* Strand */}
          {!isStrandDisabled && (
            <InlinePicker
              value={state.strand}
              placeholder="any strand"
              options={strandOptions}
              onChange={setStrand}
              disabled={isStrandDisabled}
              ariaLabel="Choose strand"
            />
          )}

          {/* Spacer */}
          <div className="flex-1" />

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

        {/* Mobile Layout */}
        <div className="flex md:hidden items-center gap-2">
          {/* Province Button */}
          <button
            onClick={() => setMobileOpenFilter(mobileOpenFilter === "province" ? null : "province")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF5ED] border border-[#E8D5C4] text-[#8B4513] hover:bg-[#FFE5CC] transition-colors"
            title="Choose province"
          >
            <Leaf size={20} />
          </button>

          {/* Grade Button */}
          <button
            onClick={() => setMobileOpenFilter(mobileOpenFilter === "grade" ? null : "grade")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF5ED] border border-[#E8D5C4] text-[#8B4513] hover:bg-[#FFE5CC] transition-colors text-sm font-semibold"
            title="Choose grade"
          >
            {getGradeLabel()}
          </button>

          {/* Subject Button */}
          <button
            onClick={() => setMobileOpenFilter(mobileOpenFilter === "subject" ? null : "subject")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF5ED] border border-[#E8D5C4] text-[#8B4513] hover:bg-[#FFE5CC] transition-colors"
            title="Choose subject"
          >
            {getSubjectIcon()}
          </button>

          {/* Strand Button */}
          <button
            onClick={() => setMobileOpenFilter(mobileOpenFilter === "strand" ? null : "strand")}
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
              isStrandDisabled
                ? "bg-[#F5F5F5] border-[#E0E0E0] text-[#A8998E] cursor-not-allowed opacity-50"
                : "bg-[#FFF5ED] border-[#E8D5C4] text-[#8B4513] hover:bg-[#FFE5CC]"
            }`}
            disabled={isStrandDisabled}
            title={isStrandDisabled ? "Select a subject first" : "Choose strand"}
          >
            {getStrandLabel() || "-"}
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sandbox Toggle */}
          <button
            onClick={() => setSandbox(!state.isSandbox)}
            className={`flex h-11 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
              state.isSandbox
                ? "bg-[#FFF3E0] text-[#E65100] border border-[#FFB74D]"
                : "bg-muted text-muted-foreground border border-border hover:bg-[#F5F5F5]"
            }`}
            title={state.isSandbox ? "Using sandbox data" : "Using actual data"}
          >
            <Zap size={14} className={state.isSandbox ? "fill-current" : ""} />
          </button>
        </div>

        {/* Mobile Dropdowns */}
        {mobileOpenFilter && (
          <div className="md:hidden mt-2 rounded-2xl border border-[#E8D5C4] bg-white shadow-lg">
            {/* Province Dropdown */}
            {mobileOpenFilter === "province" && (
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#2C2C2C]">Province</h3>
                  <button
                    onClick={() => setMobileOpenFilter(null)}
                    className="p-1 hover:bg-[#F5F5F5] rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {PROVINCES.map((opt) => (
                    <button
                      key={opt.value || "__any"}
                      onClick={() => {
                        setProvince(opt.value)
                        setMobileOpenFilter(null)
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        state.province === opt.value
                          ? "bg-[#FFE5CC] text-[#8B4513]"
                          : "bg-[#F5F5F5] text-[#2C2C2C] hover:bg-[#FFF5ED]"
                      }`}
                    >
                      {opt.value || "All"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grade Dropdown */}
            {mobileOpenFilter === "grade" && (
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#2C2C2C]">Grade</h3>
                  <button
                    onClick={() => setMobileOpenFilter(null)}
                    className="p-1 hover:bg-[#F5F5F5] rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {GRADES.map((opt) => (
                    <button
                      key={opt.value || "__any"}
                      onClick={() => {
                        setGrade(opt.value)
                        setMobileOpenFilter(null)
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        state.grade === opt.value
                          ? "bg-[#FFE5CC] text-[#8B4513]"
                          : "bg-[#F5F5F5] text-[#2C2C2C] hover:bg-[#FFF5ED]"
                      }`}
                    >
                      {opt.value || "All"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subject Dropdown */}
            {mobileOpenFilter === "subject" && (
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#2C2C2C]">Subject</h3>
                  <button
                    onClick={() => setMobileOpenFilter(null)}
                    className="p-1 hover:bg-[#F5F5F5] rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {SUBJECTS.map((opt) => (
                    <button
                      key={opt.value || "__any"}
                      onClick={() => {
                        setSubject(opt.value)
                        setMobileOpenFilter(null)
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        state.subject === opt.value
                          ? "bg-[#FFE5CC] text-[#8B4513]"
                          : "bg-[#F5F5F5] text-[#2C2C2C] hover:bg-[#FFF5ED]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Strand Dropdown */}
            {mobileOpenFilter === "strand" && !isStrandDisabled && (
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#2C2C2C]">Strand</h3>
                  <button
                    onClick={() => setMobileOpenFilter(null)}
                    className="p-1 hover:bg-[#F5F5F5] rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {strandOptions.map((opt) => (
                    <button
                      key={opt.value || "__any"}
                      onClick={() => {
                        setStrand(opt.value)
                        setMobileOpenFilter(null)
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        state.strand === opt.value
                          ? "bg-[#FFE5CC] text-[#8B4513]"
                          : "bg-[#F5F5F5] text-[#2C2C2C] hover:bg-[#FFF5ED]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
