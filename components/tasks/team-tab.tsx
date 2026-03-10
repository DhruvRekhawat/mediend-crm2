"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, UserPlus, AlertTriangle, Star, ArrowUpRight } from "lucide-react"
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

const TEAM_CARD_COLORS = [
  "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/30 dark:border-l-blue-400",
  "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-l-emerald-400",
  "border-l-violet-500 bg-violet-50/50 dark:bg-violet-950/30 dark:border-l-violet-400",
  "border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/30 dark:border-l-rose-400",
  "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/30 dark:border-l-amber-400",
  "border-l-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30 dark:border-l-cyan-400",
  "border-l-pink-500 bg-pink-50/50 dark:bg-pink-950/30 dark:border-l-pink-400",
  "border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-l-indigo-400",
] as const

function getTeamCardColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TEAM_CARD_COLORS[Math.abs(hash) % TEAM_CARD_COLORS.length]
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
        <div className="grid gap-3 mt-4">
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
        "rounded-lg border border-l-4 shadow-sm w-full text-left p-3 transition-colors",
        "hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation active:opacity-90",
        getTeamCardColor(member.name)
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className={cn("font-medium text-sm", getAvatarColor(member.name).bg, getAvatarColor(member.name).text)}>
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-base md:text-sm truncate">{member.name}</p>
              <p className="text-sm md:text-xs text-muted-foreground truncate">
                {member.designation || member.role || member.department?.name || "—"}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
                isLeave && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
                isIn && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
                !isIn && !isLeave && "bg-muted text-muted-foreground"
              )}
            >
              {isLeave ? "Leave" : isIn ? "IN" : "OUT"}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 items-center">
            <span
              className={cn(
                "text-sm md:text-xs",
                member.taskCount === 0 && "text-green-600 dark:text-green-400",
                member.taskCount > 0 && "text-amber-600 dark:text-amber-400 font-medium"
              )}
            >
              {member.taskCount} task{member.taskCount !== 1 ? "s" : ""}
            </span>
            {member.overdueCount > 0 && (
              <span className="text-sm md:text-xs font-medium text-red-600 dark:text-red-400">
                {member.overdueCount} overdue
              </span>
            )}
            {member.averageRating != null && (
              <span className={cn("inline-flex items-center gap-0.5 text-sm md:text-xs font-medium", getStarColor(member.averageRating))}>
                <Star className="h-3 w-3 fill-current" />
                {member.averageRating.toFixed(1)}
              </span>
            )}
            {member.extensionRequests > 0 && (
              <span className="inline-flex items-center gap-0.5 text-sm md:text-xs text-violet-600 dark:text-violet-400">
                <ArrowUpRight className="h-3 w-3" />
                {member.extensionRequests} ext.
              </span>
            )}
            {warningCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {warningCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
