"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Flag,
  GitPullRequest,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react"
import type { Resource } from "@/lib/types"
import { withBasePath } from "@/lib/base-path"
import { fetchJson } from "@/lib/fetch-json"
import { keywordFilter } from "@/lib/use-filtered-resources"
import {
  applyChangeset,
  applyEdit,
  approvePatch,
  countChangeset,
  diffFields,
  escalatePatch,
  loadChangeset,
  reviewQueueOrder,
  saveChangeset,
  REMOVAL_REASON_MAX,
  type AdminChangeset,
  type AdminEditableFields,
} from "@/lib/admin-changes"
import AdminCoverage from "./admin-coverage"
import AdminResourceEditor from "./admin-resource-editor"

// Admin Database Manager — a stripped-down version of Resource Discovery for
// curating resources.json itself: search, then tag / suppress / edit / delete
// and push the accumulated changeset to GitHub as a PR (api/admin-push.ts).
// Reached via the #admin hash (see main.tsx); not linked from the app chrome.

const fetcher = fetchJson

type StatusFilter = "all" | "visible" | "collections" | "suppressed" | "changed" | "needs_review"

const ADMIN_KEY_STORAGE = "mk-admin-key"
const PAGE_SIZE = 50

interface Row {
  original: Resource
  effective: Resource
  deleted: boolean
  edited: boolean
}

