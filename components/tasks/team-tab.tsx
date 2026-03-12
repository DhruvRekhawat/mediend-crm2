"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, UserPlus, Star, ArrowUpRight, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useMDTeamOverview, type MDTeamOverviewMember } from "@/hooks/use-md-team"
import { useWarnings } from "@/hooks/use-tasks"
import { getAvatarColor } from "@/lib/avatar-colors"
import { AddPersonDialog } from "./add-person-dialog"
import { cn } from "@/lib/utils"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
}

const STAR_COLOR: Record<number, string> = {
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-amber-500",
  4: "text-emerald-500",
  5: "text-emerald-600",
}

function getStarColor(rating: number): string {
  const rounded = Math.round(rating)
  return STAR_COLOR[Math.min(5, Math.max(1, rounded))] ?? "text-amber-500"
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

function hasStaleWorkLog(lastWorkLogAt: string | null): boolean {
  if (!lastWorkLogAt) return true
  const last = new Date(lastWorkLogAt).getTime()
  return Date.now() - last > TWENTY_FOUR_HOURS_MS
}

export function TeamTab() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [addPersonOpen, setAddPersonOpen] = useState(false)

  const { data, isLoading, isError, error } = useMDTeamOverview(search || undefined)
  const { data: warnings = [] } = useWarnings()
  const members = data?.members ?? []

  const warningsByUserId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const w of warnings) {
      map[w.employeeId] = (map[w.employeeId] ?? 0) + 1
    }
    return map
  }, [warnings])

  if (isError) {
    return (
      <div className="py-6 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load team."}
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search team members"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setAddPersonOpen(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add person
        </Button>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Loading team…
        </div>
      ) : members.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          {search ? "No team members match your search." : "No team members yet. Add people to get started."}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {members.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              warningCount={warningsByUserId[member.id] ?? 0}
              onClick={() => router.push(`/md/tasks/team/${member.id}`)}
            />
          ))}
        </div>
      )}

      <AddPersonDialog open={addPersonOpen} onOpenChange={setAddPersonOpen} />
    </div>
  )
}

function TeamMemberCard({
  member,
  warningCount,
  onClick,
}: {
  member: MDTeamOverviewMember
  warningCount: number
  onClick: () => void
}) {
  const isIn = member.attendanceStatus === "in"
  const isLeave = member.attendanceStatus === "leave"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card shadow-sm w-full text-center transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation active:opacity-90",
        "flex flex-col items-stretch p-4"
      )}
    >
      {/* Avatar centered at top */}
      <div className="flex justify-center mb-3">
        <Avatar className="size-14 shrink-0">
          <AvatarFallback
            className={cn(
              "font-semibold text-base text-white",
              getAvatarColor(member.name).bg,
              getAvatarColor(member.name).text
            )}
          >
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Name */}
      <p className="font-semibold text-base text-foreground truncate px-1">
        {member.name}
      </p>

      {/* Designation / role */}
      <p className="text-sm text-muted-foreground truncate mt-0.5 px-1">
        {member.designation || member.role || member.department?.name || "—"}
      </p>

      {/* Optional: attendance badge */}
      <div className="mt-1.5 flex flex-col items-center gap-1">
        <span
          className={cn(
            "rounded px-2 py-0.5 text-xs font-medium",
            isLeave && "bg-amber-100 text-amber-800",
            isIn && "bg-green-100 text-green-800",
            !isIn && !isLeave && "bg-muted text-muted-foreground"
          )}
        >
          {isLeave ? "Leave" : isIn ? "IN" : "OUT"}
        </span>
        {hasStaleWorkLog(member.lastWorkLogAt) && (
          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3" />
            No work log 24h+
          </span>
        )}
      </div>

      {/* Task overview: ACTIVE · DONE · WARN */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-center gap-4 text-sm">
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-semibold text-blue-600">{member.taskCount}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Active</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-semibold text-muted-foreground">
            {member.completedCount ?? 0}
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Done</span>
        </div>
        {warningCount > 0 && (
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-semibold text-red-600">{warningCount}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Warn</span>
          </div>
        )}
      </div>

      {/* Extra: rating & extensions when present */}
      {(member.averageRating != null || (member.extensionRequests ?? 0) > 0) && (
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
          {member.averageRating != null && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium", getStarColor(member.averageRating))}>
              <Star className="h-3 w-3 fill-current" />
              {member.averageRating.toFixed(1)}
            </span>
          )}
          {(member.extensionRequests ?? 0) > 0 && (
            <span className="inline-flex items-center gap-0.5 text-violet-600">
              <ArrowUpRight className="h-3 w-3" />
              {member.extensionRequests} ext.
            </span>
          )}
        </div>
      )}
    </button>
  )
}
