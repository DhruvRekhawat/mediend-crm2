import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'
import { ApplicationStatus } from '@prisma/client'

const createPostingSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  department: z.string().optional(),
  requirements: z.string().optional(),
})

const updateApplicationSchema = z.object({
  status: z.enum(['PENDING', 'SHORTLISTED', 'REJECTED', 'HIRED']),
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
    const { title, description, department, requirements } = createPostingSchema.parse(body)

    const posting = await prisma.internalJobPosting.create({
      data: {
        title,
        description,
        department: department || null,
        requirements: requirements || null,
      },
    })

    return successResponse(posting, 'Job posting created successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid data', 400)
    }
    console.error('Error creating job posting:', error)
    return errorResponse('Failed to create job posting', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    const includeApplications = searchParams.get('applications') === 'true'

    const where = activeOnly ? { isActive: true } : {}

    const postings = await prisma.internalJobPosting.findMany({
      where,
      include: includeApplications ? {
        applications: {
          include: {
            referrer: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      } : undefined,
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(postings)
  } catch (error) {
    console.error('Error fetching job postings:', error)
    return errorResponse('Failed to fetch job postings', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const postingId = searchParams.get('postingId')
    const applicationId = searchParams.get('applicationId')

    // Update posting status (active/inactive)
    if (postingId) {
      const body = await request.json()
      const isActive = body.isActive as boolean

      const posting = await prisma.internalJobPosting.update({
        where: { id: postingId },
        data: { isActive },
      })

      return successResponse(posting, 'Posting updated')
    }

    // Update application status
    if (applicationId) {
      const body = await request.json()
      const { status } = updateApplicationSchema.parse(body)

      const application = await prisma.iJPApplication.update({
        where: { id: applicationId },
        data: { status },
        include: {
          referrer: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })

      return successResponse(application, 'Application updated')
    }

    return errorResponse('Posting ID or Application ID required', 400)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid data', 400)
    }
    console.error('Error updating:', error)
    return errorResponse('Failed to update', 500)
  }
}

