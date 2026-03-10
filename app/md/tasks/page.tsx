"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import { TabNavigation, type TabItem } from "@/components/employee/tab-navigation"
import { TaskInput } from "@/components/tasks/task-input"
import { MobileTaskDrawer } from "@/components/tasks/mobile-task-drawer"
import { ApprovalTab } from "@/components/tasks/approval-tab"
import { OverviewTab } from "@/components/tasks/overview-tab"
import { CalendarTab } from "@/components/tasks/calendar-tab"
import { CompletedTab } from "@/components/tasks/completed-tab"
import { TeamTab } from "@/components/tasks/team-tab"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"

const TASKS_TABS: TabItem[] = [
  { value: "team", label: "Team" },
  { value: "approval", label: "Approval" },
  { value: "overview", label: "Overview" },
  { value: "calendar", label: "Calendar" },
  { value: "completed", label: "Completed" },
]

const VALID_TABS = new Set(TASKS_TABS.map((t) => t.value))

function getTabFromHash(): string {
  if (typeof window === "undefined") return "team"
  const hash = window.location.hash.slice(1) || "team"
  return VALID_TABS.has(hash) ? hash : "team"
}

export default function MDTasksPage() {
  const [activeTab, setActiveTab] = useState("team")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isMobile = useIsMobile()

  const syncFromHash = useCallback(() => {
    setActiveTab(getTabFromHash())
  }, [])

  useEffect(() => {
    syncFromHash()
    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [syncFromHash])

  const handleTabChange = useCallback((value: string) => {
    if (VALID_TABS.has(value)) {
      window.location.hash = value
      setActiveTab(value)
    }
  }, [])

  return (
    <div className="flex flex-col min-h-0 w-full max-w-5xl mx-auto px-2 md:px-0">
      <div className="shrink-0 space-y-3 md:space-y-4 pb-3 md:pb-4">
        {!isMobile && (
          <TaskInput
            onSuccess={() => {}}
            className="w-full"
            isMD
          />
        )}
      </div>

      <TabNavigation
        tabs={TASKS_TABS}
        value={activeTab}
        onValueChange={handleTabChange}
        variant="tasks"
        className="-mx-2 md:mx-0 px-2 md:px-0"
      />

      <div className="flex-1 min-h-0 py-0 md:py-4">
        {activeTab === "approval" && <ApprovalTab />}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "calendar" && <CalendarTab />}
        {activeTab === "completed" && <CompletedTab />}
        {activeTab === "team" && <TeamTab />}
      </div>

      {isMobile && (
        <>
          <Button
            size="icon"
            className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
            onClick={() => setDrawerOpen(true)}
            aria-label="New task"
          >
            <Plus className="h-12 w-12 font-bold" />
          </Button>
          <MobileTaskDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            onSuccess={() => {}}
            isMD
          />
        </>
      )}
    </div>
  )
}
