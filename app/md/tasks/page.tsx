"use client"

import { useState, useEffect, useCallback } from "react"
import { TabNavigation, type TabItem } from "@/components/employee/tab-navigation"
import { TaskInput } from "@/components/tasks/task-input"
import { TodayTab } from "@/components/tasks/today-tab"
import { OverviewTab } from "@/components/tasks/overview-tab"
import { CalendarTab } from "@/components/tasks/calendar-tab"
import { CompletedTab } from "@/components/tasks/completed-tab"
import { TeamTab } from "@/components/tasks/team-tab"
import { useIsMobile } from "@/hooks/use-mobile"

const TASKS_TABS: TabItem[] = [
  { value: "today", label: "Today" },
  { value: "overview", label: "Overview" },
  { value: "calendar", label: "Calendar" },
  { value: "completed", label: "Completed" },
  { value: "team", label: "Team" },
]

const VALID_TABS = new Set(TASKS_TABS.map((t) => t.value))

function getTabFromHash(): string {
  if (typeof window === "undefined") return "today"
  const hash = window.location.hash.slice(1) || "today"
  return VALID_TABS.has(hash) ? hash : "today"
}

export default function MDTasksPage() {
  const [activeTab, setActiveTab] = useState("today")
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
    <div className="flex flex-col min-h-0 w-full max-w-4xl mx-auto px-3 md:px-0">
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
        className="-mx-3 md:mx-0 px-3 md:px-0"
      />

      <div className="flex-1 min-h-0 py-3 md:py-4">
        {activeTab === "today" && <TodayTab />}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "calendar" && <CalendarTab />}
        {activeTab === "completed" && <CompletedTab />}
        {activeTab === "team" && <TeamTab />}
      </div>

      {isMobile && (
        <div className="sticky bottom-0 left-0 right-0 -mx-3 bg-background border-t px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <TaskInput
            onSuccess={() => {}}
            bottomAnchored
            className="w-full"
            isMD
          />
        </div>
      )}
    </div>
  )
}
