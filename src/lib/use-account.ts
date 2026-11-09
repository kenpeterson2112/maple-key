import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { loadProfile, type Role } from "@/lib/account"

// Who is signed in, for the header avatar and the account sheet. Without
// Supabase configured (local dev, the Pages mirror) there are no accounts and
// this stays "none".

export type AccountSummary =
  | { status: "none" }
  | { status: "loading" }
  | { status: "signed-in"; email: string; name: string | null; role: Role | null }

export function useAccount(): AccountSummary {
  const [account, setAccount] = useState<AccountSummary>(() => (supabase ? { status: "loading" } : { status: "none" }))

  useEffect(() => {
    const client = supabase
    if (!client) return
    let active = true

    const load = async () => {
      const { data } = await client.auth.getSession()
      const user = data.session?.user
      if (!active) return
      if (!user) return setAccount({ status: "none" })
      const profile = await loadProfile(user.id).catch(() => null)
      if (!active) return
      const meta = user.user_metadata as { full_name?: string; name?: string }
      setAccount({
        status: "signed-in",
        email: user.email ?? "",
        name: profile?.full_name || meta.full_name || meta.name || null,
        role: profile?.role ?? null,
      })
    }

    void load()
    const { data: sub } = client.auth.onAuthStateChange(() => void load())
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return account
}

/** One or two letters for the avatar: initials of the name, else the email. */
export function accountInitials(account: AccountSummary): string | null {
  if (account.status !== "signed-in") return null
  const source = account.name?.trim() || account.email
  const words = source.split(/[\s@._-]+/).filter(Boolean)
  const letters = words.length > 1 && account.name ? words[0][0] + words[words.length - 1][0] : source[0]
  return letters ? letters.toUpperCase() : null
}
