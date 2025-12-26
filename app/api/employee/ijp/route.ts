import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const referralSchema = z.object({
  postingId: z.string(),
  candidateName: z.string().min(2),
  candidateEmail: z.string().email().optional(),
  candidatePhone: z.string().optional(),
  resumeUrl: z.string().url(),
  description: z.string().optional(),
  documents: z.array(z.string().url()).max(3).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!employee) {
      return errorResponse('Employee record not found', 404)
    }

    const body = await request.json()
    const { postingId, candidateName, candidateEmail, candidatePhone, resumeUrl, description, documents } = referralSchema.parse(body)

    // Verify posting exists and is active
    const posting = await prisma.internalJobPosting.findUnique({
      where: { id: postingId },
    })

    if (!posting || !posting.isActive) {
      return errorResponse('Job posting not found or inactive', 404)
    }

    const application = await prisma.iJPApplication.create({
      data: {
        postingId,
        referredById: employee.id,
        candidateName,
        candidateEmail: candidateEmail || null,
        candidatePhone: candidatePhone || null,
        resumeUrl,
        description: description || null,
        documents: documents ?? undefined,
      },
      include: {
        posting: true,
      },
    })

    return successResponse(application, 'Referral submitted successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400)
    }
    console.error('Error submitting referral:', error)
    return errorResponse('Failed to submit referral', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!employee) {
      return errorResponse('Employee record not found', 404)
    }

    const applications = await prisma.iJPApplication.findMany({
      where: { referredById: employee.id },
      include: {
        posting: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(applications)
  } catch (error) {
    console.error('Error fetching referrals:', error)
    return errorResponse('Failed to fetch referrals', 500)
  }
}

