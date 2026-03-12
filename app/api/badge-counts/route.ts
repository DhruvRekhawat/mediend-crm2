import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LedgerStatus } from '@/generated/prisma/client'

export interface BadgeCounts {
  pendingFinanceApprovals: number
  unreadMessages: number
  pendingAppointments: number
  pendingTaskReviews: number
  pendingDueDateApprovals: number
  myOverdueTasks: number
  myPendingTasks: number
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const isMdOrAdmin = user.role === 'MD' || user.role === 'ADMIN'
    const now = new Date()

    const counts: BadgeCounts = {
      pendingFinanceApprovals: 0,
      unreadMessages: 0,
      pendingAppointments: 0,
      pendingTaskReviews: 0,
      pendingDueDateApprovals: 0,
      myOverdueTasks: 0,
      myPendingTasks: 0,
    }

    const promises: Promise<unknown>[] = []

    // Finance approvals: only for users with finance:approve
    if (hasPermission(user, 'finance:approve')) {
      promises.push(
        prisma.ledgerEntry
          .count({
            where: {
              isDeleted: false,
              status: LedgerStatus.PENDING,
              transactionType: 'DEBIT',
            },
          })
          .then((c) => {
            counts.pendingFinanceApprovals = c
          })
      )
      promises.push(
        prisma.ledgerEntry
          .count({
            where: {
              isDeleted: false,
              status: LedgerStatus.APPROVED,
              editRequestStatus: LedgerStatus.PENDING,
            },
          })
          .then((c) => {
            counts.pendingFinanceApprovals += c
          })
      )
    }

    // Anonymous messages (MD/ADMIN only)
    if (isMdOrAdmin) {
      promises.push(
        prisma.anonymousMessage.count({ where: { isRead: false } }).then((c) => {
          counts.unreadMessages = c
        })
      )
      promises.push(
        prisma.mDAppointment.count({ where: { status: 'PENDING' } }).then((c) => {
          counts.pendingAppointments = c
        })
      )
    }

    // Task reviews: EMPLOYEE_DONE tasks (MD/ADMIN see all, others see only tasks they created)
    if (isMdOrAdmin) {
      promises.push(
        prisma.task.count({ where: { status: 'EMPLOYEE_DONE' } }).then((c) => {
          counts.pendingTaskReviews = c
        })
      )
    } else {
      promises.push(
        prisma.task
          .count({
            where: { status: 'EMPLOYEE_DONE', createdById: user.id },
          })
          .then((c) => {
            counts.pendingTaskReviews = c
          })
      )
    }

    // Due date approvals (MD/ADMIN see all PENDING, others only where they created the task)
    if (isMdOrAdmin) {
      promises.push(
        prisma.taskDueDateApproval.count({ where: { status: 'PENDING' } }).then((c) => {
          counts.pendingDueDateApprovals = c
        })
      )
    } else {
      promises.push(
        prisma.taskDueDateApproval.count({
          where: { status: 'PENDING', task: { createdById: user.id } },
        }).then((c) => {
          counts.pendingDueDateApprovals = c
        })
      )
    }

    // My overdue tasks: assigned to me, status PENDING or IN_PROGRESS, dueDate < now
    promises.push(
      prisma.task.count({
        where: {
          assigneeId: user.id,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: now },
        },
      }).then((c) => {
        counts.myOverdueTasks = c
      })
    )

    // My pending tasks: assigned to me, not completed
    promises.push(
      prisma.task.count({
        where: {
          assigneeId: user.id,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }).then((c) => {
        counts.myPendingTasks = c
      })
    )

    await Promise.all(promises)

    return successResponse(counts)
  } catch (error) {
    console.error('Error fetching badge counts:', error)
    return errorResponse('Failed to fetch badge counts', 500)
  }
}
