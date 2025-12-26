import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { PartyType, Prisma } from '@prisma/client'

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
    const partyType = searchParams.get('partyType') as PartyType | null
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Prisma.PartyMasterWhereInput = {}

    if (partyType) {
      where.partyType = partyType
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { gstNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [parties, total] = await Promise.all([
      prisma.partyMaster.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.partyMaster.count({ where }),
    ])

    return successResponse({
      data: parties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching parties:', error)
    return errorResponse('Failed to fetch parties', 500)
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
    const {
      name,
      partyType,
      contactName,
      contactEmail,
      contactPhone,
      gstNumber,
      panNumber,
      address,
    } = body

    if (!name || !partyType) {
      return errorResponse('Name and party type are required', 400)
    }

    if (!Object.values(PartyType).includes(partyType)) {
      return errorResponse('Invalid party type', 400)
    }

    const party = await prisma.partyMaster.create({
      data: {
        name,
        partyType,
        contactName,
        contactEmail,
        contactPhone,
        gstNumber,
        panNumber,
        address,
      },
    })

    return successResponse(party, 'Party created successfully')
  } catch (error) {
    console.error('Error creating party:', error)
    return errorResponse('Failed to create party', 500)
  }
}

