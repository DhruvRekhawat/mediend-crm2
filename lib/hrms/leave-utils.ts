import { LeaveRequest, LeaveBalance, LeaveTypeMaster } from '@prisma/client'

export interface LeaveBalanceWithType extends LeaveBalance {
  leaveType: LeaveTypeMaster
}

export interface LeaveRequestWithDetails extends LeaveRequest {
  leaveType: LeaveTypeMaster
  employee: {
    id: string
    employeeCode: string
    user: {
      id: string
      name: string
      email: string
    }
  }
}

export function calculateLeaveDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Set time to midnight for accurate day calculation
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays + 1 // Inclusive of both start and end dates
}

export function validateLeaveBalance(
  balance: LeaveBalance | null,
  requestedDays: number
): { valid: boolean; error?: string } {
  if (!balance) {
    return { valid: false, error: 'Leave balance not found' }
  }

  if (balance.remaining < requestedDays) {
    return {
      valid: false,
      error: `Insufficient leave balance. Available: ${balance.remaining}, Requested: ${requestedDays}`,
    }
  }

  return { valid: true }
}

export function checkDateConflict(
  existingLeaves: LeaveRequest[],
  startDate: Date,
  endDate: Date
): { hasConflict: boolean; conflictingLeave?: LeaveRequest } {
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (const leave of existingLeaves) {
    if (leave.status !== 'APPROVED') continue

    const existingStart = new Date(leave.startDate)
    const existingEnd = new Date(leave.endDate)

    // Check for overlap
    if (
      (start >= existingStart && start <= existingEnd) ||
      (end >= existingStart && end <= existingEnd) ||
      (start <= existingStart && end >= existingEnd)
    ) {
      return { hasConflict: true, conflictingLeave: leave }
    }
  }

  return { hasConflict: false }
}

