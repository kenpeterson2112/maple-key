import type { StudentActivity } from "@/lib/student-activity"
import { fileSlug } from "@/lib/student-activity"

/**
 * One-click PDF of a completed student activity, built entirely in the browser.
 *
 * jsPDF is imported lazily so it only ships to students who press Download,
 * never to the main teacher bundle. It uses the built-in Helvetica (Latin-1),
 * which covers French accents; the app's web fonts are deliberately not
 * embedded (see the PDF gotcha in CLAUDE.md).
 *
 * Layout is a single column of auto-height boxes rather than the 2x2 printed
 * grid: typed answers can be long, and a box must grow (and break across
 * pages) instead of clipping what a student wrote.
 */

const STRINGS = {
  en: { name: "Name:", date: "Date:", footer: "Completed with Maple Key", file: "Activity", cont: "cont." },
  fr: { name: "Nom :", date: "Date :", footer: "Complété avec Maple Key", file: "Activite", cont: "suite" },
} as const

// PDF drawing colours (RGB). These mirror the printed organizer in
// artifact-organizer-modal.tsx; jsPDF can't read CSS tokens.
const INK: [number, number, number] = [44, 44, 44]
const SOFT: [number, number, number] = [110, 110, 110]
const BRAND: [number, number, number] = [139, 69, 19]
const RULE: [number, number, number] = [200, 197, 194]
const LABEL_BG: [number, number, number] = [250, 250, 249]

export interface ActivityAnswers {
  studentName: string
  responses: string[]
}

export function activityFileName(activity: StudentActivity, studentName: string): string {
  const title = fileSlug(activity.title) || STRINGS[activity.lang].file
  const name = fileSlug(studentName, 30)
  return `${title}${name ? `-${name}` : ""}.pdf`
}

export async function downloadActivityPdf(activity: StudentActivity, answers: ActivityAnswers): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const t = STRINGS[activity.lang]
  const doc = new jsPDF({ unit: "pt", format: "letter" })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 36
  const contentW = pageW - margin * 2
  const bottom = pageH - margin - 18
  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > bottom) {
      doc.addPage()
      y = margin
    }
  }

  // Header strip
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...BRAND)
  doc.text("Maple Key", margin, y + 9)
  y += 18
  doc.setDrawColor(...RULE).setLineWidth(0.75).line(margin, y, pageW - margin, y)
  y += 20

  // Title + subtitle
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(...INK)
  for (const line of doc.splitTextToSize(activity.title, contentW) as string[]) {
    doc.text(line, margin, y + 14)
    y += 22
  }
  if (activity.subtitle) {
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...SOFT)
    for (const line of doc.splitTextToSize(activity.subtitle, contentW) as string[]) {
      doc.text(line, margin, y + 8)
      y += 14
    }
  }
  y += 8

  // Name + date row
  const today = new Date().toLocaleDateString(activity.lang === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  doc.setFontSize(10).setTextColor(...SOFT)
  doc.text(t.name, margin, y + 10)
  doc.text(t.date, margin + contentW / 2 + 12, y + 10)
  doc.setTextColor(...INK).setFont("helvetica", "bold")
  doc.text(answers.studentName || " ", margin + doc.getTextWidth(t.name) + 6, y + 10)
  doc.setFont("helvetica", "normal")
  doc.text(today, margin + contentW / 2 + 12 + doc.getTextWidth(t.date) + 6, y + 10)
  y += 30

  // Response boxes
  const pad = 10
  const labelH = 22
  const lineH = 15
  activity.prompts.forEach((prompt, i) => {
    doc.setFont("helvetica", "normal").setFontSize(11)
    const answer = (answers.responses[i] ?? "").trim()
    const lines = answer ? (doc.splitTextToSize(answer, contentW - pad * 2) as string[]) : []

    // Draw the box in page-sized chunks so long answers continue on the next page.
    let lineIdx = 0
    let first = true
    do {
      ensureSpace(labelH + lineH * 2 + pad * 2)
      const available = Math.floor((bottom - y - labelH - pad * 2) / lineH)
      const chunk = lines.slice(lineIdx, lineIdx + Math.max(available, 1))
      const bodyH = Math.max(chunk.length, first ? 3 : 1) * lineH + pad * 2
      const boxH = labelH + bodyH

      doc.setDrawColor(...RULE).setLineWidth(1)
      doc.setFillColor(...LABEL_BG).roundedRect(margin, y, contentW, boxH, 8, 8, "FD")
      doc.setFillColor(255, 255, 255).rect(margin + 0.5, y + labelH, contentW - 1, bodyH - 8, "F")
      doc.line(margin, y + labelH, margin + contentW, y + labelH)

      doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(87, 83, 78)
      const label = (first ? prompt : `${prompt} (${t.cont})`).toUpperCase()
      doc.text(doc.splitTextToSize(label, contentW - pad * 2)[0] as string, margin + pad, y + 15)

      doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(...INK)
      chunk.forEach((line, j) => doc.text(line, margin + pad, y + labelH + pad + 10 + j * lineH))

      y += boxH + 14
      lineIdx += chunk.length
      first = false
    } while (lineIdx < lines.length)
  })

  // Footer on every page
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(153, 153, 153)
    doc.text(t.footer, pageW / 2, pageH - margin + 4, { align: "center" })
  }

  doc.save(activityFileName(activity, answers.studentName))
}
