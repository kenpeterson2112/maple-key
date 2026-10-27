import { StrictMode, Suspense, lazy } from "react"
import { createRoot } from "react-dom/client"
import { BookmarksProvider } from "@/lib/bookmarks-context"
import { GlobalFiltersProvider } from "@/lib/global-filters"
import App from "./App"
import { ACTIVITY_HASH_PREFIX } from "@/lib/student-activity"
import "./index.css"

// Admin Database Manager rides on the #admin hash so it needs no router and
// stays out of the main bundle. Evaluated once at load — switching modes is a
// full page load, which is fine for an admin tool.
const AdminSpace = lazy(() => import("@/components/admin/admin-space"))
const isAdmin = window.location.hash === "#admin"

// Student activity links (#activity=…) work the same way: a separate, login-free
// page that skips the teacher app's providers and data fetching entirely.
const StudentActivityRoute = lazy(() => import("@/components/student-activity/student-activity-route"))
const isStudentActivity = window.location.hash.startsWith(ACTIVITY_HASH_PREFIX)

// District Insights (#district) — the sample district-leader dashboard. Same
// pattern again: its own lazy page with no teacher-app providers.
const DistrictSpace = lazy(() => import("@/components/district/district-space"))
const isDistrict = window.location.hash === "#district"

// Mode is chosen once at load, so moving to or from an activity link in the
// same tab (pasting a second link, say) needs a fresh load to switch pages.
window.addEventListener("hashchange", (e) => {
  const isStandalone = (hash: string) => hash.startsWith(ACTIVITY_HASH_PREFIX) || hash === "#district"
  const was = isStandalone(new URL(e.oldURL).hash)
  const now = isStandalone(new URL(e.newURL).hash)
  if (was || now) window.location.reload()
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isStudentActivity ? (
      <Suspense fallback={null}>
        <StudentActivityRoute hash={window.location.hash} />
      </Suspense>
    ) : isDistrict ? (
      <Suspense fallback={null}>
        <DistrictSpace />
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
