"use client"

import { useState } from "react"
import { format, startOfDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock } from "lucide-react"
import type { WorkLog } from "@/hooks/use-work-logs"
import { useCreateWorkLog } from "@/hooks/use-work-logs"
import { toast } from "sonner"

const INTERVALS = [
  { start: 9, end: 12, label: "9:00 AM - 12:00 PM" },
  { start: 12, end: 15, label: "12:00 PM - 3:00 PM" },
  { start: 15, end: 18, label: "3:00 PM - 6:00 PM" },
] as const

interface WorkLogPanelProps {
  logs: WorkLog[]
  selectedDate: Date
  isLoading?: boolean
  onLogSubmitted?: () => void
}

export function WorkLogPanel({
  logs,
  selectedDate,
  isLoading,
  onLogSubmitted,
}: WorkLogPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedInterval, setSelectedInterval] = useState<
    (typeof INTERVALS)[number] | null
  >(null)
  const [description, setDescription] = useState("")

  const createMutation = useCreateWorkLog()
  const dayStart = startOfDay(selectedDate)

  const getLogForInterval = (start: number) =>
    logs.find(
      (l) =>
        new Date(l.logDate).getTime() === dayStart.getTime() &&
        l.intervalStart === start
    )

  const handleOpenDialog = (interval: (typeof INTERVALS)[number]) => {
    setSelectedInterval(interval)
    const existing = getLogForInterval(interval.start)
    setDescription(existing?.description ?? "")
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedInterval || !description.trim()) {
      toast.error("Description is required")
      return
    }

    try {
      await createMutation.mutateAsync({
        logDate: dayStart.toISOString(),
        intervalStart: selectedInterval.start as 9 | 12 | 15,
        intervalEnd: selectedInterval.end as 12 | 15 | 18,
        description: description.trim(),
      })
      toast.success("Work log saved")
      setDialogOpen(false)
      setDescription("")
      setSelectedInterval(null)
      onLogSubmitted?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save log")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5" />
        <h3 className="font-semibold">Work Logs</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        {format(selectedDate, "EEEE, MMMM d, yyyy")}
      </p>

      {isLoading ? (
        <div className="text-muted-foreground text-sm py-4">Loading logs...</div>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {INTERVALS.map((interval) => {
              const log = getLogForInterval(interval.start)
              return (
                <Card key={interval.start} className="overflow-hidden">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {interval.label}
                      </CardTitle>
                      <Button
                        variant={log ? "ghost" : "outline"}
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleOpenDialog(interval)}
                      >
                        {log ? "Edit" : "Log"}
                      </Button>
                    </div>
                  </CardHeader>
                  {log && (
                    <CardContent className="pt-0 px-4 pb-3">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {log.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Logged at {format(new Date(log.createdAt), "h:mm a")}
                      </p>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setSelectedInterval(null); setDescription(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedInterval?.label ?? "Log work"} -{" "}
              {format(selectedDate, "MMM d")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="log-description">What did you do?</Label>
              <Textarea
                id="log-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you accomplished in this time period..."
                rows={4}
                className="mt-2 resize-none"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!description.trim() || createMutation.isPending}
            >
              Save Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
