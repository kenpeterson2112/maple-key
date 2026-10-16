import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Check, Download, Loader2 } from "lucide-react"
import { activityStorageKey, type StudentActivity } from "@/lib/student-activity"

/**
 * Student-facing fill-in page for a shared graphic organizer.
 *
 * No login and no network: the activity comes from the link, answers autosave
 * to this browser, and the finished work leaves as a PDF the student attaches
 * to their Classroom assignment themselves.
 */

const STRINGS = {
  en: {
    nameLabel: "Your name",
    namePlaceholder: "First name and last initial",
    nameNeeded: "Add your name so your teacher knows whose work this is.",
    answerPlaceholder: "Type your answer here…",
    saved: "Saved on this device",
    download: "Download my work",
    downloading: "Making your PDF…",
    downloadError: "Something went wrong making the PDF. Try again.",
    doneTitle: "When you're done",
    steps: [
      "Press Download my work. A PDF is saved to your Downloads.",
      "Go back to your assignment in Google Classroom.",
      "Click Add or create, then File, and choose the PDF.",
      "Click Turn in.",
    ],
    clear: "Start over",
    clearConfirm: "Erase everything you typed on this activity?",
  },
  fr: {
    nameLabel: "Ton nom",
    namePlaceholder: "Prénom et initiale du nom",
    nameNeeded: "Ajoute ton nom pour que ton enseignant·e sache à qui est ce travail.",
    answerPlaceholder: "Écris ta réponse ici…",
    saved: "Enregistré sur cet appareil",
    download: "Télécharger mon travail",
    downloading: "Création du PDF…",
    downloadError: "Un problème est survenu. Réessaie.",
    doneTitle: "Quand tu as terminé",
    steps: [
      "Appuie sur Télécharger mon travail. Le PDF va dans tes Téléchargements.",
      "Retourne à ton devoir dans Google Classroom.",
      "Clique sur Ajouter ou créer, puis Fichier, et choisis le PDF.",
      "Clique sur Remettre.",
    ],
    clear: "Recommencer",
    clearConfirm: "Effacer tout ce que tu as écrit dans cette activité?",
  },
} as const

interface SavedWork {
  studentName: string
  responses: string[]
}

function loadWork(key: string, count: number): SavedWork {
  const empty = { studentName: "", responses: Array<string>(count).fill("") }
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return empty
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return empty
    const p = parsed as Record<string, unknown>
    const responses = Array.isArray(p.responses) ? p.responses : []
    return {
      studentName: typeof p.studentName === "string" ? p.studentName : "",
      responses: Array.from({ length: count }, (_, i) => (typeof responses[i] === "string" ? responses[i] : "")),
    }
  } catch {
    return empty
  }
}

interface Props {
  activity: StudentActivity
  /**
   * Autosave key. Short links pass one based on the activity id, so answers
   * survive a teacher editing the activity; hash links key on the content.
   */
  storageKey?: string
}

export default function StudentActivityPage({ activity, storageKey: keyOverride }: Props) {
  const t = STRINGS[activity.lang]
  const storageKey = useMemo(() => keyOverride ?? activityStorageKey(activity), [keyOverride, activity])
  const [work, setWork] = useState<SavedWork>(() => loadWork(storageKey, activity.prompts.length))
  const [savedOk, setSavedOk] = useState(false)
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle")
  const [nameMissing, setNameMissing] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = `${activity.title} · Maple Key`
    document.documentElement.lang = activity.lang
  }, [activity])

  // Autosave on every change; a closed tab or dead battery shouldn't cost a student their work.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(work))
      setSavedOk(true)
    } catch {
      setSavedOk(false)
    }
  }, [work, storageKey])

  const setResponse = (i: number, value: string) =>
    setWork((prev) => ({ ...prev, responses: prev.responses.map((r, j) => (j === i ? value : r)) }))

  const handleDownload = async () => {
    if (!work.studentName.trim()) {
      setNameMissing(true)
      nameRef.current?.focus()
      return
    }
    setStatus("working")
    try {
      const { downloadActivityPdf } = await import("@/lib/student-activity-pdf")
      await downloadActivityPdf(activity, { studentName: work.studentName.trim(), responses: work.responses })
      setStatus("idle")
    } catch {
      setStatus("error")
    }
  }

  const handleClear = () => {
    if (!window.confirm(t.clearConfirm)) return
    setWork({ studentName: "", responses: Array<string>(activity.prompts.length).fill("") })
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <p className="text-sm font-semibold text-primary">Maple Key</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">{activity.title}</h1>
        {activity.subtitle && <p className="mt-2 text-muted-foreground">{activity.subtitle}</p>}

        <div className="mt-6">
          <label htmlFor="student-name" className="block text-sm font-medium">
            {t.nameLabel}
          </label>
          <input
            id="student-name"
            ref={nameRef}
            value={work.studentName}
            onChange={(e) => {
              setNameMissing(false)
              setWork((prev) => ({ ...prev, studentName: e.target.value }))
            }}
            placeholder={t.namePlaceholder}
            autoComplete="name"
            aria-invalid={nameMissing}
            aria-describedby={nameMissing ? "name-needed" : undefined}
            className="mt-1 w-full max-w-sm rounded-lg border-2 border-border bg-input px-3 py-2 focus:border-ring focus:outline-none"
          />
          {nameMissing && (
            <p id="name-needed" className="mt-1 flex items-center gap-1 text-sm text-destructive">
              <AlertCircle size={14} aria-hidden /> {t.nameNeeded}
            </p>
          )}
        </div>

        <div className="mt-8 space-y-6">
          {activity.prompts.map((prompt, i) => (
            <section key={i} className="overflow-hidden rounded-lg border-2 border-border bg-card">
              <label
                htmlFor={`response-${i}`}
                className="block border-b border-border bg-muted/40 px-4 py-2 text-sm font-bold uppercase tracking-wide"
              >
                {prompt}
              </label>
              <textarea
                id={`response-${i}`}
                value={work.responses[i]}
                onChange={(e) => setResponse(i, e.target.value)}
                placeholder={t.answerPlaceholder}
                rows={5}
                className="block w-full resize-y bg-card px-4 py-3 text-base leading-relaxed text-card-foreground focus:outline-none"
              />
            </section>
          ))}
        </div>

        <div className="mt-4 flex h-6 items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1" aria-live="polite">
            {savedOk && (
              <>
                <Check size={14} aria-hidden /> {t.saved}
              </>
            )}
          </span>
          <button onClick={handleClear} className="underline-offset-2 hover:underline">
            {t.clear}
          </button>
        </div>

        <section className="mt-8 rounded-lg border-2 border-primary bg-card p-6" aria-labelledby="done-title">
          <h2 id="done-title" className="text-lg font-bold">
            {t.doneTitle}
          </h2>
          <ol className="mt-3 list-decimal space-y-1 pl-6">
            {t.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <button
            onClick={handleDownload}
            disabled={status === "working"}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === "working" ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Download size={18} aria-hidden />}
            {status === "working" ? t.downloading : t.download}
          </button>
          {status === "error" && <p className="mt-2 text-sm text-destructive">{t.downloadError}</p>}
        </section>
      </main>
    </div>
  )
}
