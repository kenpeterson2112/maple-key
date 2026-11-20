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
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-success-tint px-3 text-sm font-medium text-success">
          <Check size={16} />
          Approved
        </span>
        <button
          onClick={onEdit}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border-strong bg-card px-4 text-sm font-semibold text-primary-strong transition-colors hover:bg-primary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil size={14} />
          Edit
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
      <button
        onClick={onApprove}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-success px-4 text-sm font-semibold text-success-foreground transition-colors hover:bg-success/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Check size={16} />
        Approve
      </button>
      <button
        onClick={onEdit}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border-strong bg-card px-4 text-sm font-semibold text-primary-strong transition-colors hover:bg-primary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Pencil size={16} />
        Edit
      </button>
    </div>
  )
}
