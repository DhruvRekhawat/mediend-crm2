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
  projectId?: string | null
  startTime: string | null
  endTime: string | null
  allDay: boolean
  createdAt: string
  updatedAt: string
  assignee?: { id: string; name: string; email: string }
  createdBy?: { id: string; name: string }
  project?: { id: string; name: string } | null
}

export interface TasksQueryParams {
  assigneeId?: string
  createdById?: string
  status?: string
  startDate?: string
  endDate?: string
}

export interface TaskProject {
  id: string
  name: string
  createdById?: string
  createdAt?: string
  _count?: { tasks: number }
}

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: string
  user: { id: string; name: string; email: string }
}

export interface TaskActivityLog {
  id: string
  taskId: string
  userId: string
  action: string
  details: string | null
  createdAt: string
  user: { id: string; name: string }
}

export interface TaskStats {
  total: number
  completed: number
  pending: number
  overdue: number
  projectWise: { projectId: string | null; projectName: string; count: number }[]
  employeeWise: { assigneeId: string; assigneeName: string; total: number; completed: number }[]
}

export function useTasks(
  params?: TasksQueryParams,
  options?: { enabled?: boolean }
) {
  const searchParams = new URLSearchParams()
  if (params?.assigneeId) searchParams.set("assigneeId", params.assigneeId)
  if (params?.createdById) searchParams.set("createdById", params.createdById)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.startDate) searchParams.set("startDate", params.startDate)
  if (params?.endDate) searchParams.set("endDate", params.endDate)

  const queryString = searchParams.toString()

  return useQuery<Task[]>({
    queryKey: ["tasks", params?.assigneeId, params?.createdById, params?.status, params?.startDate, params?.endDate],
    queryFn: () =>
      apiGet<Task[]>(`/api/tasks${queryString ? `?${queryString}` : ""}`),
    enabled: options?.enabled !== false,
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
  description?: string | null
  dueDate?: string | null
  priority?: "GENERAL" | "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  assigneeId?: string
  projectId?: string | null
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
      queryClient.invalidateQueries({ queryKey: ["md-team-overview"] })
    },
  })
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  dueDate?: string | null
  /** Required when requesting a due date change (employee flow). */
  dueDateChangeReason?: string
  priority?: "GENERAL" | "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  projectId?: string | null
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
  reason: string
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

export function useTaskProjects() {
  return useQuery<TaskProject[]>({
    queryKey: ["task-projects"],
    queryFn: () => apiGet<TaskProject[]>("/api/task-projects"),
  })
}

export function useCreateTaskProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) =>
      apiPost<TaskProject>("/api/task-projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-projects"] })
    },
  })
}

export function useTaskComments(taskId: string | null) {
  return useQuery<TaskComment[]>({
    queryKey: ["tasks", taskId, "comments"],
    queryFn: () => apiGet<TaskComment[]>(`/api/tasks/${taskId}/comments`),
    enabled: !!taskId,
  })
}

export function useCreateTaskComment(taskId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      apiPost<TaskComment>(`/api/tasks/${taskId}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", taskId, "comments"] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useTaskActivity(taskId: string | null) {
  return useQuery<TaskActivityLog[]>({
    queryKey: ["tasks", taskId, "activity"],
    queryFn: () => apiGet<TaskActivityLog[]>(`/api/tasks/${taskId}/activity`),
    enabled: !!taskId,
  })
}

export function useTaskStats() {
  return useQuery<TaskStats>({
    queryKey: ["tasks", "stats"],
    queryFn: () => apiGet<TaskStats>("/api/tasks/stats"),
  })
}

export function useSubordinateTasks() {
  return useQuery<Task[]>({
    queryKey: ["tasks", "subordinates"],
    queryFn: () => apiGet<Task[]>("/api/tasks/subordinates"),
  })
}

export interface AssignableUser {
  id: string
  name: string
  email: string
}

export function useAssignableUsers() {
  return useQuery<AssignableUser[]>({
    queryKey: ["tasks", "assignable-users"],
    queryFn: () => apiGet<AssignableUser[]>("/api/tasks/assignable-users"),
  })
}
