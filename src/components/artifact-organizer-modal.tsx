import { useState } from "react"
import { X, Printer } from "lucide-react"
import type { LessonArtifact } from "@/lib/lesson-metadata"
import { openPrintWindow, escapeHtml, nl2br, PRINT_ON_LOAD_SCRIPT } from "@/lib/print-html"

interface Props {
  artifact: LessonArtifact
  lessonTitle: string
  /** Language of the printed handout. Defaults to English. */
  language?: "English" | "French"
  onClose: () => void
  onSave: (fields: Record<string, string>) => void
}

/**
 * Default box labels seed the printed handout. Placeholders and the editor's own
 * field labels stay English — they're teacher-facing tool chrome, never printed.
 * Only these default label VALUES (which become the printed box headers) localize.
 */
const DEFAULT_FIELDS: { key: string; label: string; labelFr: string; placeholder: string }[] = [
  { key: "q1", label: "What I noticed", labelFr: "Ce que j'ai remarqué", placeholder: "Observations students record…" },
  { key: "q2", label: "What I wonder", labelFr: "Ce que je me demande", placeholder: "Questions students develop…" },
  { key: "q3", label: "Evidence", labelFr: "Mes preuves", placeholder: "Details, sketches, or quotes…" },
  { key: "q4", label: "My idea", labelFr: "Mon idée", placeholder: "Conclusion or hypothesis…" },
]

/** Strings printed on the handout itself (not the editor chrome). */
const PRINT_STRINGS = {
  English: { lang: "en", heading: "Editable Graphic Organizer", name: "Name:", date: "Date:" },
  French: { lang: "fr", heading: "Organisateur graphique", name: "Nom :", date: "Date :" },
} as const

export default function ArtifactOrganizerModal({ artifact, lessonTitle, language = "English", onClose, onSave }: Props) {
  const isFrench = language === "French"
  const initial = artifact.organizer?.fields ?? {}
  const [title, setTitle] = useState(initial.title ?? artifact.name)
  const [subtitle, setSubtitle] = useState(
    initial.subtitle ?? `${lessonTitle} — ${artifact.purpose}`,
  )
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      DEFAULT_FIELDS.map((f) => [`label_${f.key}`, initial[`label_${f.key}`] ?? (isFrench ? f.labelFr : f.label)]),
    ),
  )

  const buildFields = (): Record<string, string> => ({
    title,
    subtitle,
    ...labels,
  })

  const handleSaveAndClose = () => {
    onSave(buildFields())
    onClose()
  }

  const handlePrint = () => {
    onSave(buildFields())
    const html = renderOrganizerHtml(
      title,
      subtitle,
      DEFAULT_FIELDS.map((f) => ({
        label: labels[`label_${f.key}`] || (isFrench ? f.labelFr : f.label),
      })),
      language,
    )
    openPrintWindow(html)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-semibold text-[#2C2C2C]">Editable Graphic Organizer</h3>
          <button
            onClick={handleSaveAndClose}
            className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Close organizer"
          >
            <X size={18} className="text-stone-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-stone-600">
            Customize the title, subtitle, and section prompts. The printed handout leaves student
            response areas blank — students write in them by hand.
          </p>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border-2 border-stone-300 rounded-lg text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Subtitle / context</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3 py-2 border-2 border-stone-300 rounded-lg text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {DEFAULT_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Prompt for box {f.key.slice(1)}
                </label>
                <input
                  value={labels[`label_${f.key}`]}
                  onChange={(e) =>
                    setLabels((prev) => ({ ...prev, [`label_${f.key}`]: e.target.value }))
                  }
                  className="w-full px-3 py-2 border-2 border-stone-300 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-stone-200 bg-stone-50">
          <button
            onClick={handleSaveAndClose}
            className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg"
          >
            Save &amp; close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Printer size={14} />
            Print / Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}

function renderOrganizerHtml(
  title: string,
  subtitle: string,
  boxes: { label: string }[],
  language: "English" | "French" = "English",
): string {
  const t = PRINT_STRINGS[language]
  const boxesHtml = boxes
    .map(
      (b) => `
      <div class="box">
        <div class="box-label">${escapeHtml(b.label)}</div>
        <div class="box-body"></div>
      </div>`,
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="${t.lang}">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: Letter; margin: 0.5in; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', sans-serif;
      font-size: 11pt;
      color: #2C2C2C;
      background: #FFF;
      font-weight: 400;
      font-synthesis: none;
      -webkit-font-smoothing: antialiased;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 12px;
      border-bottom: 1px solid #E5E5E5;
      font-size: 9pt;
      color: #888;
    }
    .header .brand { font-weight: 600; color: #8B4513; letter-spacing: 0.3px; }
    .name-row {
      display: flex;
      gap: 24px;
      margin-bottom: 14px;
      font-size: 10pt;
      color: #444;
    }
    .name-row .field {
      flex: 1;
      border-bottom: 1px solid #999;
      padding-bottom: 2px;
    }
    .name-row .field-label { color: #888; font-size: 9pt; margin-right: 4px; }
    h1.title {
      font-size: 20pt;
      font-weight: 700;
      margin: 0 0 4px 0;
      line-height: 1.2;
    }
    p.subtitle {
      font-size: 10pt;
      color: #555;
      margin: 0 0 14px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .box {
      border: 1.5px solid #C8C5C2;
      border-radius: 10px;
      overflow: hidden;
      min-height: 3.6in;
      display: flex;
      flex-direction: column;
      page-break-inside: avoid;
    }
    .box-label {
      background: #FAFAF9;
      border-bottom: 1px solid #E7E5E4;
      padding: 6px 10px;
      font-size: 10pt;
      font-weight: 700;
      color: #57534E;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .box-body { flex: 1; }
    .footer {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px solid #E5E5E5;
      text-align: center;
      font-size: 8.5pt;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="brand">Maple Key</span>
    <span>${escapeHtml(t.heading)}</span>
  </div>
  <h1 class="title">${escapeHtml(title)}</h1>
  <p class="subtitle">${nl2br(subtitle)}</p>
  <div class="name-row">
    <div class="field"><span class="field-label">${escapeHtml(t.name)}</span></div>
    <div class="field"><span class="field-label">${escapeHtml(t.date)}</span></div>
  </div>
  <div class="grid">${boxesHtml}</div>
  <div class="footer">Maple Key • maplekey.ca</div>
  ${PRINT_ON_LOAD_SCRIPT}
</body>
</html>`
}
