import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { decodeActivity, fetchStoredActivity, type StudentActivity } from "@/lib/student-activity"
import StudentActivityPage from "@/components/student-activity/student-activity-page"

type State =
  | { kind: "loading" }
  | { kind: "ready"; activity: StudentActivity }
  | { kind: "missing" }
  | { kind: "unavailable" }

/**
 * Resolves a student link to an activity: a short link (`/a/<id>`) is fetched
 * from storage, a hash link is decoded in place. Problems get a plain,
 * bilingual message, since we don't yet know the activity's language.
 */
export default function StudentActivityRoute({ hash, activityId }: { hash: string; activityId: string | null }) {
  const [state, setState] = useState<State>(() => {
    if (activityId) return { kind: "loading" }
    const activity = decodeActivity(hash)
    return activity ? { kind: "ready", activity } : { kind: "missing" }
  })

  useEffect(() => {
    if (!activityId) return
    let cancelled = false
    fetchStoredActivity(activityId)
      .then((activity) => !cancelled && setState(activity ? { kind: "ready", activity } : { kind: "missing" }))
      .catch(() => !cancelled && setState({ kind: "unavailable" }))
    return () => {
      cancelled = true
    }
  }, [activityId])

  if (state.kind === "ready") {
    return (
      <StudentActivityPage
        activity={state.activity}
        storageKey={activityId ? `mk-activity:id:${activityId}` : undefined}
      />
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-center text-foreground">
      <div className="max-w-md">
        <p className="text-sm font-semibold text-primary">Maple Key</p>
        {state.kind === "loading" ? (
          <Loader2 className="mx-auto mt-6 animate-spin text-muted-foreground" aria-label="Loading" />
        ) : state.kind === "unavailable" ? (
          <>
            <h1 className="mt-2 text-xl font-bold">We couldn't load this activity</h1>
            <p className="mt-2 text-muted-foreground">Check your internet connection and refresh the page.</p>
            <p className="mt-4 text-muted-foreground" lang="fr">
              Impossible de charger l'activité. Vérifie ta connexion Internet et actualise la page.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-xl font-bold">This activity link isn't working</h1>
            <p className="mt-2 text-muted-foreground">
              Ask your teacher to share it again. It may have been copied only partly.
            </p>
            <p className="mt-4 text-muted-foreground" lang="fr">
              Ce lien ne fonctionne pas. Demande à ton enseignant·e de le partager de nouveau.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
