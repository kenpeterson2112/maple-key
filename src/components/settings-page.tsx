"use client"

import { useEffect, useState, type ReactNode } from "react"
import {
  BookOpen,
  FlaskConical,
  LogOut,
  MapPin,
  Monitor,
  Moon,
  PenLine,
  School,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  User,
  UserPlus,
  Bookmark,
  type LucideIcon,
} from "lucide-react"
import PageHeader from "@/components/page-header"
import { PROVINCES } from "@/components/hero-personalize"
import { supabase } from "@/lib/supabase"
import { isAdmin, loadProfile, signOut, type Profile } from "@/lib/account"
import { withBasePath } from "@/lib/base-path"
import { isSandboxMode } from "@/lib/assessment-results"
import { useGlobalFilters } from "@/lib/global-filters"
import { getThemePreference, setThemePreference, type ThemePreference } from "@/lib/theme"

// Settings as a page rather than a pull-down sheet: who you are, the
// curriculum you teach, how the app looks, help, and test tools. Each change
// applies as it's made; there is no Save button to forget. Everything about
// the classroom itself (materials, lesson defaults) lives on the Classroom
// profile page instead.

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
]

const HOW_IT_WORKS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Search, title: "Find", body: "Filter the curated library down to your grade, subject and strand." },
  { icon: Bookmark, title: "Save", body: "Bookmark what fits and add materials you already use." },
  { icon: PenLine, title: "Shape", body: "Answer a few design questions, then edit the drafted plan." },
  { icon: Sparkles, title: "Assess", body: "Check understanding by expectation and plan the next lesson." },
]

const SECTIONS = [
  { id: "settings-account", label: "Account" },
  { id: "settings-curriculum", label: "Curriculum" },
  { id: "settings-appearance", label: "Appearance" },
  { id: "settings-help", label: "Help" },
  { id: "settings-developer", label: "Developer" },
]

interface SettingsPageProps {
  onOpenClassroomProfile: () => void
  onOpenTour: () => void
}

export default function SettingsPage({ onOpenClassroomProfile, onOpenTour }: SettingsPageProps) {
  const {
    state: { province, isSandbox },
    setProvince,
    setSandbox,
  } = useGlobalFilters()
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference)
  const [account, setAccount] = useState<{ email: string; name: string; profile: Profile | null } | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (!active || !user) return
      const profile = await loadProfile(user.id).catch(() => null)
      if (!active) return
      const meta = user.user_metadata as { full_name?: string; name?: string }
      setAccount({ email: user.email ?? "", name: profile?.full_name || meta.full_name || meta.name || "", profile })
    })
    return () => {
      active = false
    }
  }, [])

  const chooseTheme = (next: ThemePreference) => {
    setTheme(next)
    setThemePreference(next)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut().catch(() => undefined)
    window.location.replace(`${withBasePath("/")}#account`)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <PageHeader icon={SettingsIcon} title="Settings" iconColor="text-secondary-strong" iconBg="bg-secondary-tint" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl gap-8 px-4 py-6 md:px-6 md:py-8">
          <nav aria-label="Settings sections" className="sticky top-0 hidden w-40 flex-shrink-0 self-start md:block">
            <ul className="flex flex-col gap-1 text-sm">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }) }} className="block rounded-lg px-3 py-2 font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Section id="settings-account" icon={User} title="Account">
              {account ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    {account.name && <p className="truncate text-sm font-semibold text-foreground">{account.name}</p>}
                    <p className="truncate text-sm text-muted-foreground">{account.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isAdmin(account.profile?.role) && (
                      <a href={`${withBasePath("/")}#account`} className={BUTTON}>
                        <UserPlus size={14} aria-hidden="true" />
                        Invite staff
                      </a>
                    )}
                    <button type="button" onClick={handleSignOut} disabled={signingOut} className={`${BUTTON} text-destructive disabled:opacity-60`}>
                      <LogOut size={14} aria-hidden="true" />
                      {signingOut ? "Signing out…" : "Sign out"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not signed in. Lessons and settings are saved in this browser.</p>
              )}
            </Section>

            <Section id="settings-curriculum" icon={MapPin} title="Curriculum">
              <label htmlFor="settings-province" className="text-sm font-semibold text-foreground">
                Province
              </label>
              <p className="mb-2 text-xs text-muted-foreground">
                Sets the curriculum the expectations, progress and next steps follow.
              </p>
              <select
                id="settings-province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="h-11 w-full max-w-xs rounded-xl border border-border-strong bg-input px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {PROVINCES.map((p) => (
                  <option key={p.value || "any"} value={p.value}>
                    {p.value ? p.label : "Anywhere in Canada"}
                  </option>
                ))}
              </select>
            </Section>

            <Section id="settings-appearance" icon={Sun} title="Appearance">
              <div role="radiogroup" aria-label="Appearance" className="inline-flex gap-1 rounded-xl border border-border-strong bg-card p-1">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const selected = theme === value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => chooseTheme(value)}
                      className={`flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon size={16} aria-hidden="true" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </Section>

            <Section id="settings-help" icon={BookOpen} title="Help">
              <p className="mb-3 text-sm font-semibold text-foreground">How Maple Key works</p>
              <ol className="grid gap-3 sm:grid-cols-2">
                {HOW_IT_WORKS.map(({ icon: Icon, title, body }, i) => (
                  <li key={title} className="rounded-xl border border-border bg-background p-4">
                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-strong">
                      <Icon size={14} aria-hidden="true" />
                      Step {i + 1}
                    </span>
                    <span className="mt-1 block font-display font-semibold text-foreground">{title}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={onOpenTour} className={BUTTON}>
                  <BookOpen size={14} aria-hidden="true" />
                  Take the tour
                </button>
                <button type="button" onClick={onOpenClassroomProfile} className={BUTTON}>
                  <School size={14} aria-hidden="true" />
                  Classroom profile
                </button>
              </div>
            </Section>

            <Section id="settings-developer" icon={FlaskConical} title="Developer and test mode">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSandbox}
                  onChange={(e) => setSandbox(e.target.checked)}
                  className="h-5 w-5 cursor-pointer rounded border-border-strong accent-primary"
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-foreground">Sandbox mode</span>
                  <span className="block text-xs text-muted-foreground">
                    {isSandbox || isSandboxMode()
                      ? "Using generated sample data. Your real results are untouched."
                      : "Using your real lesson and Quick Check data."}
                  </span>
                </span>
              </label>
            </Section>
          </div>
        </div>
      </div>
    </div>
  )
}

const BUTTON =
  "inline-flex min-h-10 items-center gap-2 rounded-xl border border-border-strong bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function Section({ id, icon: Icon, title, children }: { id: string; icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-4 rounded-2xl border border-border bg-card p-5">
      <h2 id={`${id}-heading`} className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-card-foreground">
        <Icon size={18} aria-hidden="true" className="text-muted-foreground" />
        {title}
      </h2>
      {children}
    </section>
  )
}
