"use client"

import { useState } from "react"
import { X, MessageSquare, Star, Send, CheckCircle } from "lucide-react"
import { getReviewsForResource, addReview, type Review } from "@/lib/reviews-data"

interface ReviewsModalProps {
  isOpen: boolean
  onClose: () => void
  resourceId: string
  resourceTitle: string
}

const USAGE_TAGS = [
  "Whole class instruction",
  "Small groups",
  "Independent practice",
  "Unit opener",
  "Review/reinforcement",
  "Differentiation",
]

export default function ReviewsModal({ isOpen, onClose, resourceId, resourceTitle }: ReviewsModalProps) {
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  const reviews = getReviewsForResource(resourceId)

  const handleSubmit = () => {
    if (rating === 0 || body.trim() === "") return

    const newReview: Review = {
      id: Date.now().toString(),
      resourceId,
      rating,
      reviewerName: "Anonymous Teacher", // Would come from auth in real app
      role: "Teacher",
      district: "TDSB",
      province: "ON",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      usageTags: selectedTags,
      title: title.trim() || undefined,
      body: body.trim(),
    }

    addReview(newReview)

    // Show success animation
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setShowForm(false)
      setRating(0)
      setSelectedTags([])
      setTitle("")
      setBody("")
    }, 2000)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-start justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Reviews</h2>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{resourceTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {showSuccess ? (
            // Success animation
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-[scale-in_0.3s_ease-out]">
                <CheckCircle className="w-16 h-16 text-success animate-[ping_1s_ease-out]" />
              </div>
              <p className="font-display text-lg font-semibold text-foreground mt-4 animate-[fade-in_0.5s_ease-in_0.3s_both]">
                Review submitted!
              </p>
            </div>
          ) : showForm ? (
            // Review form
            <div className="space-y-6">
              {/* Rating */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Your rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          value <= (hoveredRating || rating) ? "fill-pop text-pop" : "text-border-strong"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Usage tags */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  How did you use this resource?
                </label>
                <div className="flex flex-wrap gap-2">
                  {USAGE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground hover:bg-border-strong"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sum up your experience"
                  className="w-full px-4 py-2.5 border border-border-strong rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Your review</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Share how this resource worked in your classroom..."
                  rows={5}
                  className="w-full px-4 py-2.5 border border-border-strong rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || body.trim() === ""}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover disabled:bg-border-strong disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit Review
              </button>
            </div>
          ) : reviews.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="w-16 h-16 text-border-strong mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No reviews yet</h3>
              <p className="text-muted-foreground mb-6">Be the first to share how you used this resource!</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover transition-colors flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Write a Review
              </button>
            </div>
          ) : (
            // Reviews list
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-border pb-6 last:border-0">
                  {/* Rating + Name + Info */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Star
                              key={value}
                              className={`w-4 h-4 ${value <= review.rating ? "fill-pop text-pop" : "text-border-strong"}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {review.rating}/5 {review.rating >= 4 ? "Excellent" : review.rating >= 3 ? "Good" : "Fair"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{review.reviewerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.role} • {review.district} • {review.province}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{review.date}</span>
                  </div>

                  {/* Usage tags */}
                  {review.usageTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {review.usageTags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Title + Body */}
                  {review.title && <h4 className="font-semibold text-foreground mb-1">{review.title}</h4>}
                  <p className="text-sm text-foreground leading-relaxed">{review.body}</p>
                </div>
              ))}

              <button
                onClick={() => setShowForm(true)}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Write a Review
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
