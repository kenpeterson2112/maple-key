"use client"

import { User, Mail, Globe, School, FlaskConical, LogOut, UserPlus } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { isAdmin, loadProfile, signOut, type Profile } from "@/lib/account"
import { withBasePath } from "@/lib/base-path"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import ClassroomResourcesPicker from "@/components/classroom-resources-picker"
import { isSandboxMode, setSandboxMode } from "@/lib/assessment-results"
import {
  getClassroomResources,
  setClassroomResources,
  getCustomClassroomResources,
  setCustomClassroomResources,
  type CustomClassroomResource,
} from "@/lib/classroom-resources"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  // Signed-in account, if any: fills name/email and shows Sign out.
  const [account, setAccount] = useState<{ email: string; profile: Profile | null } | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!isOpen || !supabase) return
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (!active || !user) return
      const profile = await loadProfile(user.id).catch(() => null)
      if (!active) return
      setAccount({ email: user.email ?? "", profile })
      const meta = user.user_metadata as { full_name?: string; name?: string }
      setName((n) => n || profile?.full_name || meta.full_name || meta.name || "")
      setEmail((e) => e || user.email || "")
    })
    return () => {
      active = false
    }
  }, [isOpen])

  /** Ends the session and returns to the sign-in page. */
  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut().catch(() => undefined)
    window.location.replace(`${withBasePath("/")}#account`)
  }
  const [language, setLanguage] = useState("English")
  const [sandbox, setSandboxState] = useState(() => isSandboxMode())
  const [classroomResources, setClassroomResourcesState] = useState<string[]>(() =>
    getClassroomResources()
  )
  const [customMaterials, setCustomMaterialsState] = useState<CustomClassroomResource[]>(() =>
    getCustomClassroomResources()
  )

  const handleSave = () => {
    setClassroomResources(classroomResources)
    setCustomClassroomResources(customMaterials)
    setSandboxMode(sandbox)
    onClose()
  }

  const handleSandboxToggle = () => {
    setSandboxState(!sandbox)
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="top" className="bg-[#FAF3E0] border-b-2 border-[#E8D5C4] max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-3 border-b border-[#E8D5C4]">
          <SheetTitle className="text-xl font-bold text-[#2C2C2C]">Settings</SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-6">
          {/* Profile fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#333]">
                <User size={14} className="text-[#8B4513]" />
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-[#E8D5C4] rounded-xl text-[#2C2C2C] text-sm focus:outline-none focus:border-[#8B4513] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#333]">
                <Mail size={14} className="text-[#8B4513]" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-[#E8D5C4] rounded-xl text-[#2C2C2C] text-sm focus:outline-none focus:border-[#8B4513] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#333]">
                <Globe size={14} className="text-[#8B4513]" />
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-[#E8D5C4] rounded-xl text-[#2C2C2C] text-sm focus:outline-none focus:border-[#8B4513] transition-colors cursor-pointer"
              >
                <option value="English">English</option>
                <option value="French">French</option>
              </select>
            </div>
          </div>

          {/* Classroom Resources */}
          <div className="bg-white border-2 border-[#E8D5C4] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <School size={16} className="text-[#8B4513]" />
              <h3 className="text-sm font-semibold text-[#2C2C2C]">My Classroom Resources</h3>
            </div>
            <p className="text-xs text-[#888] mb-4">
              Select the tools, technology, and spaces available in your classroom. Maple Key will use these to tailor lesson suggestions.
            </p>
            <ClassroomResourcesPicker
              selected={classroomResources}
              onChange={setClassroomResourcesState}
              customMaterials={customMaterials}
              onCustomChange={setCustomMaterialsState}
            />
          </div>

          {/* Developer & Sandbox Mode */}
          <div className="bg-white border-2 border-[#E8D5C4] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical size={16} className="text-[#C65D3B]" />
              <h3 className="text-sm font-semibold text-[#2C2C2C]">Developer & Test Mode</h3>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sandbox}
                onChange={handleSandboxToggle}
                className="w-5 h-5 rounded-lg border-2 border-[#E8D5C4] cursor-pointer accent-[#FF6B35]"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#2C2C2C]">Sandbox Mode</p>
                <p className="text-xs text-[#888]">
                  {sandbox ? "Using generated sample data for testing" : "Using actual lesson data"}
                </p>
              </div>
            </label>
          </div>

          {account && (
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-card-foreground">Signed in</p>
                <p className="truncate text-xs text-muted-foreground">{account.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isAdmin(account.profile?.role) && (
                  <a
                    href={`${withBasePath("/")}#account`}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-card-foreground hover:bg-muted/40"
                  >
                    <UserPlus size={14} aria-hidden />
                    Invite staff
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-destructive hover:bg-muted/40 disabled:opacity-60"
                >
                  <LogOut size={14} aria-hidden />
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            className="px-6 py-2 bg-[#8B4513] hover:bg-[#6B3410] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Save Changes
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
