"use client"

import { useState } from "react"
import { X } from "lucide-react"
import type { Resource } from "@/lib/types"
import { diffFields, type AdminEditableFields } from "@/lib/admin-changes"

interface AdminResourceEditorProps {
  // The untouched record from resources.json — diffs are computed against it.
  original: Resource
  // Record with any pending edits already applied, used to seed the form.
  effective: Resource
  onSave: (fields: AdminEditableFields) => void
  onClose: () => void
}

const listToText = (list?: (string | number)[]) => (list ?? []).join(", ")

const textToList = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

const textToGrades = (text: string): (number | "K" | "PreK")[] =>
  textToList(text).map((g) => {
    if (g.toLowerCase() === "k") return "K"
    if (g.toLowerCase() === "prek") return "PreK"
    const n = Number(g)
    return Number.isFinite(n) ? n : "K"
  })

const FIELD_CLASS =
  "w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
const LABEL_CLASS = "block text-xs font-semibold text-muted-foreground mb-1"

export default function AdminResourceEditor({ original, effective, onSave, onClose }: AdminResourceEditorProps) {
  const [title, setTitle] = useState(effective.topic_title)
  const [url, setUrl] = useState(effective.url)
  const [publisher, setPublisher] = useState(effective.publisher_creator)
  const [subject, setSubject] = useState(effective.subject)
  const [description, setDescription] = useState(effective.description)
  const [usageNotes, setUsageNotes] = useState(effective.usage_notes ?? "")
  const [grades, setGrades] = useState(listToText(effective.grade_level))
  const [strands, setStrands] = useState(listToText(effective.strand))
  const [expectations, setExpectations] = useState(listToText(effective.curriculum_expectations))
  const [tags, setTags] = useState(listToText(effective.tags))
  const [isCollection, setIsCollection] = useState(Boolean(effective.is_collection))
  const [suppressed, setSuppressed] = useState(Boolean(effective.suppressed))

  const handleSave = () => {
    const fields = diffFields(original, {
      topic_title: title,
      description,
      url,
      publisher_creator: publisher,
      subject,
      usage_notes: usageNotes,
      grade_level: textToGrades(grades),
      strand: textToList(strands),
      curriculum_expectations: textToList(expectations),
      tags: textToList(tags),
      is_collection: isCollection,
      suppressed,
    })
    onSave(fields)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-card-foreground">Edit {original.id}</p>
            <p className="truncate text-xs text-muted-foreground">{original.topic_title}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted" title="Close">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div>
            <label className={LABEL_CLASS}>Title</label>
            <input className={FIELD_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={LABEL_CLASS}>URL</label>
            <input className={FIELD_CLASS} value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Publisher / creator</label>
              <input className={FIELD_CLASS} value={publisher} onChange={(e) => setPublisher(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Subject</label>
              <input className={FIELD_CLASS} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>Description</label>
            <textarea
              className={FIELD_CLASS}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Usage notes</label>
            <textarea
              className={FIELD_CLASS}
              rows={2}
              value={usageNotes}
              onChange={(e) => setUsageNotes(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={LABEL_CLASS}>Grades (comma-separated)</label>
              <input className={FIELD_CLASS} value={grades} onChange={(e) => setGrades(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Strands</label>
              <input className={FIELD_CLASS} value={strands} onChange={(e) => setStrands(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Expectation codes</label>
              <input className={FIELD_CLASS} value={expectations} onChange={(e) => setExpectations(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>Tags (comma-separated)</label>
            <input
              className={FIELD_CLASS}
              placeholder="e.g. needs-review, dead-link"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm text-card-foreground">
              <input type="checkbox" checked={isCollection} onChange={(e) => setIsCollection(e.target.checked)} />
              Collection (hidden from search)
            </label>
            <label className="flex items-center gap-2 text-sm text-card-foreground">
              <input type="checkbox" checked={suppressed} onChange={(e) => setSuppressed(e.target.checked)} />
              Suppressed (hidden from search)
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
