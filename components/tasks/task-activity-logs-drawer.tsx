"use client"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"
import { ListChecks } from "lucide-react"
import { useMemberTaskActivity, type MemberTaskActivityLog } from "@/hooks/use-tasks"
import { cn } from "@/lib/utils"

const ACTIVITY_LABELS: Record<string, string> = {
  TITLE_CHANGED: "Title changed",
  DUE_DATE_CHANGED: "Due date changed",
  PRIORITY_CHANGED: "Priority changed",
  STATUS_CHANGED: "Status changed",
  PROJECT_CHANGED: "Project changed",
}

const ACTIVITY_COLORS: Record<string, { border: string; bg: string; icon: string }> = {
  TITLE_CHANGED: { border: "border-blue-200 dark:border-blue-800", bg: "bg-blue-50/60 dark:bg-blue-950/30", icon: "text-blue-600 dark:text-blue-400" },
  DUE_DATE_CHANGED: { border: "border-purple-200 dark:border-purple-800", bg: "bg-purple-50/60 dark:bg-purple-950/30", icon: "text-purple-600 dark:text-purple-400" },
  PRIORITY_CHANGED: { border: "border-orange-200 dark:border-orange-800", bg: "bg-orange-50/60 dark:bg-orange-950/30", icon: "text-orange-600 dark:text-orange-400" },
  STATUS_CHANGED: { border: "border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50/60 dark:bg-emerald-950/30", icon: "text-emerald-600 dark:text-emerald-400" },
  PROJECT_CHANGED: { border: "border-violet-200 dark:border-violet-800", bg: "bg-violet-50/60 dark:bg-violet-950/30", icon: "text-violet-600 dark:text-violet-400" },
}

function formatActivityDetails(action: string, details: string | null): string {
  if (!details) return ""
  if (action === "DUE_DATE_CHANGED") {
    return details
      .split(/\s*→\s*/)
      .map((part) => {
        const trimmed = part.trim()
        if (trimmed === "None" || !trimmed) return trimmed
        const d = new Date(trimmed)
        return isNaN(d.getTime()) ? trimmed : format(d, "MMM d, yyyy")
      })
      .join(" → ")
  }
  return details
}

export interface TaskActivityLogsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
}

export function TaskActivityLogsDrawer({
  open,
  onOpenChange,
  memberId,
  memberName,
}: TaskActivityLogsDrawerProps) {
  const { data: activity = [], isLoading } = useMemberTaskActivity(open ? memberId : null)

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full max-h-dvh w-full max-w-md sm:max-w-lg ml-auto rounded-l-2xl rounded-r-none flex flex-col overflow-hidden">
        <DrawerHeader className="shrink-0 border-b">
          <DrawerTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-indigo-600" />
            Task Logs — {memberName}
          </DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3 pb-8">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8">Loading logs…</p>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8">No task activity yet</p>
            ) : (
              activity.map((a: MemberTaskActivityLog) => {
                const colors = ACTIVITY_COLORS[a.action] ?? { border: "border-border", bg: "bg-background/50", icon: "text-muted-foreground" }
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "rounded-lg border-l-2 px-3 py-2.5",
                      colors.border,
                      colors.bg
                    )}
                  >
                    <span className={cn("font-semibold text-sm", colors.icon)}>
                      {ACTIVITY_LABELS[a.action] ?? a.action}
                    </span>
                    {a.task && (
                      <p className="text-xs font-medium text-foreground/80 mt-0.5 truncate">
                        {a.task.title}
                      </p>
                    )}
                    <p className="text-sm text-foreground/80 mt-0.5">
                      {a.user.name}
                      {a.details ? ` · ${formatActivityDetails(a.action, a.details)}` : ""}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(a.createdAt), "MMM d, HH:mm")}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}
