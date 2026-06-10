"use client"

import { useState } from "react"
import { X, Send, CheckCircle } from "lucide-react"
import { addFlag, FLAG_REASON_LABELS, type FlagReason } from "@/lib/flags-data"

interface FlagModalProps {
  isOpen: boolean
  onClose: () => void
  resourceId: string
  resourceTitle: string
}

const FLAG_REASONS = Object.keys(FLAG_REASON_LABELS) as FlagReason[]

export default function FlagModal({ isOpen, onClose, resourceId, resourceTitle }: FlagModalProps) {
  const [reason, setReason] = useState<FlagReason | null>(null)
  const [details, setDetails] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleClose = () => {
    setReason(null)
    setDetails("")
    setShowSuccess(false)
    onClose()
  }

  const handleSubmit = () => {
    if (!reason) return

    addFlag({
      id: Date.now().toString(),
      resourceId,
      reason,
      details: details.trim() || undefined,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    })

    setShowSuccess(true)
    setTimeout(() => {
      handleClose()
    }, 1500)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 p-6 flex items-start justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Report an issue</h2>
            <p className="text-sm text-stone-500 mt-1 line-clamp-1">{resourceTitle}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-stone-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-[scale-in_0.3s_ease-out]">
                <CheckCircle className="w-16 h-16 text-green-500 animate-[ping_1s_ease-out]" />
              </div>
              <p className="text-lg font-semibold text-stone-900 mt-4 animate-[fade-in_0.5s_ease-in_0.3s_both]">
                Thanks for letting us know!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">What's the issue?</label>
                <div className="flex flex-col gap-2">
                  {FLAG_REASONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReason(value)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                        reason === value
                          ? "bg-orange-600 text-white"
                          : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                      }`}
                    >
                      {FLAG_REASON_LABELS[value]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">Details (optional)</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Tell us more about the issue..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!reason}
                className="w-full py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
