import { prisma } from '@/lib/prisma'

/**
 * Initialize leave balances for an employee
 * Creates leave balance records for all active leave types with maxDays as allocated
 */
export async function initializeLeaveBalances(employeeId: string): Promise<void> {
  // Get all active leave types
  const leaveTypes = await prisma.leaveTypeMaster.findMany({
    where: {
      isActive: true,
    },
  })

  // Create leave balance for each leave type
  for (const leaveType of leaveTypes) {
    // Check if balance already exists
    const existing = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId: {
          employeeId,
          leaveTypeId: leaveType.id,
        },
      },
    })

    if (!existing) {
      await prisma.leaveBalance.create({
        data: {
          employeeId,
          leaveTypeId: leaveType.id,
          allocated: leaveType.maxDays,
          used: 0,
          remaining: leaveType.maxDays,
        },
      })
    }
  }
}

/**
 * Ensure leave balance exists, create if missing
 */
export async function ensureLeaveBalance(
  employeeId: string,
  leaveTypeId: string
): Promise<void> {
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId: {
        employeeId,
        leaveTypeId,
      },
    },
  })

  if (!balance) {
    // Get leave type to get maxDays
    const leaveType = await prisma.leaveTypeMaster.findUnique({
      where: { id: leaveTypeId },
    })

    if (leaveType) {
      await prisma.leaveBalance.create({
        data: {
          employeeId,
          leaveTypeId,
          allocated: leaveType.maxDays,
          used: 0,
          remaining: leaveType.maxDays,
        },
      })
    }
  }
}

