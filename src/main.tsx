import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BookmarksProvider } from "@/lib/bookmarks-context"
import { GlobalFiltersProvider } from "@/lib/global-filters"
import App from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobalFiltersProvider>
      <BookmarksProvider>
        <App />
      </BookmarksProvider>
    </GlobalFiltersProvider>
  </StrictMode>,
)
