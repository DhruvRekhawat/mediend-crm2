import { NextRequest, NextResponse } from 'next/server'
import { SessionUser } from './auth'
import { Permission, hasPermission } from './rbac'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export function successResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  })
}

export function errorResponse(error: string, status: number = 400): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  )
}

export function unauthorizedResponse(): NextResponse<ApiResponse> {
  return errorResponse('Unauthorized', 401)
}

export function forbiddenResponse(): NextResponse<ApiResponse> {
  return errorResponse('Forbidden', 403)
}

// Simple session storage (in production, use proper session management)
// For now, we'll use a simple approach with cookies or headers
export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  // TODO: Implement proper session management
  // For now, this is a placeholder
  // In production, use JWT tokens, cookies, or session storage
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  // This should be replaced with actual session validation
  // For MVP, we'll implement a simple token-based approach
  return null
}

export async function requireAuth(request: NextRequest): Promise<SessionUser> {
  const user = await getSessionUser(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<SessionUser> {
  const user = await requireAuth(request)
  if (!hasPermission(user, permission)) {
    throw new Error('Forbidden')
  }
  return user
}

