"use client"

import { useState, useEffect } from "react"
import { ArrowUp } from "lucide-react"

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when user scrolls down 300px
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener("scroll", toggleVisibility)
    return () => window.removeEventListener("scroll", toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  if (!isVisible) return null

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 p-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 min-h-[48px] min-w-[48px] flex items-center justify-center"
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp size={24} />
    </button>
  )
}
