import { UserRole } from '@prisma/client'
import { SessionUser } from './auth'

export type Permission = 
  | 'leads:read'
  | 'leads:write'
  | 'leads:assign'
  | 'targets:read'
  | 'targets:write'
  | 'analytics:read'
  | 'users:read'
  | 'users:write'
  | 'insurance:read'
  | 'insurance:write'
  | 'pl:read'
  | 'pl:write'
  | 'reports:export'

const rolePermissions: Record<UserRole, Permission[]> = {
  MD: [
    'leads:read',
    'analytics:read',
    'reports:export',
    'users:read',
    'insurance:read',
    'pl:read',
  ],
  SALES_HEAD: [
    'leads:read',
    'leads:write',
    'leads:assign',
    'targets:read',
    'targets:write',
    'analytics:read',
    'reports:export',
  ],
  TEAM_LEAD: [
    'leads:read',
    'leads:write',
    'leads:assign',
    'targets:read',
    'analytics:read',
  ],
  BD: [
    'leads:read',
    'leads:write',
    'targets:read',
    'analytics:read',
  ],
  INSURANCE_HEAD: [
    'leads:read',
    'insurance:read',
    'insurance:write',
    'analytics:read',
  ],
  PL_HEAD: [
    'leads:read',
    'pl:read',
    'pl:write',
    'analytics:read',
  ],
  HR_HEAD: [
    'users:read',
    'users:write',
    'analytics:read',
  ],
  ADMIN: [
    'leads:read',
    'leads:write',
    'leads:assign',
    'targets:read',
    'targets:write',
    'analytics:read',
    'users:read',
    'users:write',
    'insurance:read',
    'insurance:write',
    'pl:read',
    'pl:write',
    'reports:export',
  ],
}

export function hasPermission(user: SessionUser | null, permission: Permission): boolean {
  if (!user) return false
  const permissions = rolePermissions[user.role] || []
  return permissions.includes(permission)
}

export function canAccessLead(user: SessionUser | null, leadBdId: string, leadTeamId?: string | null): boolean {
  if (!user) return false

  // MD, Sales Head, Insurance Head, PL Head can access all leads
  if (['MD', 'SALES_HEAD', 'INSURANCE_HEAD', 'PL_HEAD', 'ADMIN'].includes(user.role)) {
    return true
  }

  // Team Lead can access leads from their team
  if (user.role === 'TEAM_LEAD' && leadTeamId && user.teamId === leadTeamId) {
    return true
  }

  // BD can only access their own leads
  if (user.role === 'BD' && user.id === leadBdId) {
    return true
  }

  return false
}

export function canManageTeam(user: SessionUser | null, teamSalesHeadId?: string): boolean {
  if (!user) return false

  if (['MD', 'ADMIN'].includes(user.role)) {
    return true
  }

  if (user.role === 'SALES_HEAD' && teamSalesHeadId === user.id) {
    return true
  }

  return false
}

