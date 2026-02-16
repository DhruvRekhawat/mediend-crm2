import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from "@/lib/api-client"

export interface Task {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  priority: string
  status: string
  assigneeId: string
  createdById: string
  startTime: string | null
  endTime: string | null
  allDay: boolean
  createdAt: string
  updatedAt: string
  assignee?: { id: string; name: string; email: string }
  createdBy?: { id: string; name: string }
}

export interface TasksQueryParams {
  assigneeId?: string
  status?: string
  startDate?: string
  endDate?: string
}

export function useTasks(params?: TasksQueryParams) {
  const searchParams = new URLSearchParams()
  if (params?.assigneeId) searchParams.set("assigneeId", params.assigneeId)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.startDate) searchParams.set("startDate", params.startDate)
  if (params?.endDate) searchParams.set("endDate", params.endDate)

  const queryString = searchParams.toString()

  return useQuery<Task[]>({
    queryKey: ["tasks", params],
    queryFn: () =>
      apiGet<Task[]>(`/api/tasks${queryString ? `?${queryString}` : ""}`),
  })
}

export function useTask(id: string | null) {
  return useQuery<Task>({
    queryKey: ["tasks", id],
    queryFn: () => apiGet<Task>(`/api/tasks/${id}`),
    enabled: !!id,
  })
}

export function usePendingTasks(assigneeId?: string) {
  const queryString = assigneeId ? `?assigneeId=${assigneeId}` : ""
  return useQuery<Task[]>({
    queryKey: ["tasks", "pending", assigneeId],
    queryFn: () => apiGet<Task[]>(`/api/tasks/pending${queryString}`),
  })
}

export interface CreateTaskInput {
  title: string
  dueDate?: string | null
  priority?: "GENERAL" | "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  assigneeId?: string
  startTime?: string | null
  endTime?: string | null
  allDay?: boolean
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTaskInput) => apiPost<Task>("/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export interface UpdateTaskInput {
  title?: string
  dueDate?: string | null
  priority?: "GENERAL" | "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  startTime?: string | null
  endTime?: string | null
  allDay?: boolean
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: UpdateTaskInput
    }) => apiPatch<Task>(`/api/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export interface TaskDueDateApproval {
  id: string
  taskId: string
  requestedById: string
  oldDueDate: string | null
  newDueDate: string | null
  status: string
  createdAt: string
  task: {
    id: string
    title: string
    assignee: { id: string; name: string; email: string }
  }
  requestedBy: { id: string; name: string; email: string }
}

export function useTaskApprovals() {
  return useQuery<TaskDueDateApproval[]>({
    queryKey: ["task-approvals"],
    queryFn: () => apiGet<TaskDueDateApproval[]>("/api/task-approvals"),
  })
}

export function useApproveTaskDueDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: "APPROVED" | "REJECTED"
    }) =>
      apiPatch<{ status: string }>(`/api/task-approvals/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-approvals"] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export type UpdateTaskDueDateResult =
  | Task
  | { message: string; approvalId: string }

export function useUpdateTaskDueDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dueDate }: { id: string; dueDate: string }) =>
      apiPatch<UpdateTaskDueDateResult>(`/api/tasks/${id}`, { dueDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}
