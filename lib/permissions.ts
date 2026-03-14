import { prisma } from '@/lib/prisma'
import { getMDTeamAndWatchlistUserIds } from '@/lib/hierarchy'
import { FEATURE_KEYS } from '@/lib/feature-keys'

export { FEATURE_KEYS } from '@/lib/feature-keys'
export type { FeatureKey } from '@/lib/feature-keys'

/**
 * Check if user is in MD's task team or watchlist (any MD).
 */
async function isUserInMDTeamOrWatchlist(userId: string): Promise<boolean> {
  const mdUser = await prisma.user.findFirst({
    where: { role: 'MD' },
    select: { id: true },
  })
  if (!mdUser) return false
  const mdTeamIds = await getMDTeamAndWatchlistUserIds(mdUser.id)
  return mdTeamIds.includes(userId)
}

/**
 * Check if a user has a specific feature permission.
 * First checks UserFeaturePermission table for explicit toggle.
 * Falls back to role-based defaults (e.g. MD team members get md_approval_request by default).
 */
export async function hasFeaturePermission(
  userId: string,
  featureKey: string
): Promise<boolean> {
  const explicit = await prisma.userFeaturePermission.findUnique({
    where: { userId_featureKey: { userId, featureKey } },
    select: { enabled: true },
  })
  if (explicit !== null) {
    return explicit.enabled
  }

  // Role-based defaults
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!user) return false

  switch (featureKey) {
    case FEATURE_KEYS.MD_APPROVAL_REQUEST:
    case FEATURE_KEYS.CREATE_NOTICE: {
      if (user.role === 'MD' || user.role === 'ADMIN') return true
      return isUserInMDTeamOrWatchlist(userId)
    }
    default:
      return false
  }
}
