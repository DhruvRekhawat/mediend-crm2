"use client"

import { useState } from "react"
import { Search, UserPlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useMDTeamOverview, type MDTeamOverviewMember } from "@/hooks/use-md-team"
import { TeamMemberDetail } from "./team-member-detail"
import { AddPersonDialog } from "./add-person-dialog"
import { cn } from "@/lib/utils"

export function TeamTab() {
  const [search, setSearch] = useState("")
  const [selectedMember, setSelectedMember] = useState<MDTeamOverviewMember | null>(null)
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading team…
        </div>
      ) : members.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {search ? "No team members match your search." : "No team members yet. Add people to get started."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {members.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              onClick={() => setSelectedMember(member)}
            />
          ))}
        </div>
      )}

      <TeamMemberDetail
        member={selectedMember}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        onAssignTask={() => {
          // Parent can scroll to / focus task input with prefill; for now just close
          setSelectedMember(null)
        }}
      />

      <AddPersonDialog open={addPersonOpen} onOpenChange={setAddPersonOpen} />
    </div>
  )
}

function TeamMemberCard({
  member,
  onClick,
}: {
  member: MDTeamOverviewMember
  onClick: () => void
}) {
  const isIn = member.attendanceStatus === "in"
  const isLeave = member.attendanceStatus === "leave"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[44px] sm:min-h-[72px] w-full text-left rounded-xl border bg-card p-3 shadow-sm transition-colors active:scale-[0.99]",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{member.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {member.designation || member.role || member.department?.name || "—"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-xs font-medium",
              isLeave && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
              isIn && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
              !isIn && !isLeave && "bg-muted text-muted-foreground"
            )}
          >
            {isLeave ? "Leave" : isIn ? "IN" : "OUT"}
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {member.taskCount} task{member.taskCount !== 1 ? "s" : ""}
        </span>
        {member.overdueCount > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-200">
            {member.overdueCount} overdue
          </span>
        )}
      </div>
    </button>
  )
}
