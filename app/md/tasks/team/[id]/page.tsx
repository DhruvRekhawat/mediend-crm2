"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMDTeamOverview } from "@/hooks/use-md-team"
import { TeamMemberDetailContent } from "@/components/tasks/team-member-detail"

export default function MDTasksTeamMemberPage() {
  const params = useParams()
  const memberId = params.id as string

  const { data, isLoading, isError } = useMDTeamOverview()
  const member = data?.members.find((m) => m.id === memberId)

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-0 w-full max-w-5xl mx-auto px-2 md:px-0">
        <div className="py-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/md/tasks#team">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      </div>
    )
  }

  if (isError || !member) {
    return (
      <div className="flex flex-col min-h-0 w-full max-w-5xl mx-auto px-2 md:px-0">
        <div className="py-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/md/tasks#team">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
        <div className="py-8 text-center text-sm text-muted-foreground">
          {isError ? "Failed to load team member." : "Team member not found."}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-0 w-full max-w-5xl mx-auto px-2 md:px-0 pb-6">
      <div className="shrink-0 py-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/md/tasks#team">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to team
          </Link>
        </Button>
      </div>
      <TeamMemberDetailContent member={member} />
    </div>
  )
}
