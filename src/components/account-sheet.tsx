import { useState } from "react"
import { ChevronRight, LogOut, Settings, User, UserPlus } from "lucide-react"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { isAdmin, signOut } from "@/lib/account"
import { withBasePath } from "@/lib/base-path"
import { accountInitials, useAccount } from "@/lib/use-account"

// The phone header's avatar and the sheet it opens: who you are, Settings,
// Invite staff (admins) and Sign out. This replaced the old hamburger menu.

export default function AccountSheet({ onOpenSettings }: { onOpenSettings: () => void }) {
  const account = useAccount()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const initials = accountInitials(account)
  const signedIn = account.status === "signed-in"

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut().catch(() => undefined)
    window.location.replace(`${withBasePath("/")}#account`)
  }

  const row =
    "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={signedIn ? `Account: ${account.name ?? account.email}` : "Account and settings"}
        aria-haspopup="dialog"
        className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-tint text-sm font-bold text-secondary-strong">
          {initials ?? <User size={18} aria-hidden="true" />}
        </span>
      </button>

      <BottomSheet open={open} onOpenChange={setOpen} title="Account">
        <div className="space-y-1 p-3">
          {signedIn && (
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-muted px-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-tint text-sm font-bold text-secondary-strong">
                {initials}
              </span>
              <div className="min-w-0">
                {account.name && <p className="truncate text-sm font-semibold text-foreground">{account.name}</p>}
                <p className="truncate text-xs text-muted-foreground">{account.email}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            className={`${row} text-foreground`}
            onClick={() => {
              setOpen(false)
              onOpenSettings()
            }}
          >
            <Settings size={18} aria-hidden="true" className="text-muted-foreground" />
            Settings
            <ChevronRight size={16} aria-hidden="true" className="ml-auto text-muted-foreground" />
          </button>

          {signedIn && isAdmin(account.role ?? undefined) && (
            <a href={`${withBasePath("/")}#account`} className={`${row} text-foreground`}>
              <UserPlus size={18} aria-hidden="true" className="text-muted-foreground" />
              Invite staff
              <ChevronRight size={16} aria-hidden="true" className="ml-auto text-muted-foreground" />
            </a>
          )}

          {signedIn && (
            <button type="button" className={`${row} text-destructive`} onClick={handleSignOut} disabled={signingOut}>
              <LogOut size={18} aria-hidden="true" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          )}
        </div>
      </BottomSheet>
    </>
  )
}
