import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"
import { ArrowLeft, Loader2, LogOut, Mail, Send, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { withBasePath } from "@/lib/base-path"
import {
  ROLE_LABEL,
  acceptPendingInvitation,
  createIndependentWorkspace,
  invitableRoles,
  inviteMember,
  isAdmin,
  listInvitations,
  loadOrganizations,
  loadProfile,
  revokeInvitation,
  sendEmailLink,
  signInWithGoogle,
  signOut,
  type Invitation,
  type Organization,
  type Profile,
  type Role,
} from "@/lib/account"

/**
 * #account: sign in (Google or an email link), join a school from an invite or
 * start a solo workspace, and, for admins, invite staff. Accounts are optional
 * for now; lessons and bookmarks still live in this browser.
 */
/** Into the teacher app, replacing this page in history so Back doesn't return here. */
const enterApp = () => window.location.replace(withBasePath("/"))

export default function AccountSpace({ returningFromAuth = false }: { returningFromAuth?: boolean }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
        <a
          href={withBasePath("/")}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to Maple Key
        </a>
        <h1 className="mt-6 text-2xl font-bold">Your account</h1>
        <div className="mt-6">{supabase ? <AccountFlow returningFromAuth={returningFromAuth} /> : <NotConfigured />}</div>
      </div>
    </div>
  )
}

function NotConfigured() {
  return (
    <Card>
      <p className="font-semibold">Accounts aren't available here yet</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Everything you do in Maple Key still saves in this browser, so you can keep planning without signing in.
      </p>
    </Card>
  )
}

type State =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "needs-workspace"; session: Session }
  | { kind: "ready"; session: Session; profile: Profile; orgs: Organization[] }
  | { kind: "error"; message: string }

function AccountFlow({ returningFromAuth }: { returningFromAuth: boolean }) {
  const [state, setState] = useState<State>({ kind: "loading" })

  const refresh = useCallback(async (session: Session | null) => {
    if (!session) {
      setState({ kind: "signed-out" })
      return
    }
    try {
      let profile = await loadProfile(session.user.id)
      if (!profile) {
        // First sign-in: join the school an admin invited them to, if any.
        await acceptPendingInvitation()
        profile = await loadProfile(session.user.id)
      }
      if (!profile) {
        setState({ kind: "needs-workspace", session })
        return
      }
      // Just signed in (Google, an email link or an invite) and already set up:
      // straight into the app. Opening #account on purpose shows this page.
      if (returningFromAuth) {
        enterApp()
        return
      }
      setState({ kind: "ready", session, profile, orgs: await loadOrganizations() })
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong" })
    }
  }, [returningFromAuth])

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => active && refresh(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && (event === "SIGNED_IN" || event === "SIGNED_OUT")) refresh(session)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [refresh])

  switch (state.kind) {
    case "loading":
      return <Loader2 className="mx-auto animate-spin text-muted-foreground" aria-label="Loading" />
    case "signed-out":
      return <SignIn />
    case "needs-workspace":
      return <CreateWorkspace session={state.session} onDone={enterApp} />
    case "ready":
      return <Dashboard session={state.session} profile={state.profile} orgs={state.orgs} />
    case "error":
      return (
        <Card>
          <p className="font-semibold">We couldn't load your account</p>
          <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
          <SignOutButton />
        </Card>
      )
  }
}

// ---------------------------------------------------------------------------

