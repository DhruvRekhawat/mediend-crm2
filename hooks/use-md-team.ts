import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/api-client"
import { format } from "date-fns"

export type TeamMemberSource = "team" | "watchlist" | "subordinate"
export type AttendanceStatus = "in" | "out" | "leave"

export interface MDTeamOverviewMember {
  id: string
  employeeId: string
  name: string
  email: string
  role: string
  designation: string | null
  department: { id: string; name: string } | null
  taskCount: number
  overdueCount: number
  completedCount: number
  averageRating: number | null
  extensionRequests: number
  attendanceStatus: AttendanceStatus
  inTime: string | null
  source: TeamMemberSource
}

interface MDTeamOverviewResponse {
  members: MDTeamOverviewMember[]
}

interface AttendanceApiRecord {
  employee: {
    id: string
  }
  inTime: string | null
  outTime: string | null
}

interface AttendanceApiResponse {
  data: AttendanceApiRecord[]
}

export interface TeamAttendanceSnapshot {
  status: Exclude<AttendanceStatus, "leave">
  inTime: string | null
  outTime: string | null
}

export function useMDTeamOverview(search?: string) {
  const queryString = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""
  return useQuery<MDTeamOverviewResponse>({
    queryKey: ["md-team-overview", search ?? ""],
    queryFn: () => apiGet<MDTeamOverviewResponse>(`/api/md/team-overview${queryString}`),
  })
}

export function useTodayTeamAttendance() {
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  return useQuery<Record<string, TeamAttendanceSnapshot>>({
    queryKey: ["team-attendance-today", today],
    queryFn: async () => {
      const params = new URLSearchParams({
        fromDate: today,
        toDate: today,
        page: "1",
        limit: "10000",
      })
      const response = await apiGet<AttendanceApiResponse>(`/api/attendance?${params.toString()}`)
      const byEmployeeId: Record<string, TeamAttendanceSnapshot> = {}

      for (const record of response.data) {
        byEmployeeId[record.employee.id] = {
          status: record.inTime && !record.outTime ? "in" : "out",
          inTime: record.inTime,
          outTime: record.outTime,
        }
      }

      return byEmployeeId
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
