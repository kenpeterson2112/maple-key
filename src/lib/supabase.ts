import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Browser Supabase client for teacher accounts (sign-in, profile, invites).
 * Uses the publishable key only, so every query runs as the signed-in user and
 * the database's RLS decides what they can see. Null when the env isn't set
 * (local dev without Supabase, the GitHub Pages mirror): the app then works
 * signed-out, exactly as before accounts existed.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" } }) : null

export const accountsEnabled = supabase !== null
