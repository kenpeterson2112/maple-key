import { decodeActivity } from "@/lib/student-activity"
import StudentActivityPage from "@/components/student-activity/student-activity-page"

/** Decodes the activity from the link, or explains a broken one in both languages. */
export default function StudentActivityRoute({ hash }: { hash: string }) {
  const activity = decodeActivity(hash)
  if (activity) return <StudentActivityPage activity={activity} />
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-center text-foreground">
      <div className="max-w-md">
        <p className="text-sm font-semibold text-primary">Maple Key</p>
        <h1 className="mt-2 text-xl font-bold">This activity link isn't working</h1>
        <p className="mt-2 text-muted-foreground">
          Ask your teacher to share it again. It may have been copied only partly.
        </p>
        <p className="mt-4 text-muted-foreground" lang="fr">
          Ce lien ne fonctionne pas. Demande à ton enseignant·e de le partager de nouveau.
        </p>
      </div>
    </div>
  )
}
