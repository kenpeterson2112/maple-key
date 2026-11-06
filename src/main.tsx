import { StrictMode, Suspense, lazy } from "react"
import { createRoot } from "react-dom/client"
import { BookmarksProvider } from "@/lib/bookmarks-context"
import { GlobalFiltersProvider } from "@/lib/global-filters"
import App from "./App"
import { ACTIVITY_HASH_PREFIX, shortLinkId } from "@/lib/student-activity"
import "./index.css"

// Admin Database Manager rides on the #admin hash so it needs no router and
// stays out of the main bundle. Evaluated once at load — switching modes is a
// full page load, which is fine for an admin tool.
const AdminSpace = lazy(() => import("@/components/admin/admin-space"))
const isAdmin = window.location.hash === "#admin"

// Student activity links (#activity=…) work the same way: a separate, login-free
// page that skips the teacher app's providers and data fetching entirely.
const StudentActivityRoute = lazy(() => import("@/components/student-activity/student-activity-route"))
const activityId = shortLinkId(window.location.pathname)
const isStudentActivity = activityId !== null || window.location.hash.startsWith(ACTIVITY_HASH_PREFIX)

// District Insights (#district) — the sample district-leader dashboard. Same
// pattern again: its own lazy page with no teacher-app providers.
const DistrictSpace = lazy(() => import("@/components/district/district-space"))
const isDistrict = window.location.hash === "#district"

// Account (#account): sign-in, joining a school from an invite, staff invites.
// Supabase returns people here after Google or an email link.
const AccountSpace = lazy(() => import("@/components/account/account-space"))
// Auth redirects also land here: an emailed invite returns its session in the
// hash (#access_token=…, replacing #account), and Google / email links return
// a PKCE ?code=. The Supabase client picks either up on load.
const isAccount =
  window.location.hash.startsWith("#account") ||
  /[#&](access_token|error_description)=/.test(window.location.hash) ||
  new URLSearchParams(window.location.search).has("code")

// Mode is chosen once at load, so moving to or from an activity link in the
// same tab (pasting a second link, say) needs a fresh load to switch pages.
window.addEventListener("hashchange", (e) => {
  const isStandalone = (hash: string) => hash.startsWith(ACTIVITY_HASH_PREFIX) || hash === "#district" || hash.startsWith("#account")
  const was = isStandalone(new URL(e.oldURL).hash)
  const now = isStandalone(new URL(e.newURL).hash)
  if (was || now) window.location.reload()
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isStudentActivity ? (
      <Suspense fallback={null}>
        <StudentActivityRoute hash={window.location.hash} activityId={activityId} />
      </Suspense>
    ) : isDistrict ? (
      <Suspense fallback={null}>
        <DistrictSpace />
      </Suspense>
    ) : isAccount ? (
      <Suspense fallback={null}>
        <AccountSpace />
      </Suspense>
    ) : isAdmin ? (
      <Suspense fallback={null}>
        <AdminSpace />
      </Suspense>
    ) : (
      <GlobalFiltersProvider>
        <BookmarksProvider>
          <App />
        </BookmarksProvider>
      </GlobalFiltersProvider>
    )}
  </StrictMode>,
)
