import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LedgerStatus, LeaveRequestStatus } from '@/generated/prisma/client'

export interface BadgeCounts {
  pendingFinanceApprovals: number
  unreadMessages: number
  pendingAppointments: number
  pendingTaskReviews: number
  pendingDueDateApprovals: number
  myOverdueTasks: number
  myPendingTasks: number
  pendingLeaveApprovals: number
  pendingTickets: number
  unreadChatMessages: number
  pendingHRActions: number
  pendingNotices: number
  pendingFinanceTeamApprovals: number
  pendingMDApprovals: number
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
      pendingLeaveApprovals: 0,
      pendingTickets: 0,
      unreadChatMessages: 0,
      pendingHRActions: 0,
      pendingNotices: 0,
      pendingFinanceTeamApprovals: 0,
      pendingMDApprovals: 0,
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

    // Pending leave approvals: user is target approver or has HR leave permissions
    if (hasPermission(user, 'hrms:leaves:write') || hasPermission(user, 'hierarchy:leave:approve')) {
      const empPromise = prisma.employee.findUnique({
        where: { userId: user.id },
        select: { id: true },
      })
      const hrOverride = hasPermission(user, 'hrms:leaves:write')
      promises.push(
        empPromise.then(async (employee) => {
          const leaveWhere: { status: (typeof LeaveRequestStatus)[keyof typeof LeaveRequestStatus]; targetApproverId?: string } = { status: LeaveRequestStatus.PENDING }
          if (!hrOverride && employee) {
            leaveWhere.targetApproverId = employee.id
          } else if (!hrOverride) {
            return
          }
          const c = await prisma.leaveRequest.count({ where: leaveWhere })
          counts.pendingLeaveApprovals = c
        })
      )
    }

    // Pending tickets: for department heads, tickets targeted at their role
    const headRoles = ['HR_HEAD', 'FINANCE_HEAD', 'SALES_HEAD', 'INSURANCE_HEAD', 'PL_HEAD', 'OUTSTANDING_HEAD', 'DIGITAL_MARKETING_HEAD', 'IT_HEAD']
    if (headRoles.includes(user.role)) {
      promises.push(
        prisma.supportTicket.count({
          where: { status: 'OPEN', targetHeadRole: user.role },
        }).then((c) => {
          counts.pendingTickets = c
        })
      )
    }

    // Unread chat messages: CASE_CHAT_MESSAGE notifications for BD/Insurance/PL
    const chatRoles = ['BD', 'INSURANCE', 'INSURANCE_HEAD', 'PL_HEAD', 'PL_ENTRY', 'PL_VIEWER', 'ACCOUNTS']
    if (chatRoles.includes(user.role) || user.role === 'ADMIN') {
      promises.push(
        prisma.notification.count({
          where: {
            userId: user.id,
            type: 'CASE_CHAT_MESSAGE',
            isRead: false,
          },
        }).then((c) => {
          counts.unreadChatMessages = c
        })
      )
    }

    // Pending HR actions: feedback + increment + normalization (for HR_HEAD)
    if (user.role === 'HR_HEAD') {
      promises.push(
        Promise.all([
          prisma.feedback.count({ where: { status: 'PENDING' } }),
          prisma.incrementRequest.count({ where: { status: 'PENDING' } }),
          prisma.attendanceNormalization.count({
            where: { type: 'MANAGER', status: 'PENDING' },
          }),
        ]).then(([f, i, n]) => {
          counts.pendingHRActions = f + i + n
        })
      )
    }

    // Pending notices: unacknowledged notices for user
    promises.push(
      prisma.noticeRecipient.count({
        where: { userId: user.id, acknowledgedAt: null },
      }).then((c) => {
        counts.pendingNotices = c
      })
    )

    // Pending finance team approvals: MD-approved requests with amount needing finance ack
    if (user.role === 'FINANCE_HEAD') {
      promises.push(
        prisma.mDApprovalRequest.count({
          where: {
            status: 'APPROVED',
            amount: { not: null },
            financeAcknowledged: false,
          },
        }).then((c) => {
          counts.pendingFinanceTeamApprovals = c
        })
      )
    }

    // Pending MD approvals
    if (user.role === 'MD' || user.role === 'ADMIN') {
      promises.push(
        prisma.mDApprovalRequest.count({ where: { status: 'PENDING' } }).then((c) => {
          counts.pendingMDApprovals = c
        })
      )
    }

    await Promise.all(promises)

    return successResponse(counts)
  } catch (error) {
    console.error('Error fetching badge counts:', error)
    return errorResponse('Failed to fetch badge counts', 500)
  }
}