export default function AdminSpace() {
  const { data, error, isLoading } = useSWR<{ meta: Record<string, unknown>; resources: Resource[] }>(
    withBasePath("/resources.json"),
    fetcher,
    { revalidateOnFocus: false },
  )

  const [changes, setChanges] = useState<AdminChangeset>(() => loadChangeset())
  const [searchQuery, setSearchQuery] = useState("")
  const [subject, setSubject] = useState("")
  const [grade, setGrade] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showCoverage, setShowCoverage] = useState(false)
  const [showPushDialog, setShowPushDialog] = useState(false)

  useEffect(() => saveChangeset(changes), [changes])

  const rows = useMemo((): Row[] => {
    const resources = data?.resources ?? []
    return resources.map((original) => {
      const change = changes[original.id]
      if (!change) return { original, effective: original, deleted: false, edited: false }
      if (change.action === "delete") return { original, effective: original, deleted: true, edited: false }
      return { original, effective: applyEdit(original, change.fields), deleted: false, edited: true }
    })
  }, [data, changes])

  const subjects = useMemo(
    () => Array.from(new Set(rows.map((r) => r.effective.subject).filter(Boolean))).sort(),
    [rows],
  )
  const grades = useMemo(() => {
    const all = new Set<string>()
    rows.forEach((r) => r.effective.grade_level?.forEach((g) => all.add(String(g))))
    return Array.from(all).sort((a, b) => Number(a) - Number(b))
  }, [rows])

  const filteredRows = useMemo(() => {
    let out = rows
    if (subject) out = out.filter((r) => r.effective.subject === subject)
    if (grade) out = out.filter((r) => r.effective.grade_level?.map(String).includes(grade))
    if (status === "visible") out = out.filter((r) => !r.deleted && !r.effective.is_collection && !r.effective.suppressed)
    if (status === "collections") out = out.filter((r) => r.effective.is_collection)
    if (status === "suppressed") out = out.filter((r) => r.effective.suppressed)
    if (status === "changed") out = out.filter((r) => r.deleted || r.edited)
    if (status === "needs_review") {
      // Most-escalated first so repeat-flagged records lead the queue.
      out = out
        .filter((r) => r.effective.metadata?.needs_review)
        .slice()
        .sort((a, b) => reviewQueueOrder(a.effective, b.effective))
    }
    if (searchQuery.length >= 3) {
      const matched = new Set(keywordFilter(out.map((r) => r.effective), searchQuery).map((r) => r.id))
      out = out.filter((r) => matched.has(r.original.id))
    }
    return out
  }, [rows, subject, grade, status, searchQuery])

  useEffect(() => setPage(1), [subject, grade, status, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const { edits, deletes } = countChangeset(changes)
  const pendingCount = edits + deletes
  const reviewQueueCount = useMemo(
    () => rows.filter((r) => !r.deleted && r.effective.metadata?.needs_review).length,
    [rows],
  )

  // Coverage counts only what a teacher can actually find, so it matches the
  // app's own visibility rule (use-filtered-resources.ts). Counting the 394
  // collection hubs and the suppressed records would overstate every cell.
  const coverageResources = useMemo(
    () =>
      rows
        .filter((r) => !r.deleted && !r.effective.is_collection && !r.effective.suppressed)
        .map((r) => r.effective),
    [rows],
  )

  // Merge a field diff into the changeset, dropping entries that become no-ops.
  const setFields = (original: Resource, fields: AdminEditableFields) => {
    setChanges((prev) => {
      const existing = prev[original.id]
      const baseFields = existing?.action === "edit" ? existing.fields : {}
      const merged = diffFields(original, { ...baseFields, ...fields })
      const next = { ...prev }
      if (Object.keys(merged).length === 0) delete next[original.id]
      else next[original.id] = { action: "edit", fields: merged }
      return next
    })
  }

  const toggleDelete = (row: Row) => {
    setChanges((prev) => {
      const next = { ...prev }
      if (row.deleted) delete next[row.original.id]
      else next[row.original.id] = { action: "delete" }
      return next
    })
  }

  // Triage: approve and escalate are metadata edits, so they ride the normal
  // changeset path and land in the same review PR as everything else.
  const approve = (row: Row) => setFields(row.original, { metadata: approvePatch() })
  const escalate = (row: Row) => setFields(row.original, { metadata: escalatePatch(row.effective) })

  // Remove is the hard action: it archives the row with a reason, then deletes.
  const removeWithReason = (row: Row, reason: string) => {
    setChanges((prev) => ({ ...prev, [row.original.id]: { action: "delete", reason } }))
    setRemovingId(null)
  }

  const downloadJson = () => {
    if (!data) return
    const updated = { ...data, resources: applyChangeset(data.resources, changes) }
    const blob = new Blob([JSON.stringify(updated, null, 2) + "\n"], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "resources.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-destructive">Failed to load resources.json — refresh to retry.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-card-foreground">Maple Key — Database Manager</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Loading resources.json…"
                : `${rows.length} records · ${rows.filter((r) => !r.deleted && !r.effective.is_collection && !r.effective.suppressed).length} visible in app · ${rows.filter((r) => r.effective.is_collection).length} collections · ${rows.filter((r) => r.effective.suppressed).length} suppressed`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCoverage((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${
                showCoverage
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground hover:bg-muted"
              }`}
              title="Coverage and health snapshot"
            >
              <BarChart3 size={14} /> Coverage
            </button>
            <a href={withBasePath("/")} className="text-sm text-primary underline">
              Back to app
            </a>
          </div>
        </div>
      </header>

      {showCoverage && (
        <div className="border-b border-border bg-card/40">
          <AdminCoverage resources={coverageResources} />
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/60 px-4 py-2 md:px-6">
        <div className="relative flex min-w-48 flex-1 items-center rounded-lg border border-border bg-input px-3 py-1.5 focus-within:border-ring">
          <Search size={14} className="mr-2 shrink-0 text-muted-foreground" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search title, publisher, URL, codes… (3+ chars)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} title="Clear search">
              <X size={13} className="text-muted-foreground" />
            </button>
          )}
        </div>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-lg border border-border bg-input px-2 py-1.5 text-sm">
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="rounded-lg border border-border bg-input px-2 py-1.5 text-sm">
          <option value="">All grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="rounded-lg border border-border bg-input px-2 py-1.5 text-sm">
          <option value="all">All records</option>
          <option value="visible">Visible in app</option>
          <option value="collections">Collections</option>
          <option value="suppressed">Suppressed</option>
          <option value="changed">Pending changes</option>
          <option value="needs_review">Needs review ({reviewQueueCount})</option>
        </select>
        <span className="text-xs text-muted-foreground">{filteredRows.length} matches</span>
      </div>

      {/* Result list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 md:px-6">
        <div className="space-y-1.5">
          {pagedRows.map((row) => {
            const r = row.effective
            return (
              <div
                key={r.id}
                className={`flex items-start gap-3 rounded-xl border bg-card px-3 py-2 ${
                  row.deleted ? "border-destructive/50 opacity-60" : row.edited ? "border-primary/50" : "border-border"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{r.id}</span>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`truncate text-sm font-semibold text-card-foreground hover:text-primary hover:underline ${row.deleted ? "line-through" : ""}`}
                    >
                      {r.topic_title}
                    </a>
                    {r.is_collection && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">collection</span>
                    )}
                    {r.suppressed && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">suppressed</span>
                    )}
                    {row.edited && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">edited</span>
                    )}
                    {row.deleted && (
                      <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground">delete pending</span>
                    )}
                    {r.metadata?.needs_review && (
                      <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                        needs review{(r.metadata.review_priority ?? 0) > 0 ? ` ·${r.metadata.review_priority}` : ""}
                      </span>
                    )}
                    {r.metadata?.verified && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">verified</span>
                    )}
                    {(r.tags ?? []).map((t) => (
                      <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">#{t}</span>
                    ))}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.publisher_creator} · {r.subject} · Gr {(r.grade_level ?? []).join(", ")} · {(r.curriculum_expectations ?? []).join(" ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {/* Triage verdicts — shown only for records actually in the
                      queue, so the default row keeps its original density. */}
                  {r.metadata?.needs_review && (
                    <>
                      <button
                        onClick={() => approve(row)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                        title="Approve — no issue; mark verified and clear review"
                      >
                        <CheckCircle2 size={15} />
                      </button>
                      <button
                        onClick={() => escalate(row)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Escalate — keep in queue and raise its priority"
                      >
                        <Flag size={15} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setEditingId(r.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Edit / tag"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setFields(row.original, { suppressed: !r.suppressed })}
                    className={`rounded-lg p-1.5 hover:bg-muted ${r.suppressed ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
                    title={r.suppressed ? "Unsuppress" : "Suppress (hide from app)"}
                  >
                    {r.suppressed ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    onClick={() => setFields(row.original, { is_collection: !r.is_collection })}
                    className={`rounded-lg p-1.5 hover:bg-muted ${r.is_collection ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    title={r.is_collection ? "Unmark collection" : "Mark as collection"}
                  >
                    <Boxes size={15} />
                  </button>
                  {/* Removal always goes through the reason dialog, so every
                      delete lands in removed-resources.json rather than just
                      vanishing from the file. */}
                  <button
                    onClick={() => (row.deleted ? toggleDelete(row) : setRemovingId(r.id))}
                    className={`rounded-lg p-1.5 hover:bg-muted ${row.deleted ? "text-foreground" : "text-muted-foreground hover:text-destructive"}`}
                    title={row.deleted ? "Undo removal" : "Remove — archive with a reason, then delete"}
                  >
                    {row.deleted ? <RotateCcw size={15} /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-border px-3 py-1 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-muted-foreground">Page {page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border px-3 py-1 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Pending-changes bar */}
      {pendingCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-2.5 md:px-6">
          <span className="text-sm font-medium text-card-foreground">
            {pendingCount} pending change{pendingCount === 1 ? "" : "s"}
            <span className="text-muted-foreground"> ({edits} edit{edits === 1 ? "" : "s"}, {deletes} delete{deletes === 1 ? "" : "s"})</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm("Discard all pending changes?")) setChanges({})
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              Discard
            </button>
            <button
              onClick={downloadJson}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
              title="Download resources.json with changes applied"
            >
              <Download size={14} /> Download JSON
            </button>
            <button
              onClick={() => setShowPushDialog(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <GitPullRequest size={14} /> Push to GitHub
            </button>
          </div>
        </div>
      )}

      {editingId && (() => {
        const row = rows.find((r) => r.original.id === editingId)
        if (!row) return null
        return (
          <AdminResourceEditor
            original={row.original}
            effective={row.effective}
            onClose={() => setEditingId(null)}
            onSave={(fields) => {
              setChanges((prev) => {
                const next = { ...prev }
                if (Object.keys(fields).length === 0) {
                  if (next[row.original.id]?.action === "edit") delete next[row.original.id]
                } else {
                  next[row.original.id] = { action: "edit", fields }
                }
                return next
              })
              setEditingId(null)
            }}
          />
        )
      })()}

      {removingId && (() => {
        const row = rows.find((r) => r.original.id === removingId)
        if (!row) return null
        return (
          <RemoveDialog
            resource={row.effective}
            onClose={() => setRemovingId(null)}
            onConfirm={(reason) => removeWithReason(row, reason)}
          />
        )
      })()}

      {showPushDialog && (
        <PushDialog
          changes={changes}
          onClose={() => setShowPushDialog(false)}
          onPushed={() => setChanges({})}
        />
      )}
    </div>
  )
}

// Removal is the one destructive triage verdict, so it collects a reason before
// it will commit. api/admin-push.ts archives the full row plus that reason to
// public/removed-resources.json in the same commit that drops it, which is what
// makes the delete recoverable without git archaeology.
function RemoveDialog({
  resource,
  onClose,
  onConfirm,
}: {
  resource: Resource
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState("")
  const trimmed = reason.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-card-foreground">Remove this resource</h2>
        <p className="mt-2 truncate text-sm font-semibold text-card-foreground">{resource.topic_title}</p>
        <p className="truncate text-xs text-muted-foreground">{resource.url}</p>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Deletes the record so nothing downstream can serve it. The full row is archived to{" "}
            <span className="font-mono">removed-resources.json</span> with this reason, and the change still
            goes through a draft PR. To hide a resource without deleting it, use suppress instead.
          </p>
          <textarea
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-ring"
            rows={2}
            maxLength={REMOVAL_REASON_MAX}
            placeholder="Why is this being removed? (e.g. dead link, duplicate of r-123)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              {trimmed.length}/{REMOVAL_REASON_MAX}
            </span>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={() => onConfirm(trimmed)}
                disabled={trimmed.length === 0}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// "Push to GitHub" flow: sends the changeset to api/admin-push.ts, which
// applies it to resources.json on a fresh branch and opens a draft PR.
function PushDialog({
  changes,
  onClose,
  onPushed,
}: {
  changes: AdminChangeset
  onClose: () => void
  onPushed: () => void
}) {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(ADMIN_KEY_STORAGE) ?? "")
  const [note, setNote] = useState("")
  const [state, setState] = useState<"idle" | "pushing" | "done" | "error">("idle")
  const [message, setMessage] = useState("")
  const [prUrl, setPrUrl] = useState("")

  const push = async () => {
    setState("pushing")
    localStorage.setItem(ADMIN_KEY_STORAGE, adminKey)
    try {
      const res = await fetch("/api/admin-push", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-MK-Admin-Key": adminKey },
        body: JSON.stringify({ changes, note }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState("error")
        setMessage(body.error ?? `Push failed (HTTP ${res.status})`)
        return
      }
      setPrUrl(body.prUrl ?? "")
      setMessage(`Opened PR with ${body.applied} change${body.applied === 1 ? "" : "s"} applied.`)
      setState("done")
      onPushed()
    } catch {
      setState("error")
      setMessage("Network error — are you on the Vercel deployment? The GitHub Pages mirror has no API.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-card-foreground">Push changes to GitHub</h2>
        {state === "done" ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-card-foreground">{message}</p>
            {prUrl && (
              <a href={prUrl} target="_blank" rel="noreferrer" className="block text-sm font-semibold text-primary underline">
                Review the pull request →
              </a>
            )}
            <button onClick={onClose} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Done
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Opens a draft PR against <span className="font-mono">main</span> updating both copies of
              resources.json. Requires the admin key configured on Vercel (MK_ADMIN_SECRET).
            </p>
            <input
              type="password"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-ring"
              placeholder="Admin key"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
            />
            <textarea
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-ring"
              rows={2}
              placeholder="Optional note for the PR description"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {state === "error" && <p className="text-sm text-destructive">{message}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={push}
                disabled={state === "pushing" || !adminKey}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {state === "pushing" ? "Pushing…" : "Open PR"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
