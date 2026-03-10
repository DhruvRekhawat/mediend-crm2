"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUpdateTask } from "@/hooks/use-tasks"
import type { Task } from "@/hooks/use-tasks"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const GRADES = ["A+", "A", "B+", "B", "C"] as const

const GRADE_STYLES: Record<(typeof GRADES)[number], string> = {
  "A+": "border-emerald-600 bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500",
  "A": "border-emerald-500 bg-emerald-400 text-emerald-950 hover:bg-emerald-500 dark:bg-emerald-700 dark:text-white dark:hover:bg-emerald-600",
  "B+": "border-blue-500 bg-blue-400 text-blue-950 hover:bg-blue-500 dark:bg-blue-700 dark:text-white dark:hover:bg-blue-600",
  "B": "border-blue-400 bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-800/50",
  "C": "border-amber-500 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-800/50",
}

const PRESET_COMMENTS = [
  "Good job",
  "Excellent work",
  "Delivered on time",
  "Slight delay",
  "Very delayed",
  "Bad quality of work",
  "Needs improvement",
  "Rework required",
]

interface MarkCompleteDrawerProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function MarkCompleteDrawer({
  task,
  open,
  onOpenChange,
  onSuccess,
}: MarkCompleteDrawerProps) {
  const [grade, setGrade] = useState<string | null>(null)
  const [comments, setComments] = useState("")
  const updateTask = useUpdateTask()

  const handlePresetSelect = (value: string) => {
    const preset = PRESET_COMMENTS.find((p) => p === value)
    if (preset) {
      setComments((prev) => (prev ? `${prev}\n${preset}` : preset))
    }
  }

  const handleApprove = async () => {
    if (!task || !grade || !GRADES.includes(grade as (typeof GRADES)[number])) return
    try {
      await updateTask.mutateAsync({
        id: task.id,
        data: {
          status: "COMPLETED",
          grade: grade as "A+" | "A" | "B+" | "B" | "C",
          completionComments: comments.trim() || undefined,
        },
      })
      toast.success("Task approved")
      setGrade(null)
      setComments("")
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error("Failed to approve task")
    }
  }

  const handleReject = async () => {
    if (!task) return
    try {
      await updateTask.mutateAsync({
        id: task.id,
        data: { status: "IN_PROGRESS" },
      })
      toast.success("Task sent back to in progress")
      setGrade(null)
      setComments("")
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error("Failed to reject task")
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setGrade(null)
      setComments("")
    }
    onOpenChange(next)
  }

  const canApprove = task && grade && GRADES.includes(grade as (typeof GRADES)[number])

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl flex flex-col max-h-[85dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] px-4 sm:px-6"
      >
        <SheetHeader className="text-left px-0">
          <SheetTitle>
            {task ? `Review: ${task.title}` : "Review task"}
          </SheetTitle>
        </SheetHeader>
        {task && (
          <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-auto py-5 px-1 sm:px-2">
            <div>
              <p className="text-sm font-medium mb-3">Grade (required to approve)</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Select grade">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={cn(
                      "rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                      grade === g ? GRADE_STYLES[g] : "border-input bg-muted/50 hover:bg-muted"
                    )}
                    aria-pressed={grade === g}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Quick comment</p>
              <Select onValueChange={handlePresetSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Add preset comment..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_COMMENTS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Comments</p>
              <Textarea
                placeholder="Add feedback (optional)"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="min-h-[100px] resize-none"
                rows={4}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApprove}
                disabled={!canApprove || updateTask.isPending}
                className="flex-1"
              >
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={updateTask.isPending}
                className="text-destructive hover:text-destructive"
              >
                Reject
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={updateTask.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
