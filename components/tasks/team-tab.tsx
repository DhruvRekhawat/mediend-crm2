"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, UserPlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useMDTeamOverview, type MDTeamOverviewMember } from "@/hooks/use-md-team"
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

export function TeamTab() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [addPersonOpen, setAddPersonOpen] = useState(false)

  const { data, isLoading, isError, error } = useMDTeamOverview(search || undefined)
  const members = data?.members ?? []

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
        <div className="divide-y divide-border rounded-lg overflow-hidden">
          {members.map((member, index) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              index={index}
              onClick={() => router.push(`/md/tasks/team/${member.id}`)}
            />
          ))}
        </div>
      )}

      <AddPersonDialog open={addPersonOpen} onOpenChange={setAddPersonOpen} />
    </div>
  )
}

function TeamMemberRow({
  member,
  index,
  onClick,
}: {
  member: MDTeamOverviewMember
  index: number
  onClick: () => void
}) {
  const isIn = member.attendanceStatus === "in"
  const isLeave = member.attendanceStatus === "leave"
  const isEven = index % 2 === 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[44px] w-full text-left py-3 px-3 transition-colors active:bg-muted/50",
        "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation",
        isEven ? "bg-muted/20" : "bg-background"
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className={cn("font-medium text-sm", getAvatarColor(member.name).bg, getAvatarColor(member.name).text)}>
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-[220px]">
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
          <div className="mt-1 flex flex-wrap gap-2">
            <span className="text-sm md:text-xs text-muted-foreground">
              {member.taskCount} task{member.taskCount !== 1 ? "s" : ""}
            </span>
            {member.overdueCount > 0 && (
              <span className="text-sm md:text-xs font-medium text-red-600 dark:text-red-400">
                {member.overdueCount} overdue
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
