import { StrictMode, Suspense, lazy } from "react"
import { createRoot } from "react-dom/client"
import { BookmarksProvider } from "@/lib/bookmarks-context"
import { GlobalFiltersProvider } from "@/lib/global-filters"
import App from "./App"
import "./index.css"

// Admin Database Manager rides on the #admin hash so it needs no router and
// stays out of the main bundle. Evaluated once at load — switching modes is a
// full page load, which is fine for an admin tool.
const AdminSpace = lazy(() => import("@/components/admin/admin-space"))
const isAdmin = window.location.hash === "#admin"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isAdmin ? (
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
