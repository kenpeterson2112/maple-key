import { ClipboardCheck, Check, PenLine, Sparkles } from "lucide-react"
import type { LessonArtifact, ArtifactStatus, ArtifactSection } from "@/lib/lesson-metadata"

const SECTION_LABEL: Record<ArtifactSection, string> = {
  mindsOn: "Minds On",
  action: "Action",
  consolidation: "Consolidation",
  materials: "Materials",
}

const SECTION_BADGE: Record<ArtifactSection, string> = {
  mindsOn: "bg-blue-100 text-blue-700",
  action: "bg-emerald-100 text-emerald-700",
  consolidation: "bg-violet-100 text-violet-700",
  materials: "bg-stone-100 text-stone-700",
}

const CHOICES: { value: ArtifactStatus; label: string; icon: typeof Check }[] = [
  { value: "have", label: "I have one", icon: Check },
  { value: "will-make", label: "I'll make one", icon: PenLine },
  { value: "help-me", label: "Help me make one", icon: Sparkles },
]

interface Props {
  artifacts: LessonArtifact[]
  onStatusChange: (index: number, status: ArtifactStatus) => void
  onOpenOrganizer: (index: number) => void
}

export default function ArtifactsSection({ artifacts, onStatusChange, onOpenOrganizer }: Props) {
  if (artifacts.length === 0) return null

  const untriaged = artifacts.filter((a) => a.status === "unset").length

  return (
    <div className="bg-white rounded-xl border-l-4 border-amber-500 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={20} className="text-amber-600" />
            <h4 className="text-lg font-semibold text-[#2C2C2C]">Classroom Artifacts</h4>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
              {untriaged > 0 ? `${untriaged} to decide` : "All set"}
            </span>
          </div>
        </div>
        <p className="text-xs text-amber-700 font-medium uppercase tracking-wide mb-3">
          Decide what you'll bring
        </p>

        <ul className="space-y-3">
          {artifacts.map((artifact, i) => (
            <li
              key={`${artifact.name}-${i}`}
              className="border border-stone-200 rounded-lg p-3 bg-stone-50"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#2C2C2C]">{artifact.name}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${SECTION_BADGE[artifact.section]}`}
                    >
                      {SECTION_LABEL[artifact.section]}
                    </span>
                  </div>
                  {artifact.purpose && (
                    <p className="text-xs text-[#555] mt-1 leading-relaxed">{artifact.purpose}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {CHOICES.map((choice) => {
                  const selected = artifact.status === choice.value
                  const Icon = choice.icon
                  return (
                    <button
                      key={choice.value}
                      onClick={() => {
                        onStatusChange(i, selected ? "unset" : choice.value)
                        if (!selected && choice.value === "help-me") {
                          onOpenOrganizer(i)
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-white border-stone-300 text-stone-700 hover:border-amber-400 hover:text-amber-700"
                      }`}
                      aria-pressed={selected}
                    >
                      <Icon size={12} />
                      {choice.label}
                    </button>
                  )
                })}
                {artifact.status === "help-me" && (
                  <button
                    onClick={() => onOpenOrganizer(i)}
                    className="ml-auto text-xs text-amber-700 hover:underline font-medium"
                  >
                    {artifact.organizer ? "Edit organizer" : "Open organizer"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
