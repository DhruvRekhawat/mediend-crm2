import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-utils'
import { z } from 'zod'

const patchBody = z.object({
  name: z.string().min(1).max(500).optional(),
  address: z.string().max(10000).optional().nullable(),
  googleMapLink: z.string().max(2000).optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()
  if (!hasPermission(user, 'masters:write')) return forbiddenResponse()

  const { id } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const parsed = patchBody.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.flatten().formErrors.join(', ') || 'Invalid body', 400)
  }

  const data: Prisma.HospitalMasterUpdateInput = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim()
  if (parsed.data.address !== undefined) data.address = parsed.data.address?.trim() || null
  if (parsed.data.googleMapLink !== undefined) {
    data.googleMapLink =
      parsed.data.googleMapLink === '' ? null : parsed.data.googleMapLink ?? null
  }
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive

  try {
    const updated = await prisma.hospitalMaster.update({
      where: { id },
      data,
    })
    return successResponse({ item: updated })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return errorResponse('Hospital not found', 404)
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return errorResponse('A hospital with this name already exists', 409)
    }
    throw e
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()
  if (!hasPermission(user, 'masters:write')) return forbiddenResponse()

  const { id } = await context.params

  try {
    const updated = await prisma.hospitalMaster.update({
      where: { id },
      data: { isActive: false },
    })
    return successResponse({ item: updated })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return errorResponse('Hospital not found', 404)
    }
    throw e
  }
}
