import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params

    // Get department with head
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        head: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    if (!department) {
      return errorResponse('Department not found', 404)
    }

    // Get all employees in this department
    const employees = await prisma.employee.findMany({
      where: { departmentId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    // Organize by hierarchy
    const teamLeads = employees.filter((e) => e.user.role === 'TEAM_LEAD')
    const users = employees.filter((e) => e.user.role === 'USER' || e.user.role === 'BD')

    // For each TL, get their users (this is simplified - in real scenario you might have team assignments)
    const hierarchy = {
      department: {
        id: department.id,
        name: department.name,
        description: department.description,
      },
      head: department.head,
      teamLeads: teamLeads.map((tl) => ({
        id: tl.id,
        user: tl.user,
        employeeCode: tl.employeeCode,
        // In a real scenario, you'd link users to TLs via teams or assignments
        // For now, we'll just show all users/BDs
        members: users.map((u) => ({
          id: u.id,
          user: u.user,
          employeeCode: u.employeeCode,
        })),
      })),
      // Users/BDs not assigned to any TL
      unassignedUsers: users.map((u) => ({
        id: u.id,
        user: u.user,
        employeeCode: u.employeeCode,
      })),
      stats: {
        totalEmployees: employees.length,
        teamLeads: teamLeads.length,
        users: users.length,
      },
    }

    return successResponse(hierarchy)
  } catch (error) {
    console.error('Error fetching department hierarchy:', error)
    return errorResponse('Failed to fetch department hierarchy', 500)
  }
}
