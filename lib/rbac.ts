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
  | 'hrms:read'
  | 'hrms:write'
  | 'hrms:attendance:read'
  | 'hrms:attendance:write'
  | 'hrms:leaves:read'
  | 'hrms:leaves:write'
  | 'hrms:payroll:read'
  | 'hrms:payroll:write'
  | 'hrms:employees:read'
  | 'hrms:employees:write'
  | 'finance:read'
  | 'finance:write'
  | 'finance:masters:write'
  | 'finance:approve'
  | 'departments:create'
  | 'departments:assign_head'
  | 'users:create_tl'
  | 'users:create_user'

const rolePermissions: Record<UserRole, Permission[]> = {
  MD: [
    'leads:read',
    'analytics:read',
    'reports:export',
    'users:read',
    'insurance:read',
    'pl:read',
    'finance:read',
    'finance:approve',
    'departments:create',
    'departments:assign_head',
    'users:create_tl',
    'users:create_user',
    'hrms:attendance:read',
    'hrms:employees:read',
  ],
  SALES_HEAD: [
    'leads:read',
    'leads:write',
    'leads:assign',
    'targets:read',
    'targets:write',
    'analytics:read',
    'reports:export',
    'users:read',
    'users:write',
    'departments:create',
    'users:create_tl',
    'users:create_user',
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
    'departments:create',
    'users:create_tl',
    'users:create_user',
  ],
  PL_HEAD: [
    'leads:read',
    'pl:read',
    'pl:write',
    'analytics:read',
    'departments:create',
    'users:create_tl',
    'users:create_user',
  ],
  HR_HEAD: [
    'users:read',
    'users:write',
    'analytics:read',
    'hrms:read',
    'hrms:write',
    'hrms:attendance:read',
    'hrms:attendance:write',
    'hrms:leaves:read',
    'hrms:leaves:write',
    'hrms:payroll:read',
    'hrms:payroll:write',
    'hrms:employees:read',
    'hrms:employees:write',
    'departments:create',
    'users:create_tl',
    'users:create_user',
  ],
  FINANCE_HEAD: [
    'analytics:read',
    'finance:read',
    'finance:write',
    'finance:masters:write',
    'departments:create',
    'users:create_tl',
    'users:create_user',
  ],
  OUTSTANDING_HEAD: [
    'leads:read',
    'pl:read',
    'pl:write',
    'analytics:read',
    'reports:export',
    'departments:create',
    'users:create_tl',
    'users:create_user',
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
    'hrms:read',
    'hrms:write',
    'hrms:attendance:read',
    'hrms:attendance:write',
    'hrms:leaves:read',
    'hrms:leaves:write',
    'hrms:payroll:read',
    'hrms:payroll:write',
    'hrms:employees:read',
    'hrms:employees:write',
    'finance:read',
    'finance:write',
    'finance:masters:write',
    'finance:approve',
    'departments:create',
    'departments:assign_head',
    'users:create_tl',
    'users:create_user',
  ],
  USER: [
    'hrms:read',
    'hrms:attendance:read',
    'hrms:leaves:read',
    'hrms:payroll:read',
    'hrms:employees:read',
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

// Hierarchy validation functions

const DEPT_HEAD_ROLES: UserRole[] = ['INSURANCE_HEAD', 'PL_HEAD', 'SALES_HEAD', 'HR_HEAD', 'FINANCE_HEAD']

export function isDepartmentHead(role: UserRole): boolean {
  return DEPT_HEAD_ROLES.includes(role)
}

export function canCreateDepartment(user: SessionUser | null): boolean {
  if (!user) return false
  return user.role === 'MD' || isDepartmentHead(user.role) || user.role === 'ADMIN'
}

export function canAssignDepartmentHead(user: SessionUser | null): boolean {
  if (!user) return false
  return user.role === 'MD' || user.role === 'ADMIN' || user.role === 'HR_HEAD'
}

export function canCreateRole(user: SessionUser | null, targetRole: UserRole): boolean {
  if (!user) return false

  // MD cannot be created by anyone
  if (targetRole === 'MD') {
    return false
  }

  // MD and ADMIN can create any role except MD
  if (user.role === 'MD' || user.role === 'ADMIN') {
    return true
  }

  // HR_HEAD can create department head roles when creating departments
  if (user.role === 'HR_HEAD') {
    return isDepartmentHead(targetRole) || targetRole === 'TEAM_LEAD' || targetRole === 'USER' || targetRole === 'BD'
  }

  // Department heads can create TL and USER/BD
  if (isDepartmentHead(user.role)) {
    return targetRole === 'TEAM_LEAD' || targetRole === 'USER' || targetRole === 'BD'
  }

  return false
}

export function getAvailableRolesForCreator(user: SessionUser | null): UserRole[] {
  if (!user) return []

  // MD cannot be created
  const allRolesExceptMD: UserRole[] = ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER']

  if (user.role === 'MD' || user.role === 'ADMIN') {
    return allRolesExceptMD
  }

  // HR_HEAD can create department head roles
  if (user.role === 'HR_HEAD') {
    return ['INSURANCE_HEAD', 'PL_HEAD', 'SALES_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'TEAM_LEAD', 'USER', 'BD']
  }

  if (isDepartmentHead(user.role)) {
    return ['TEAM_LEAD', 'USER', 'BD']
  }

  return []
}

