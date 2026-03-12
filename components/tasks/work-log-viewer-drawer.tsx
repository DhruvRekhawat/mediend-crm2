"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useWorkLogs, type WorkLog } from "@/hooks/use-work-logs"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { Clock, Sunrise, Sun, Sunset, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

const DAYS_PER_PAGE = 14

const INTERVAL_CONFIG: Record<number, { label: string; color: string; icon: typeof Clock }> = {
  0: {
    label: "Night",
    color: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
    icon: Moon,
  },
  9: {
    label: "9-11",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    icon: Sunrise,
  },
  11: {
    label: "11-1",
    color: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
    icon: Sun,
  },
  13: {
    label: "1-3",
    color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
    icon: Sun,
  },
  15: {
    label: "3-5",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    icon: Sunset,
  },
  17: {
    label: "5-7",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    icon: Moon,
  },
}

function getIntervalConfig(start: number) {
  return INTERVAL_CONFIG[start] ?? {
    label: `${start}`,
    color: "bg-muted text-muted-foreground",
    icon: Clock,
  }
}

export interface WorkLogViewerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
}

export function WorkLogViewerDrawer({
  open,
  onOpenChange,
  memberId,
  memberName,
}: WorkLogViewerDrawerProps) {
  const [daysToLoad, setDaysToLoad] = useState(DAYS_PER_PAGE)

  const endDate = new Date()
  const startDate = subDays(endDate, daysToLoad - 1)
  const { data: logs = [], isLoading } = useWorkLogs(
    startOfDay(startDate),
    endOfDay(endDate),
    memberId
  )

  const groupedByDate = logs.reduce<Record<string, WorkLog[]>>((acc, log) => {
    const key = format(new Date(log.logDate), "yyyy-MM-dd")
    if (!acc[key]) acc[key] = []
    acc[key].push(log)
    return acc
  }, {})

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  const loadMore = useCallback(() => {
    setDaysToLoad((d) => d + DAYS_PER_PAGE)
  }, [])

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading) loadMore()
      },
      { rootMargin: "100px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [open, loadMore, isLoading])

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full max-h-dvh w-full max-w-md sm:max-w-lg ml-auto rounded-l-2xl rounded-r-none">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-600" />
            Work Logs — {memberName}
          </DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6 pb-8">
            {isLoading && sortedDates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8">Loading logs…</p>
            ) : sortedDates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8">No work logs yet</p>
            ) : (
              sortedDates.map((dateStr) => {
                const dateLogs = groupedByDate[dateStr]
                if (!dateLogs?.length) return null
                const date = new Date(dateStr)
                return (
                  <section key={dateStr}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      {format(date, "EEEE, MMM d, yyyy")}
                    </h3>
                    <div className="space-y-2">
                      {dateLogs
                        .sort((a, b) => a.intervalStart - b.intervalStart)
                        .map((log) => {
                          const config = getIntervalConfig(log.intervalStart)
                          const Icon = config.icon
                          return (
                            <div
                              key={log.id}
                              className={cn(
                                "rounded-lg border p-3",
                                "bg-card"
                              )}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                    config.color
                                  )}
                                >
                                  <Icon className="h-3 w-3" />
                                  {config.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(log.createdAt), "h:mm a")}
                                </span>
                              </div>
                              <p className="text-sm text-foreground line-clamp-4">
                                {log.description}
                              </p>
                            </div>
                          )
                        })}
                    </div>
                  </section>
                )
              })
            )}
            <div ref={sentinelRef} className="h-4" aria-hidden />
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}
