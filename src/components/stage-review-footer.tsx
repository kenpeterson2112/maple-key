import { Check, Pencil } from "lucide-react"

interface Props {
  approved: boolean
  onApprove: () => void
  onEdit: () => void
}

/**
 * Per-stage review footer. Sits at the bottom of every lesson stage (not
 * Materials) so the teacher makes an explicit review gesture per stage instead
 * of relying on the easily-missed corner pencil. Approving gates export.
 */
export default function StageReviewFooter({ approved, onApprove, onEdit }: Props) {
  if (approved) {
    return (
      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
          <Check size={16} />
          Approved
        </span>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 px-3 py-1.5 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-50"
        >
          <Pencil size={14} />
          Edit
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-4">
      <button
        onClick={onApprove}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
      >
        <Check size={16} />
        Approve
      </button>
      <button
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
      >
        <Pencil size={16} />
        Edit
      </button>
    </div>
  )
}
