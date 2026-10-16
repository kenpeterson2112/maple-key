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

// Mode is chosen once at load, so moving to or from an activity link in the
// same tab (pasting a second link, say) needs a fresh load to switch pages.
window.addEventListener("hashchange", (e) => {
  const was = new URL(e.oldURL).hash.startsWith(ACTIVITY_HASH_PREFIX)
  const now = new URL(e.newURL).hash.startsWith(ACTIVITY_HASH_PREFIX)
  if (was || now) window.location.reload()
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isStudentActivity ? (
      <Suspense fallback={null}>
        <StudentActivityRoute hash={window.location.hash} activityId={activityId} />
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
