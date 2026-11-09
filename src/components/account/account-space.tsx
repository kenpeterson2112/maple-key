import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"
import { ArrowLeft, Loader2, LogOut, Mail, Send, Trash2 } from "lucide-react"
import MapleKeyIcon from "@/components/ui/maple-key-icon"
import { supabase } from "@/lib/supabase"
import { withBasePath } from "@/lib/base-path"
import {
  ROLE_LABEL,
  acceptPendingInvitation,
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
 * start a solo workspace, and, for admins, invite staff. Sign-in is required for
 * the teacher app (see RequireAccount); lessons and bookmarks still live in this browser.
 */
/** Into the teacher app, replacing this page in history so Back doesn't return here. */
const enterApp = () => window.location.replace(withBasePath("/"))

export default function AccountSpace({ returningFromAuth = false }: { returningFromAuth?: boolean }) {
  return supabase ? (
    <AccountFlow returningFromAuth={returningFromAuth} />
  ) : (
    <AccountPage>
      <NotConfigured />
    </AccountPage>
  )
}

/** The plain page for everything after sign-in: the account dashboard, no-invite, errors. */
function AccountPage({ children }: { children: ReactNode }) {
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
        <div className="mt-6">{children}</div>
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
  | { kind: "no-invite"; session: Session }
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
        setState({ kind: "no-invite", session })
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
      return (
        <div className="grid min-h-dvh place-items-center bg-background">
          <Loader2 className="animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      )
    case "signed-out":
      return <SignIn />
    case "no-invite":
      return (
        <AccountPage>
          <NoInvite session={state.session} />
        </AccountPage>
      )
    case "ready":
      return (
        <AccountPage>
          <Dashboard session={state.session} profile={state.profile} orgs={state.orgs} />
        </AccountPage>
      )
    case "error":
      return (
        <AccountPage>
          <Card>
            <p className="font-semibold">We couldn't load your account</p>
            <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
            <SignOutButton />
          </Card>
        </AccountPage>
      )
  }
}

// ---------------------------------------------------------------------------

// Lenient on purpose: catches a missing @ or domain; the email link proves the rest.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * The sign-in screen: a brand panel and the form. Stacked on phones (panel on
 * top, form as a sheet that overlaps it), side by side from md. Every state
 * (sending, link sent, an error, Google redirecting) keeps its space reserved,
 * so nothing on the page moves when it changes.
 */
