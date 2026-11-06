import { useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { loadProfile } from "@/lib/account"
import { withBasePath } from "@/lib/base-path"

const toSignIn = () => window.location.replace(`${withBasePath("/")}#account`)

/**
 * Accounts are invite-only, so the teacher app needs a signed-in user with a
 * profile. Anyone else goes to #account, which signs them in or explains how to
 * get an invite. Without Supabase configured (local dev, the GitHub Pages
 * mirror) there are no accounts and the app renders as before.
 *
 * This is a front door, not the security boundary: data access is enforced by
 * RLS in the database whether or not this check runs.
 */
export default function RequireAccount({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      const profile = user ? await loadProfile(user.id).catch(() => null) : null
      if (!active) return
      if (profile) setReady(true)
      else toSignIn()
    })
    // Signing out in another tab (or the session expiring) sends this one back too.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") toSignIn()
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return ready ? <>{children}</> : null
}
