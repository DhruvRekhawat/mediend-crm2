"use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface CompletionFeedbackProps {
  rating: number
  comments?: string | null
  completedBy?: { id: string; name: string } | null
  completedAt?: string | null
  className?: string
  /** When true, show in a compact single-line style */
  compact?: boolean
}

export function CompletionFeedback({
  rating,
  comments,
  completedBy,
  completedAt,
  className,
  compact = false,
}: CompletionFeedbackProps) {
  if (rating < 1 || rating > 5) return null

  const stars = (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`Rated ${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "shrink-0",
            compact ? "h-4 w-4" : "h-5 w-5",
            i <= rating ? "fill-yellow-400 text-yellow-500" : "fill-muted text-muted-foreground"
          )}
          aria-hidden
        />
      ))}
    </div>
  )

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {stars}
        {comments && (
          <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={comments}>
            {comments}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg border bg-muted/30 p-3 space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Completion feedback</span>
        {stars}
      </div>
      {comments && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comments}</p>
      )}
      {(completedBy || completedAt) && (
        <p className="text-xs text-muted-foreground">
          {completedBy && `Completed by ${completedBy.name}`}
          {completedBy && completedAt && " · "}
          {completedAt && new Date(completedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}
