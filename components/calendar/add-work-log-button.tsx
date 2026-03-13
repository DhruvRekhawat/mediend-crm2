"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Clock } from "lucide-react"
import { useCreateWorkLog, useWorkLogCheck } from "@/hooks/use-work-logs"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "sonner"

const INTERVALS = [
  { start: 0, end: 9, label: "Night catch-up (optional)" },
  { start: 9, end: 11, label: "9:00 AM - 11:00 AM" },
  { start: 11, end: 13, label: "11:00 AM - 1:00 PM" },
  { start: 13, end: 15, label: "1:00 PM - 3:00 PM" },
  { start: 15, end: 17, label: "3:00 PM - 5:00 PM" },
  { start: 17, end: 19, label: "5:00 PM - 7:00 PM" },
] as const

function formatDateOnly(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

interface AddWorkLogButtonProps {
  /** Override visibility. When undefined, uses work-log check (MD team + watchlist). */
  visible?: boolean
}

function AddWorkLogForm({
  selectedDate,
  setSelectedDate,
  selectedInterval,
  setSelectedInterval,
  description,
  setDescription,
  onSubmit,
  isPending,
  onCancel,
}: {
  selectedDate: Date
  setSelectedDate: (d: Date) => void
  selectedInterval: (typeof INTERVALS)[number] | null
  setSelectedInterval: (i: (typeof INTERVALS)[number] | null) => void
  description: string
  setDescription: (s: string) => void
  onSubmit: () => void
  isPending: boolean
  onCancel: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="log-date">Date</Label>
        <input
          id="log-date"
          type="date"
          value={format(selectedDate, "yyyy-MM-dd")}
          onChange={(e) =>
            setSelectedDate(new Date(e.target.value + "T12:00:00"))
          }
          className="mt-2 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30"
        />
      </div>
      <div>
        <Label htmlFor="log-interval">Time period</Label>
        <Select
          value={selectedInterval ? `${selectedInterval.start}-${selectedInterval.end}` : ""}
          onValueChange={(v) => {
            const [start, end] = v.split("-").map(Number)
            const interval = INTERVALS.find(
              (i) => i.start === start && i.end === end
            )
            if (interval) setSelectedInterval(interval)
          }}
        >
          <SelectTrigger id="log-interval" className="mt-2">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {INTERVALS.map((i) => (
              <SelectItem
                key={`${i.start}-${i.end}`}
                value={`${i.start}-${i.end}`}
              >
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="log-description">What did you do?</Label>
        <Textarea
          id="log-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you accomplished in this time period..."
          rows={4}
          className="mt-2 resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!description.trim() || isPending}
        >
          {isPending ? "Saving…" : "Save log"}
        </Button>
      </div>
    </div>
  )
}

export function AddWorkLogButton({ visible: visibleOverride }: AddWorkLogButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [selectedInterval, setSelectedInterval] = useState<
    (typeof INTERVALS)[number] | null
  >(null)
  const [description, setDescription] = useState("")

  const { data: workLogCheck } = useWorkLogCheck({
    tzOffsetMinutes: -new Date().getTimezoneOffset(),
  })
  const createMutation = useCreateWorkLog()
  const isMobile = useIsMobile()

  const subjectToWorkLogs = workLogCheck?.subjectToWorkLogs ?? false
  const visible =
    visibleOverride !== undefined ? visibleOverride : subjectToWorkLogs

  const handleOpen = () => {
    setSelectedDate(new Date())
    setSelectedInterval(INTERVALS[1]) // default to 9-11 AM
    setDescription("")
    setOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedInterval || !description.trim()) {
      toast.error("Please select an interval and enter what you did")
      return
    }

    try {
      const tzOffsetMinutes = -new Date().getTimezoneOffset()
      await createMutation.mutateAsync({
        logDate: formatDateOnly(selectedDate),
        intervalStart: selectedInterval.start as 0 | 9 | 11 | 13 | 15 | 17,
        intervalEnd: selectedInterval.end as 9 | 11 | 13 | 15 | 17 | 19,
        description: description.trim(),
        tzOffsetMinutes,
      })
      toast.success("Work log saved")
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save log")
    }
  }

  if (!visible) return null

  const formProps = {
    selectedDate,
    setSelectedDate,
    selectedInterval,
    setSelectedInterval,
    description,
    setDescription,
    onSubmit: handleSubmit,
    isPending: createMutation.isPending,
    onCancel: () => setOpen(false),
  }

  const title = (
    <span className="flex items-center gap-2">
      <Clock className="h-5 w-5 text-teal-600" />
      Add work log
    </span>
  )

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-teal-500/30 hover:bg-teal-500/10 text-teal-700 dark:text-teal-300"
        onClick={handleOpen}
      >
        <Clock className="h-4 w-4" />
        Add work log
      </Button>
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[90vh] rounded-t-2xl">
            <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
            <DrawerHeader className="text-left">
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8">
              <AddWorkLogForm {...formProps} />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <AddWorkLogForm {...formProps} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
