"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Resource } from "@/lib/types"

interface BookmarksContextType {
  bookmarkedResources: Resource[]
  addBookmark: (resource: Resource) => void
  removeBookmark: (resourceId: string) => void
  isBookmarked: (resourceId: string) => boolean
  reorderBookmarks: (startIndex: number, endIndex: number) => void
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined)

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [bookmarkedResources, setBookmarkedResources] = useState<Resource[]>([])

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("bookmarkedResources")
    if (saved) {
      try {
        setBookmarkedResources(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse bookmarks:", e)
      }
    }
  }, [])

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("bookmarkedResources", JSON.stringify(bookmarkedResources))
  }, [bookmarkedResources])

  const addBookmark = (resource: Resource) => {
    const resourceId = resource.id || resource.topic_title || resource.url || Math.random().toString()
    const resourceWithId = { ...resource, id: resourceId }
    setBookmarkedResources((prev) => {
      if (prev.some((r) => r.id === resourceId)) return prev
      return [...prev, resourceWithId]
    })
  }

  const removeBookmark = (resourceId: string) => {
    setBookmarkedResources((prev) => prev.filter((r) => r.id !== resourceId))
  }

  const isBookmarked = (resourceId: string) => {
    return bookmarkedResources.some((r) => r.id === resourceId)
  }

  const reorderBookmarks = (startIndex: number, endIndex: number) => {
    setBookmarkedResources((prev) => {
      const result = Array.from(prev)
      const [removed] = result.splice(startIndex, 1)
      result.splice(endIndex, 0, removed)
      return result
    })
  }

  return (
    <BookmarksContext.Provider
      value={{ bookmarkedResources, addBookmark, removeBookmark, isBookmarked, reorderBookmarks }}
    >
      {children}
    </BookmarksContext.Provider>
  )
}

export function useBookmarks() {
  const context = useContext(BookmarksContext)
  if (context === undefined) {
    throw new Error("useBookmarks must be used within a BookmarksProvider")
  }
  return context
}
