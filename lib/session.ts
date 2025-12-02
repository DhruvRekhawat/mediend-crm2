import { cookies } from 'next/headers'
import { SessionUser } from './auth'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const SESSION_COOKIE_NAME = 'mediend_session'

export interface SessionToken {
  userId: string
  email: string
  role: string
  teamId?: string | null
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return token
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionToken
    return {
      id: decoded.userId,
      email: decoded.email,
      name: '', // Will be fetched from DB if needed
      role: decoded.role as SessionUser['role'],
      teamId: decoded.teamId || null,
    }
  } catch (error) {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export function getSessionFromRequest(request: Request): SessionUser | null {
  // For API routes, extract from Authorization header or cookie
  const authHeader = request.headers.get('authorization')
  const cookieHeader = request.headers.get('cookie')
  
  let token: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)
    token = cookies[SESSION_COOKIE_NAME] || null
  }

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionToken
    return {
      id: decoded.userId,
      email: decoded.email,
      name: '',
      role: decoded.role as SessionUser['role'],
      teamId: decoded.teamId || null,
    }
  } catch (error) {
    return null
  }
}

