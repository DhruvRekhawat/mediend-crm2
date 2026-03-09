"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useUpdateTask } from "@/hooks/use-tasks"
import type { Task } from "@/hooks/use-tasks"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
  const [rating, setRating] = useState<number>(0)
  const [comments, setComments] = useState("")
  const updateTask = useUpdateTask()

  const handleSubmit = async () => {
    if (!task || rating < 1 || rating > 5) return
    try {
      await updateTask.mutateAsync({
        id: task.id,
        data: {
          status: "COMPLETED",
          completionRating: rating,
          completionComments: comments.trim() || undefined,
        },
      })
      toast.success("Task marked complete")
      setRating(0)
      setComments("")
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error("Failed to mark task complete")
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setRating(0)
      setComments("")
    }
    onOpenChange(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl flex flex-col max-h-[85dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="text-left">
          <SheetTitle>
            {task ? `Mark complete: ${task.title}` : "Mark task complete"}
          </SheetTitle>
        </SheetHeader>
        {task && (
          <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-auto py-4">
            <div>
              <p className="text-sm font-medium mb-2">Rating (required)</p>
              <div className="flex gap-1" role="group" aria-label="Rate 1 to 5 stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${value} star${value === 1 ? "" : "s"}`}
                    aria-pressed={rating === value}
                  >
                    <Star
                      className={cn(
                        "h-10 w-10 transition-colors",
                        rating >= value
                          ? "fill-yellow-400 text-yellow-500"
                          : "fill-muted text-muted-foreground hover:fill-yellow-200 hover:text-yellow-400"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Comments</p>
              <Textarea
                placeholder="Add feedback or comments (optional)"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="min-h-[100px] resize-none"
                rows={4}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={rating < 1 || rating > 5 || updateTask.isPending}
                className="flex-1"
              >
                Mark complete
              </Button>
              <Button
                variant="outline"
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
