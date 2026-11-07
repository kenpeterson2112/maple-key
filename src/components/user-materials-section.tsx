"use client"

import { useRef, useState } from "react"
import { FilePlus2, Link2, X, FileText, Info, AlertCircle } from "lucide-react"
import { SUBJECTS as SUBJECT_OPTIONS } from "@/components/hero-personalize"

export type UserMaterialKind = "file" | "link"

export interface UserMaterial {
  id: string
  kind: UserMaterialKind
  name: string
  subject: string
  description: string
  expectations?: string
  fileSize?: number
  fileType?: string
  url?: string
  file?: File
}

interface UserMaterialsSectionProps {
  materials: UserMaterial[]
  onChange: (materials: UserMaterial[]) => void
}

const SUBJECTS = SUBJECT_OPTIONS.map((s) => s.value).filter(Boolean)
const MAX_FILES = 5
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]
const ACCEPT_ATTR = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"

type DraftKind = UserMaterialKind | null

interface Draft {
  kind: UserMaterialKind
  name: string
  file?: File
  url: string
  subject: string
  description: string
  expectations: string
  fileSize?: number
  fileType?: string
}

const emptyDraft = (kind: UserMaterialKind): Draft => ({
  kind,
  name: "",
  url: "",
  subject: "",
  description: "",
  expectations: "",
})

function formatBytes(bytes?: number) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UserMaterialsSection({ materials, onChange }: UserMaterialsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)

  const atLimit = materials.length >= MAX_FILES

  const handleFileButton = () => {
    setError(null)
    if (atLimit) {
      setError(`You can attach up to ${MAX_FILES} materials.`)
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Unsupported file type. Use PDF, DOC/DOCX, or an image (PNG, JPG, GIF, WEBP).")
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is larger than ${MAX_FILE_SIZE_MB} MB. Please choose a smaller file.`)
      return
    }
    setDraft({
      ...emptyDraft("file"),
      name: file.name,
      file,
      fileSize: file.size,
      fileType: file.type,
    })
  }

  const handleLinkButton = () => {
    setError(null)
    if (atLimit) {
      setError(`You can attach up to ${MAX_FILES} materials.`)
      return
    }
    setDraft(emptyDraft("link"))
  }

  const cancelDraft = () => {
    setDraft(null)
    setError(null)
  }

  const saveDraft = () => {
    if (!draft) return
    if (draft.kind === "link") {
      try {
        const u = new URL(draft.url)
        if (!/^https?:$/.test(u.protocol)) throw new Error("bad protocol")
      } catch {
        setError("Please enter a valid URL starting with http:// or https://")
        return
      }
    }
    if (!draft.subject) {
      setError("Please choose a subject.")
      return
    }
    if (!draft.description.trim()) {
      setError("Please add a short description.")
      return
    }

    const next: UserMaterial = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: draft.kind,
      name: draft.kind === "link" ? draft.url : draft.name,
      subject: draft.subject,
      description: draft.description.trim(),
      expectations: draft.expectations.trim() || undefined,
      url: draft.kind === "link" ? draft.url : undefined,
      file: draft.kind === "file" ? draft.file : undefined,
      fileSize: draft.fileSize,
      fileType: draft.fileType,
    }
    onChange([...materials, next])
    setDraft(null)
    setError(null)
  }

  const removeMaterial = (id: string) => {
    onChange(materials.filter((m) => m.id !== id))
  }

  return (
    <div className="bg-card rounded-xl border-2 border-border p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <FilePlus2 size={20} className="text-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Your Own Materials</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {materials.length}/{MAX_FILES}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Add files or links you'd like this lesson to draw from.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={handleFileButton}
          disabled={atLimit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-border bg-card text-sm font-medium text-foreground hover:bg-muted hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FilePlus2 size={16} className="text-foreground" />
          Upload File
        </button>
        <button
          type="button"
          onClick={handleLinkButton}
          disabled={atLimit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-border bg-card text-sm font-medium text-foreground hover:bg-muted hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Link2 size={16} className="text-foreground" />
          Add Link
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        PDF, DOC/DOCX, or image (PNG, JPG, GIF, WEBP). Up to {MAX_FILE_SIZE_MB} MB per file,{" "}
        {MAX_FILES} files total.
      </p>

      {error && !draft && (
        <div className="flex items-start gap-2 mb-3 p-3 rounded-lg bg-pop-tint border border-pop/50 text-sm text-pop-strong">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {draft && (
        <div className="border-2 border-primary rounded-lg p-4 mb-3 bg-muted">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {draft.kind === "file" ? <FileText size={16} /> : <Link2 size={16} />}
              {draft.kind === "file" ? "Describe this file" : "Add a link"}
            </div>
            <button
              type="button"
              onClick={cancelDraft}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X size={18} />
            </button>
          </div>

          {draft.kind === "file" && (
            <div className="mb-3 text-sm text-foreground">
              <span className="font-medium">{draft.name}</span>{" "}
              <span className="text-muted-foreground">({formatBytes(draft.fileSize)})</span>
            </div>
          )}

          {draft.kind === "link" && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-foreground mb-1">
                URL <span className="text-destructive">*</span>
              </label>
              <input
                type="url"
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                placeholder="https://example.com/resource"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-sm focus:outline-none focus:border-ring transition-colors"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Subject <span className="text-destructive">*</span>
              </label>
              <select
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-sm focus:outline-none focus:border-ring transition-colors"
              >
                <option value="">Select a subject…</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Curriculum expectations <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                value={draft.expectations}
                onChange={(e) => setDraft({ ...draft, expectations: e.target.value })}
                placeholder="e.g. D1.1, D1.2"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-sm focus:outline-none focus:border-ring transition-colors"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-foreground mb-1">
              Description <span className="text-destructive">*</span>
            </label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              placeholder="What is this material and how should it be used in the lesson?"
              className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-sm focus:outline-none focus:border-ring transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-pop-tint border border-pop/50 text-xs text-pop-strong">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelDraft}
              className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveDraft}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Add material
            </button>
          </div>
        </div>
      )}

      {materials.length > 0 && (
        <div className="bg-muted rounded-lg p-3 space-y-2 mb-3">
          {materials.map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-3 py-2 px-3 bg-card rounded-lg border border-border"
            >
              <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0">
                {m.kind === "file" ? <FileText size={12} /> : <Link2 size={12} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">{m.name}</span>
                  <span className="inline-block px-2 py-0.5 bg-muted border border-border rounded-full text-xs text-foreground">
                    {m.subject}
                  </span>
                  {m.expectations && (
                    <span className="text-xs text-muted-foreground">{m.expectations}</span>
                  )}
                  {m.kind === "file" && m.fileSize && (
                    <span className="text-xs text-muted-foreground">{formatBytes(m.fileSize)}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.description}</p>
              </div>
              <button
                type="button"
                onClick={() => removeMaterial(m.id)}
                className="text-muted-foreground hover:text-destructive flex-shrink-0"
                aria-label={`Remove ${m.name}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted border border-border rounded-lg px-3 py-2">
        <Info size={14} className="text-foreground flex-shrink-0 mt-0.5" />
        <span>
          These materials will be saved to your Maple Key account under{" "}
          <span className="font-medium text-foreground">My Materials</span>, alongside the resources
          and tools available in your class.
        </span>
      </div>
    </div>
  )
}
