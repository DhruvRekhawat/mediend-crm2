import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { Prisma } from '@prisma/client'
import { generateSalesSerialNumber } from '@/lib/finance'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'finance:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const projectId = searchParams.get('projectId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Prisma.SalesEntryWhereInput = {
      isDeleted: false,
    }

    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { project: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (projectId) {
      where.projectId = projectId
    }

    if (startDate || endDate) {
      where.transactionDate = {}
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00.000Z`)
        where.transactionDate.gte = start
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999Z`)
        where.transactionDate.lte = end
      }
    }

    const [entries, total] = await Promise.all([
      prisma.salesEntry.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          transactionDate: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesEntry.count({ where }),
    ])

    return successResponse({
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching sales entries:', error)
    return errorResponse('Failed to fetch sales entries', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'finance:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const { transactionDate, projectId, description, amount, notes } = body

    // Validation
    if (!transactionDate || !projectId || !description || amount === undefined) {
      return errorResponse('Missing required fields', 400)
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return errorResponse('Amount must be a positive number', 400)
    }

    // Validate project exists and is active
    const project = await prisma.projectMaster.findUnique({
      where: { id: projectId },
    })

    if (!project || !project.isActive) {
      return errorResponse('Invalid or inactive project', 400)
    }

    // Generate serial number
    const serialNumber = await generateSalesSerialNumber()

    // Parse transaction date
    const date = transactionDate ? new Date(transactionDate) : new Date()

    // Create sales entry (no balance updates)
    const entry = await prisma.salesEntry.create({
      data: {
        serialNumber,
        transactionDate: date,
        projectId: projectId,
        description,
        amount,
        notes: notes || null,
        createdById: user.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return successResponse(entry, 'Sales entry created successfully')
  } catch (error) {
    console.error('Error creating sales entry:', error)
    return errorResponse('Failed to create sales entry', 500)
  }
}
