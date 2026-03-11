/**
 * API paths used for notification badges and notifications.
 * Use this list when whitelisting APIs (e.g. firewall, API gateway, proxy).
 *
 * All of these require authentication (session) – whitelist means "allow through"
 * to the app; auth is still enforced per-route.
 */

/** Badge counts (sidebar + mobile nav numbers) */
export const BADGE_APIS = [
  'GET /api/badge-counts',
] as const

/** Notification bell: list, unread count, mark read */
export const NOTIFICATION_APIS = [
  'GET /api/notifications',
  'GET /api/notifications/unread-count',
  'PATCH /api/notifications/:id/read',
  'PATCH /api/notifications/read-all',
] as const

/** All notification/badge-related APIs for whitelisting */
export const NOTIFICATION_AND_BADGE_APIS = [
  ...BADGE_APIS,
  ...NOTIFICATION_APIS,
] as const

/** Path patterns for regex/prefix matching (e.g. nginx, Cloudflare) */
export const NOTIFICATION_AND_BADGE_PATH_PATTERNS = [
  '/api/badge-counts',
  '/api/notifications',
] as const
