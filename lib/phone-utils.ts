/**
 * Masks a phone number completely for unauthorized users
 * Returns '—' instead of showing any digits
 */
export function maskPhoneNumber(phone?: string | null): string {
  return '—'
}

/**
 * Returns the appropriate phone display based on user permissions
 * @param phone - The phone number to display
 * @param canView - Whether the user has permission to view the full phone number
 * @returns The phone number (if allowed) or '—' (if not allowed)
 */
export function getPhoneDisplay(phone: string | undefined | null, canView: boolean): string {
  if (canView) return phone || '—'
  return '—'
}
