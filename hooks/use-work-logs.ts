import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import {
  apiGet,
  apiPost,
} from "@/lib/api-client"
import { startOfDay, endOfDay, format } from "date-fns"

export interface WorkLog {
  id: string
  employeeId: string
  logDate: string
  intervalStart: number
  intervalEnd: number
  description: string
  createdAt: string
}

export interface WorkLogCheckResult {
  complete: boolean
  isBlocked: boolean
  missingIntervals: { start: number; end: number; deadline: string }[]
  isExempt: boolean
  loggedIntervals: number[]
}

export function useWorkLogs(startDate: Date, endDate: Date, employeeId?: string) {
  const start = format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
  const end = format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
  const params = new URLSearchParams({ startDate: start, endDate: end })
  if (employeeId) params.set("employeeId", employeeId)

  return useQuery<WorkLog[]>({
    queryKey: ["work-logs", start, end, employeeId],
    queryFn: () => apiGet<WorkLog[]>(`/api/work-logs?${params.toString()}`),
  })
}

export function useWorkLogCheck(date?: Date) {
  const params = date
    ? `?date=${format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")}`
    : ""

  return useQuery<WorkLogCheckResult>({
    queryKey: ["work-logs", "check", date?.toISOString() ?? "now"],
    queryFn: () => apiGet<WorkLogCheckResult>(`/api/work-logs/check${params}`),
    refetchInterval: 60000,
  })
}

export interface CreateWorkLogInput {
  logDate: string
  intervalStart: 9 | 12 | 15
  intervalEnd: 12 | 15 | 18
  description: string
}

export function useCreateWorkLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateWorkLogInput) =>
      apiPost<WorkLog>("/api/work-logs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-logs"] })
      queryClient.invalidateQueries({ queryKey: ["work-logs", "check"] })
    },
  })
}