function SignIn() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  const google = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed")
    }
  }

  const emailLink = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus("sending")
    try {
      await sendEmailLink(email)
      setStatus("sent")
    } catch (err) {
      setStatus("idle")
      setError(err instanceof Error ? err.message : "Couldn't send the link")
    }
  }

  return (
    <Card>
      <p className="font-semibold">Sign in</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Use your school Google account, or get a sign-in link by email. If your school invited you, use the same
        address the invite went to.
      </p>
      <button
        type="button"
        onClick={google}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Continue with Google
      </button>
      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      {status === "sent" ? (
        <p className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-sm">
          <Mail size={16} className="mt-0.5 shrink-0" aria-hidden />
          Check {email} for a sign-in link. You can close this tab.
        </p>
      ) : (
        <form onSubmit={emailLink} className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="signin-email">
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.ca"
            className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted/40 disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Email me a link"}
          </button>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </Card>
  )
}

function CreateWorkspace({ session, onDone }: { session: Session; onDone: () => void }) {
  const meta = session.user.user_metadata as { full_name?: string; name?: string }
  const [fullName, setFullName] = useState(meta.full_name ?? meta.name ?? "")
  const [workspace, setWorkspace] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await createIndependentWorkspace(workspace.trim() || "My class", fullName)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your workspace")
      setBusy(false)
    }
  }

  return (
    <Card>
      <p className="font-semibold">Welcome, {session.user.email}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        We didn't find an invite for this address. If your school uses Maple Key, ask your school admin to invite
        you, then sign in again. Otherwise, set up your own workspace.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <Field label="Your name (optional)">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="First and last, or just one"
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Class name">
          <input
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            placeholder="e.g. Grade 7 Science"
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
          />
        </Field>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Getting started…" : "Get Started"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <SignOutButton />
    </Card>
  )
}

function Dashboard({ session, profile, orgs }: { session: Session; profile: Profile; orgs: Organization[] }) {
  const own = orgs.find((o) => o.id === profile.organization_id)
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="font-semibold">{profile.full_name || session.user.email}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {ROLE_LABEL[profile.role]}
          {own ? ` · ${own.name}` : ""}
          {own?.type === "independent" ? " (solo workspace)" : ""}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Lessons and bookmarks still save in this browser. Syncing them to your account is coming next.
        </p>
        <SignOutButton />
      </Card>
      {isAdmin(profile.role) && <InvitePanel profile={profile} orgs={orgs} />}
    </div>
  )
}

function InvitePanel({ profile, orgs }: { profile: Profile; orgs: Organization[] }) {
  const [invites, setInvites] = useState<Invitation[]>([])
  const [orgId, setOrgId] = useState(() => {
    // District admins usually invite into a school, so default to the first one.
    const firstSchool = orgs.find((o) => o.parent_id === profile.organization_id)
    return firstSchool?.id ?? profile.organization_id ?? ""
  })
  const org = orgs.find((o) => o.id === orgId)
  const roles = useMemo(() => (org ? invitableRoles(profile.role, org.type) : []), [org, profile.role])
  const [role, setRole] = useState<Role>("teacher")
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? "Unknown"

  const reload = useCallback(() => {
    listInvitations()
      .then(setInvites)
      .catch(() => setInvites([]))
  }, [])
  useEffect(reload, [reload])
  useEffect(() => {
    if (roles.length && !roles.includes(role)) setRole(roles[0])
  }, [roles, role])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      const { delivery } = await inviteMember(orgId, email, role)
      setNotice({
        ok: true,
        text:
          delivery === "invited"
            ? `Invite sent to ${email}.`
            : `${email} already has an account, so we sent a sign-in link. They'll join ${orgName(orgId)} when they use it.`,
      })
      setEmail("")
      reload()
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "Invite failed" })
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (id: string) => {
    await revokeInvitation(id).catch(() => undefined)
    reload()
  }

  const pending = invites.filter((i) => !i.accepted_at)
  const joined = invites.filter((i) => i.accepted_at)

  return (
    <Card>
      <p className="font-semibold">Invite staff</p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.ca"
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          {orgs.length > 1 && (
            <Field label="School">
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button
          type="submit"
          disabled={busy || roles.length === 0}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          <Send size={14} aria-hidden />
          {busy ? "Sending…" : "Send invite"}
        </button>
      </form>
      {notice && (
        <p className={`mt-3 text-sm ${notice.ok ? "text-muted-foreground" : "text-destructive"}`}>{notice.text}</p>
      )}

      {pending.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold">Pending</p>
          <ul className="mt-2 divide-y divide-border">
            {pending.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{i.email}</span>
                  <span className="text-xs text-muted-foreground">
                    {ROLE_LABEL[i.role]} · {orgName(i.organization_id)}
                    {new Date(i.expires_at) < new Date() ? " · expired" : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => revoke(i.id)}
                  aria-label={`Revoke invite for ${i.email}`}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted/40 hover:text-destructive"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {joined.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">{joined.length} invited staff have joined.</p>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-6 text-card-foreground">{children}</section>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  )
}

function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut()}
      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <LogOut size={14} aria-hidden />
      Sign out
    </button>
  )
}
