"use client"

import { FileText, X, ArrowUp } from "lucide-react"
import UserMaterialsSection, { type UserMaterial } from "@/components/user-materials-section"
import type { Resource } from "@/lib/types"

interface LessonMaterialsProps {
  resources: Resource[]
  onRemoveResource: (resourceId: string) => void
  userMaterials: UserMaterial[]
  onUserMaterialsChange: (materials: UserMaterial[]) => void
}

export default function LessonMaterials({
  resources,
  onRemoveResource,
  userMaterials,
  onUserMaterialsChange,
}: LessonMaterialsProps) {
  return (
    <>
      <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8B4513]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
            Lesson Materials
          </h3>
          <span aria-live="polite" className="text-xs font-medium text-[#A8998E]">
            {resources.length} resource{resources.length === 1 ? "" : "s"} added
          </span>
        </div>

        {resources.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#E8D5C4] bg-[#FAF3E0]/60 p-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE5CC]">
              <FileText size={18} className="text-[#C65D3B]" />
            </div>
            <p className="text-sm font-semibold text-[#2C2C2C]">No materials yet</p>
            <p className="text-xs text-[#8B4513]/70">Search above and tap + Add to build your lesson.</p>
            <p className="flex items-center gap-1 text-xs font-medium text-[#FF6B35]">
              <ArrowUp size={12} aria-hidden="true" />
              Start with the results above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {resources.map((resource, index) => {
              const id = resource.id || resource.topic_title || resource.url
              return (
                <div
                  key={id || index}
                  className="flex items-center gap-3 rounded-lg border border-[#E8D5C4] bg-[#FAF3E0]/60 px-3 py-2"
                >
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#FF6B35] text-xs font-bold text-white">
                    {index + 1}
                  </div>
                  <span className="flex-1 truncate text-sm text-[#2C2C2C]">{resource.topic_title}</span>
                  {resource.curriculum_expectations && resource.curriculum_expectations.length > 0 && (
                    <span className="hidden flex-shrink-0 text-xs text-[#A8998E] sm:inline">
                      {resource.curriculum_expectations.join(", ")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveResource(id)}
                    aria-label={`Remove ${resource.topic_title} from lesson`}
                    className="flex-shrink-0 rounded-full p-1 text-[#A8998E] transition-colors hover:bg-[#FFE5CC] hover:text-[#C65D3B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] focus-visible:ring-offset-1"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <UserMaterialsSection materials={userMaterials} onChange={onUserMaterialsChange} />
    </>
  )
}
