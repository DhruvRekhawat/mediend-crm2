"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useWorkLogCheck, useCreateWorkLog } from "@/hooks/use-work-logs"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

const INTERVAL_LABELS: Record<number, string> = {
  9: "9:00 AM - 12:00 PM",
  12: "12:00 PM - 3:00 PM",
  15: "3:00 PM - 6:00 PM",
}

export function WorkLogEnforcer() {
  const queryClient = useQueryClient()
  const { data: checkResult, isLoading } = useWorkLogCheck()
  const createMutation = useCreateWorkLog()
  const [description, setDescription] = useState("")
  const [submittingInterval, setSubmittingInterval] = useState<number | null>(
    null
  )

  const isBlocked = checkResult?.isBlocked ?? false
  const missingIntervals = checkResult?.missingIntervals ?? []

  const handleSubmit = async (intervalStart: number, intervalEnd: number) => {
    if (!description.trim()) {
      toast.error("Please describe what you did")
      return
    }

    setSubmittingInterval(intervalStart)
    try {
      const today = new Date()
      const logDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

      await createMutation.mutateAsync({
        logDate: logDate.toISOString(),
        intervalStart: intervalStart as 9 | 12 | 15,
        intervalEnd: intervalEnd as 12 | 15 | 18,
        description: description.trim(),
      })
      toast.success("Work log saved")
      setDescription("")
      setSubmittingInterval(null)
      queryClient.invalidateQueries({ queryKey: ["work-logs", "check"] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save log")
      setSubmittingInterval(null)
    }
  }

  if (isLoading || !isBlocked || missingIntervals.length === 0) {
    return null
  }

  const firstMissing = missingIntervals[0]
  const intervalEnd =
    firstMissing.start === 9 ? 12 : firstMissing.start === 12 ? 15 : 18

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Work Log Required</DialogTitle>
          <DialogDescription>
            You must log what you did in the previous 3-hour interval before
            continuing. This is required during work hours (9 AM - 6 PM).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="work-log-description">
              What did you do during {INTERVAL_LABELS[firstMissing.start] ?? `${firstMissing.start}-${firstMissing.end}`}?
            </Label>
            <Textarea
              id="work-log-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your work during this period..."
              rows={4}
              className="mt-2 resize-none"
              autoFocus
            />
          </div>
          <Button
            className="w-full"
            onClick={() => handleSubmit(firstMissing.start, intervalEnd)}
            disabled={!description.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Saving..." : "Submit Work Log"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
