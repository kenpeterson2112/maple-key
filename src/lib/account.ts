import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { withBasePath } from "@/lib/base-path"

export type Role = "district_admin" | "school_admin" | "teacher"
export type OrgType = "district" | "school" | "independent"

export interface Organization {
  id: string
  name: string
  type: OrgType
  parent_id: string | null
}

export interface Profile {
  id: string
  organization_id: string | null
  role: Role
  full_name: string | null
}

export interface Invitation {
  id: string
  organization_id: string
  email: string
  role: Role
  created_at: string
  expires_at: string
  accepted_at: string | null
}

export const ROLE_LABEL: Record<Role, string> = {
  district_admin: "District admin",
  school_admin: "School admin",
  teacher: "Teacher",
}

const RANK: Record<Role, number> = { teacher: 1, school_admin: 2, district_admin: 3 }

/** Roles an admin may invite into an org of this type (mirrors the database rules). */
export function invitableRoles(myRole: Role, orgType: OrgType): Role[] {
  const fits: Record<OrgType, Role[]> = {
    district: ["district_admin"],
    school: ["teacher", "school_admin"],
    independent: ["teacher"],
  }
  return fits[orgType].filter((r) => RANK[r] <= RANK[myRole])
}

export const isAdmin = (role: Role | undefined) => role === "school_admin" || role === "district_admin"

/** Where Supabase sends people back after Google or an email link. */
export const accountRedirectUrl = () => `${window.location.origin}${withBasePath("/")}#account`

function client() {
  if (!supabase) throw new Error("Accounts are not configured")
  return supabase
}

export async function signInWithGoogle() {
  const { error } = await client().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: accountRedirectUrl() },
  })
  if (error) throw error
}

export async function sendEmailLink(email: string) {
  const { error } = await client().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: accountRedirectUrl() },
  })
  if (error) throw error
}

export async function signOut() {
  await client().auth.signOut()
}

export async function getSession(): Promise<Session | null> {
  const { data } = await client().auth.getSession()
  return data.session
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await client()
    .from("profiles")
    .select("id, organization_id, role, full_name")
    .eq("id", userId)
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

/** Orgs the user can see: their own, plus child schools for a district admin. */
export async function loadOrganizations(): Promise<Organization[]> {
  const { data, error } = await client().from("organizations").select("id, name, type, parent_id").order("name")
  if (error) throw error
  return (data ?? []) as Organization[]
}

/** Joins the org a pending invite is for, if any. Returns the org id or null. */
export async function acceptPendingInvitation(): Promise<string | null> {
  const { data, error } = await client().rpc("accept_pending_invitation")
  if (error) throw error
  return (data as string | null) ?? null
}

export async function createIndependentWorkspace(workspaceName: string, fullName: string): Promise<string> {
  const { data, error } = await client().rpc("create_independent_workspace", {
    p_workspace_name: workspaceName,
    p_full_name: fullName,
  })
  if (error) throw error
  return data as string
}

export async function updateFullName(userId: string, fullName: string) {
  const { error } = await client().from("profiles").update({ full_name: fullName.trim() || null }).eq("id", userId)
  if (error) throw error
}

export async function listInvitations(): Promise<Invitation[]> {
  const { data, error } = await client()
    .from("invitations")
    .select("id, organization_id, email, role, created_at, expires_at, accepted_at")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Invitation[]
}

export async function revokeInvitation(id: string) {
  const { error } = await client().from("invitations").delete().eq("id", id)
  if (error) throw error
}

export interface InviteResult {
  /** "invited": a new account email went out. "signin": they already have an
   *  account, so they got a sign-in link and join on next sign-in. */
  delivery: "invited" | "signin"
}

/** Creates the invite (as the signed-in admin, so RLS decides) and emails it. */
export async function inviteMember(organizationId: string, email: string, role: Role): Promise<InviteResult> {
  const session = await getSession()
  if (!session) throw new Error("Sign in again to send invites")
  const r = await fetch(withBasePath("/api/invitations"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ organizationId, email, role, redirectTo: accountRedirectUrl() }),
  })
  const body = (await r.json().catch(() => ({}))) as { error?: string; delivery?: InviteResult["delivery"] }
  if (!r.ok) throw new Error(body.error ?? `Invite failed (${r.status})`)
  return { delivery: body.delivery ?? "invited" }
}
