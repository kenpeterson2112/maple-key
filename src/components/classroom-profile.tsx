"use client"

import { useState } from "react"
import { NotebookPen, School } from "lucide-react"
import PageHeader from "@/components/page-header"
import ClassroomResourcesPicker from "@/components/classroom-resources-picker"
import { Section } from "@/components/settings-page"
import {
  getClassroomResources,
  getCustomClassroomResources,
  setClassroomResources,
  setCustomClassroomResources,
  type CustomClassroomResource,
} from "@/lib/classroom-resources"
import {
  getLessonSetupMode,
  getNoTechMode,
  getReproducibleLanguage,
  setLessonSetupMode,
  setNoTechMode,
  setOnboarded,
  setReproducibleLanguage,
  type LessonSetupMode,
} from "@/lib/personalization"

// Everything about the classroom the planner should know before it drafts a
// lesson: what's in the room, and how lessons should come out by default.
// Changes save as they're made. The planner reads these when it opens and can
// still override them for a single lesson.

export default function ClassroomProfile() {
  const [materials, setMaterials] = useState<string[]>(getClassroomResources)
  const [custom, setCustom] = useState<CustomClassroomResource[]>(getCustomClassroomResources)
  const [language, setLanguage] = useState(getReproducibleLanguage)
  const [noTech, setNoTech] = useState(getNoTechMode)
  const [setupMode, setSetupMode] = useState<LessonSetupMode>(getLessonSetupMode)

  const changeMaterials = (next: string[]) => {
    setMaterials(next)
    setClassroomResources(next)
    setOnboarded()
  }
  const changeCustom = (next: CustomClassroomResource[]) => {
    setCustom(next)
    setCustomClassroomResources(next)
    setOnboarded()
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <PageHeader icon={School} title="Classroom profile" iconColor="text-secondary-strong" iconBg="bg-secondary-tint" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
          <p className="text-sm text-muted-foreground">
            What Maple Key knows about your classroom. Lessons are drafted around it, and changes save as you make them.
          </p>

          <Section id="classroom-materials" icon={School} title="Materials and spaces">
            <p className="mb-4 text-sm text-muted-foreground">
              The tools, technology and spaces you have. Lesson plans only call for what&rsquo;s here.
            </p>
            <ClassroomResourcesPicker
              selected={materials}
              onChange={changeMaterials}
              customMaterials={custom}
              onCustomChange={changeCustom}
            />
          </Section>

          <Section id="classroom-defaults" icon={NotebookPen} title="Lesson defaults">
            <p className="mb-4 text-sm text-muted-foreground">
              Where every new lesson starts. You can still change these for a single lesson in the planner.
            </p>
            <div className="flex flex-col gap-5">
              <div>
                <label htmlFor="profile-language" className="text-sm font-semibold text-foreground">
                  Handout language
                </label>
                <p className="mb-2 text-xs text-muted-foreground">The language of student handouts and activities.</p>
                <select
                  id="profile-language"
                  value={language}
                  onChange={(e) => {
                    const v = e.target.value as "English" | "French"
                    setLanguage(v)
                    setReproducibleLanguage(v)
                  }}
                  className="h-11 w-full max-w-xs rounded-xl border border-border-strong bg-input px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="English">English</option>
                  <option value="French">French</option>
                </select>
              </div>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={noTech}
                  onChange={(e) => {
                    setNoTech(e.target.checked)
                    setNoTechMode(e.target.checked)
                  }}
                  className="mt-0.5 h-5 w-5 cursor-pointer rounded border-border-strong accent-primary"
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">No-tech mode</span>
                  <span className="block text-xs text-muted-foreground">
                    Keep students off screens. A projector for whole-class display is still fine.
                  </span>
                </span>
              </label>

              <fieldset>
                <legend className="text-sm font-semibold text-foreground">Planner layout</legend>
                <p className="mb-2 text-xs text-muted-foreground">How the planner&rsquo;s setup steps are shown.</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["wizard", "Guided, one step at a time"],
                      ["full", "All options on one page"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-medium ${
                        setupMode === value ? "border-secondary bg-secondary-tint text-secondary-strong" : "border-border-strong text-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="planner-layout"
                        value={value}
                        checked={setupMode === value}
                        onChange={() => {
                          setSetupMode(value)
                          setLessonSetupMode(value)
                        }}
                        className="accent-secondary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
