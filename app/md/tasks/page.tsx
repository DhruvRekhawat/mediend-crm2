"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus } from "lucide-react"
import { TabNavigation, type TabItem } from "@/components/employee/tab-navigation"
import { TaskInput } from "@/components/tasks/task-input"
import { MobileTaskDrawer } from "@/components/tasks/mobile-task-drawer"
import { ApprovalTab } from "@/components/tasks/approval-tab"
import { OverviewTab } from "@/components/tasks/overview-tab"
import { CalendarTab } from "@/components/tasks/calendar-tab"
import { CompletedTab } from "@/components/tasks/completed-tab"
import { TeamTab } from "@/components/tasks/team-tab"
import { TodayTab } from "@/components/tasks/today-tab"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { apiGet } from "@/lib/api-client"

export default function MDTasksPage() {
  const [isManager, setIsManager] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState("team")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    let cancelled = false
    async function checkManager() {
      try {
        await apiGet("/api/md/team-overview")
        if (!cancelled) setIsManager(true)
      } catch {
        if (!cancelled) setIsManager(false)
      }
    }
    checkManager()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isManager === false && activeTab === "team") {
      setActiveTab("all")
      if (typeof window !== "undefined") window.location.hash = "all"
    }
  }, [isManager, activeTab])

  const tabs: TabItem[] = useMemo(
    () => [
      ...(isManager !== false ? [{ value: "team", label: "Team" as const }] : []),
      { value: "approval", label: "Approval" },
      { value: "all", label: "All tasks" },
      { value: "overview", label: "Overview" },
      { value: "calendar", label: "Calendar" },
      { value: "completed", label: "Completed" },
    ],
    [isManager]
  )

  const validTabValues = useMemo(() => new Set(tabs.map((t) => t.value)), [tabs])

  const syncFromHash = useCallback(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash.slice(1)
    const defaultTab = isManager !== false ? "team" : "all"
    const effectiveHash = hash || defaultTab
    if (effectiveHash === "team" && isManager === false) {
      setActiveTab("all")
      return
    }
    setActiveTab(validTabValues.has(effectiveHash) ? effectiveHash : defaultTab)
  }, [isManager, validTabValues])

  useEffect(() => {
    syncFromHash()
    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [syncFromHash])

  const handleTabChange = useCallback(
    (value: string) => {
      if (!validTabValues.has(value)) return
      if (value === "team" && !isManager) {
        value = "all"
      }
      if (typeof window !== "undefined") {
        window.location.hash = value
      }
      setActiveTab(value)
    },
    [isManager, validTabValues]
  )

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
        tabs={tabs}
        value={activeTab}
        onValueChange={handleTabChange}
        variant="tasks"
        className="-mx-2 md:mx-0 px-2 md:px-0 mb-4"
      />

      <div className="flex-1 min-h-0 py-0 md:py-4">
        {activeTab === "team" && isManager && <TeamTab />}
        {activeTab === "all" && <TodayTab />}
        {activeTab === "approval" && <ApprovalTab />}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "calendar" && <CalendarTab />}
        {activeTab === "completed" && <CompletedTab />}
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