function SignIn() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const google = async () => {
    setGoogleError(null)
    setRedirecting(true)
    try {
      await signInWithGoogle()
      // Success navigates away; the spinner stays until the page unloads.
    } catch (err) {
      setRedirecting(false)
      setGoogleError(err instanceof Error ? err.message : "Google sign-in didn't start. Try again.")
    }
  }

  const emailLink = async (e: FormEvent) => {
    e.preventDefault()
    const address = email.trim()
    if (!EMAIL_SHAPE.test(address)) {
      setEmailError("Enter your full email address, like you@school.ca.")
      inputRef.current?.focus()
      return
    }
    setEmailError(null)
    setStatus("sending")
    try {
      await sendEmailLink(address)
      setEmail(address)
      setStatus("sent")
    } catch (err) {
      setStatus("idle")
      setEmailError(err instanceof Error ? err.message : "Couldn't send the link. Try again.")
    }
  }

  const sending = status === "sending"
  const sent = status === "sent"
  const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"

  return (
    <div className="min-h-dvh bg-card text-card-foreground md:grid md:grid-cols-12">
      {/* Brand panel */}
      <section
        aria-label="Maple Key"
        className="relative overflow-hidden bg-primary px-6 pb-14 pt-[calc(env(safe-area-inset-top)+2rem)] text-primary-foreground md:col-span-5 md:flex md:flex-col md:justify-center md:px-12 md:py-16"
      >
        {/* Decoration: a soft glow and a large faint samara. CSS and SVG only. */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-pop/25 blur-3xl" />
        <MapleKeyIcon className="pointer-events-none absolute -bottom-28 -right-28 hidden size-112 text-primary-hover md:block" />

        <div className="relative flex items-center gap-2 font-display text-lg font-bold">
          <MapleKeyIcon className="size-7" />
          Maple Key
        </div>
        <p className="relative mt-8 max-w-md font-display text-3xl font-bold leading-tight md:text-5xl">
          Plan tomorrow's lesson in minutes.
        </p>
        <p className="relative mt-3 max-w-md text-base md:text-lg">Ontario-aligned resources, ready to teach.</p>
        <div className="relative mt-6 flex gap-2" aria-hidden="true">
          <span className="size-3 rounded-full bg-pop" />
          <span className="size-3 rounded-full bg-secondary" />
          <span className="size-3 rounded-full bg-primary-foreground" />
        </div>
      </section>

      {/* Form: a sheet over the panel on phones, the right column from md */}
      <main className="relative -mt-6 rounded-t-3xl bg-card px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-8 md:col-span-7 md:mt-0 md:flex md:items-center md:justify-center md:rounded-none md:px-12 md:py-16">
        <div className="mx-auto w-full max-w-105">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use your school Google account, or get a sign-in link by email. If your school invited you, use the
            address the invite went to.
          </p>

          <button
            type="button"
            onClick={google}
            disabled={redirecting}
            aria-busy={redirecting}
            className={`mt-6 flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-progress ${focusRing}`}
          >
            {/* Google's mark sits on its own chip so its colours read on the red. */}
            <span className="flex size-7 items-center justify-center rounded-full bg-card">
              {redirecting ? (
                <Loader2 className="size-4 animate-spin text-foreground" aria-hidden="true" />
              ) : (
                <img src={withBasePath("/google-g.svg")} alt="" className="size-4.5" />
              )}
            </span>
            Continue with Google
          </button>
          <p aria-live="polite" className="mt-2 min-h-5 text-sm text-destructive">
            {googleError}
          </p>

          <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* The form and the "link sent" panel share one grid cell, so the slot is
              always the taller of the two and swapping them moves nothing. */}
          <div className="grid">
            <form
              onSubmit={emailLink}
              noValidate
              inert={sent}
              className={`col-start-1 row-start-1 ${sent ? "invisible" : ""}`}
            >
              <label htmlFor="signin-email" className="text-sm font-medium text-foreground">
                School email
              </label>
              <input
                ref={inputRef}
                id="signin-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="you@school.ca"
                value={email}
                readOnly={sending}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError(null)
                }}
                aria-invalid={emailError ? true : undefined}
                aria-describedby="signin-email-error"
                className="mt-1.5 h-13 w-full rounded-xl border-2 border-border-strong bg-input px-4 text-base text-foreground placeholder:text-muted-foreground read-only:opacity-70 aria-[invalid=true]:border-destructive focus-visible:border-ring focus-visible:outline-none"
              />
              <p id="signin-email-error" aria-live="polite" className="mt-1.5 min-h-5 text-sm text-destructive">
                {emailError}
              </p>
              <button
                type="submit"
                disabled={sending}
                className={`mt-2 flex h-13 w-full items-center justify-center gap-2 rounded-xl border-2 border-secondary bg-card px-4 text-base font-semibold text-secondary-strong transition-colors hover:bg-secondary-tint disabled:cursor-progress ${focusRing}`}
              >
                {sending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail size={18} aria-hidden="true" />
                    Email me a link
                  </>
                )}
              </button>
            </form>
            {sent && (
              <div role="status" className="col-start-1 row-start-1 flex flex-col justify-center rounded-xl bg-secondary-tint p-4">
                <p className="flex items-center gap-2 font-semibold text-secondary-strong">
                  <Mail size={18} aria-hidden="true" />
                  Check your inbox
                </p>
                <p className="mt-1 text-sm text-foreground">
                  We sent a link to <span className="font-semibold">{email}</span>. It expires in 1 hour.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle")
                    requestAnimationFrame(() => inputRef.current?.focus())
                  }}
                  className={`mt-3 self-start rounded text-sm font-semibold text-secondary-strong underline underline-offset-2 ${focusRing} focus-visible:ring-offset-secondary-tint`}
                >
                  Use a different email
                </button>
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            <a href={withBasePath("/privacy")} className={`rounded underline-offset-2 hover:underline ${focusRing}`}>
              Privacy
            </a>
            <span aria-hidden="true"> · </span>
            <a href={withBasePath("/tos")} className={`rounded underline-offset-2 hover:underline ${focusRing}`}>
              Terms
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}

/** Signed in, but no invite for this address. Accounts are invite-only. */
function NoInvite({ session }: { session: Session }) {
  return (
    <Card>
      <p className="font-semibold">We couldn't find an invite for {session.user.email}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Maple Key accounts are by invitation. Ask your school admin to invite this address, then sign in again
        from the link in the invite email.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in with a different account than the one you were invited at? Sign out and try that one.
      </p>
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
