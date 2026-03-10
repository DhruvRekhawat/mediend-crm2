"use client"

import { cn } from "@/lib/utils"
import { Star } from "lucide-react"

interface CompletionFeedbackProps {
  grade: string
  comments?: string | null
  completedBy?: { id: string; name: string } | null
  completedAt?: string | null
  className?: string
  compact?: boolean
}

const RATING_COLORS: Record<string, string> = {
  "1": "text-red-500",
  "2": "text-orange-500",
  "3": "text-amber-500",
  "4": "text-emerald-500",
  "5": "text-emerald-600",
}

const RATING_LABELS: Record<string, string> = {
  "1": "Poor",
  "2": "Below average",
  "3": "Average",
  "4": "Good",
  "5": "Excellent",
}

function RatingStars({ grade, size = "sm" }: { grade: string; size?: "sm" | "md" }) {
  const num = parseInt(grade)
  if (isNaN(num) || num < 1 || num > 5) return null
  const iconClass = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            iconClass,
            s <= num
              ? cn("fill-current", RATING_COLORS[grade])
              : "text-muted-foreground/20"
          )}
        />
      ))}
      <span className={cn("ml-1.5 text-xs font-medium", RATING_COLORS[grade])}>
        {RATING_LABELS[grade]}
      </span>
    </div>
  )
}

export function CompletionFeedback({
  grade,
  comments,
  completedBy,
  completedAt,
  className,
  compact = false,
}: CompletionFeedbackProps) {
  const num = parseInt(grade)
  if (isNaN(num) || num < 1 || num > 5) return null

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <RatingStars grade={grade} size="sm" />
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
        <RatingStars grade={grade} size="md" />
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
