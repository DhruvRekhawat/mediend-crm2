import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { Prisma } from '@prisma/client'

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
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')
    const department = searchParams.get('department')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Prisma.HeadMasterWhereInput = {}

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    if (department) {
      where.department = department
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [heads, total] = await Promise.all([
      prisma.headMaster.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.headMaster.count({ where }),
    ])

    return successResponse({
      data: heads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching heads:', error)
    return errorResponse('Failed to fetch heads', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'finance:masters:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const { name, department, description } = body

    if (!name) {
      return errorResponse('Name is required', 400)
    }

    // Check for duplicate name
    const existing = await prisma.headMaster.findUnique({
      where: { name },
    })

    if (existing) {
      return errorResponse('Head with this name already exists', 400)
    }

    const head = await prisma.headMaster.create({
      data: {
        name,
        department,
        description,
      },
    })

    return successResponse(head, 'Head created successfully')
  } catch (error) {
    console.error('Error creating head:', error)
    return errorResponse('Failed to create head', 500)
  }
}

