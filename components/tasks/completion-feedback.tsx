"use client"

import { cn } from "@/lib/utils"

interface CompletionFeedbackProps {
  grade: string
  comments?: string | null
  completedBy?: { id: string; name: string } | null
  completedAt?: string | null
  className?: string
  /** When true, show in a compact single-line style */
  compact?: boolean
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  "A": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "B+": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "B": "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  "C": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
}

export function CompletionFeedback({
  grade,
  comments,
  completedBy,
  completedAt,
  className,
  compact = false,
}: CompletionFeedbackProps) {
  if (!grade || !["A+", "A", "B+", "B", "C"].includes(grade)) return null

  const gradeBadge = (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        GRADE_COLORS[grade] ?? "bg-muted text-muted-foreground"
      )}
    >
      {grade}
    </span>
  )

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {gradeBadge}
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
        {gradeBadge}
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
