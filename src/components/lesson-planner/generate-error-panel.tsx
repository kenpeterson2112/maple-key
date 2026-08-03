"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { AlertTriangle, Check, ClipboardList, Copy, Download, Upload } from "lucide-react"

export interface GenerateErrorPanelProps {
  error: string
  /** Manual fallback: hand the request to another LLM and paste the result back. */
  onDownloadRequest: () => void
  onCopyRequest: () => Promise<void>
  onCopyPrompt: () => Promise<void>
  onImportFile: (e: ChangeEvent<HTMLInputElement>) => void
  onPasteLoad: (text: string) => void
  /** Set when a paste failed to parse; cleared by the panel on the next edit. */
  pasteError: string | null
  onClearPasteError: () => void
}

/**
 * Generation failure notice. A plain error is just the message; API_BALANCE_LOW
 * additionally offers the manual escape hatch — export the request, run it
 * through your own LLM, paste the response back in — so a teacher is never
 * blocked by our credit balance.
 */
export default function GenerateErrorPanel({
  error,
  onDownloadRequest,
  onCopyRequest,
  onCopyPrompt,
  onImportFile,
  onPasteLoad,
  pasteError,
  onClearPasteError,
}: GenerateErrorPanelProps) {
  const [copiedState, setCopiedState] = useState<"request" | "prompt" | null>(null)
  const [showPastePanel, setShowPastePanel] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const importInputRef = useRef<HTMLInputElement>(null)

  const isBalanceLow = error === "API_BALANCE_LOW"

  const flashCopied = (which: "request" | "prompt") => {
    setCopiedState(which)
    setTimeout(() => setCopiedState(null), 2000)
  }

  return (
    <div className={`rounded-lg px-4 py-3 border ${isBalanceLow ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className={`flex-shrink-0 mt-0.5 ${isBalanceLow ? "text-amber-500" : "text-red-500"}`} />
        <p className={`text-sm ${isBalanceLow ? "text-amber-800" : "text-red-700"}`}>
          {isBalanceLow
            ? "The AI service is temporarily unavailable while we top up our API credits. Please try again shortly — we're working on it!"
            : error}
        </p>
      </div>
      {isBalanceLow && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onDownloadRequest}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors border border-amber-300"
            >
              <Download size={13} />
              Download request JSON
            </button>
            <button
              onClick={async () => { await onCopyRequest(); flashCopied("request") }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors border border-amber-300"
            >
              {copiedState === "request" ? <Check size={13} /> : <Copy size={13} />}
              {copiedState === "request" ? "Copied!" : "Copy request JSON"}
            </button>
            <button
              onClick={async () => { await onCopyPrompt(); flashCopied("prompt") }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors border border-amber-300"
            >
              {copiedState === "prompt" ? <Check size={13} /> : <Copy size={13} />}
              {copiedState === "prompt" ? "Copied!" : "Copy prompt for LLM"}
            </button>
            <button
              onClick={() => { setShowPastePanel((v) => !v); onClearPasteError() }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors border border-amber-300"
            >
              <ClipboardList size={13} />
              Paste response JSON
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors border border-amber-300"
            >
              <Upload size={13} />
              Import file
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              onChange={onImportFile}
              className="hidden"
            />
          </div>
          {showPastePanel && (
            <div className="space-y-2">
              <textarea
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); onClearPasteError() }}
                rows={6}
                placeholder={'Paste the JSON response from the LLM here, e.g.:\n{\n  "title": "...",\n  "mindsOnContent": "...",\n  ...\n}'}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white text-xs font-mono text-[#444] focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />
              {pasteError && (
                <p className="text-xs text-red-600">{pasteError}</p>
              )}
              <button
                onClick={() => onPasteLoad(pasteText)}
                disabled={!pasteText.trim()}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Load lesson
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
