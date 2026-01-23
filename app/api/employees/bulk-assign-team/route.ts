import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const bulkAssignSchema = z.object({
  employeeIds: z.array(z.string()).min(1),
  teamId: z.string().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const { employeeIds, teamId } = bulkAssignSchema.parse(body)

    // If teamId is provided, verify it exists
    if (teamId) {
      const team = await prisma.departmentTeam.findUnique({
        where: { id: teamId },
        include: {
          department: {
            select: {
              id: true,
            },
          },
        },
      })

      if (!team) {
        return errorResponse('Team not found', 404)
      }

      // Verify all employees are in the same department as the team
      const employees = await prisma.employee.findMany({
        where: {
          id: { in: employeeIds },
        },
        include: {
          department: {
            select: {
              id: true,
            },
          },
        },
      })

      if (employees.length !== employeeIds.length) {
        return errorResponse('Some employees not found', 400)
      }

      // Check if all employees are in the same department as the team
      const invalidEmployees = employees.filter(
        (emp) => !emp.departmentId || emp.departmentId !== team.departmentId
      )

      if (invalidEmployees.length > 0) {
        return errorResponse(
          'All employees must be in the same department as the team',
          400
        )
      }
    }

    // Update all employees
    await prisma.employee.updateMany({
      where: {
        id: { in: employeeIds },
      },
      data: {
        teamId: teamId || null,
      },
    })

    // Fetch updated employees
    const updatedEmployees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        team: {
          include: {
            teamLead: {
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
            },
          },
        },
      },
    })

    return successResponse(updatedEmployees, 'Employees assigned to team successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error assigning employees to team:', error)
    return errorResponse('Failed to assign employees to team', 500)
  }
}
