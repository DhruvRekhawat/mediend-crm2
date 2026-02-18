/**
 * Display labels for KYP submission status.
 * KYP_DETAILS_ADDED = Insurance added hospitals, room types, TPA (KYP complete).
 * PRE_AUTH_COMPLETE = BD raised pre-auth, Insurance completed (actual pre-auth done).
 */
export const KYP_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Hospital',
  KYP_DETAILS_ADDED: 'KYP Complete',
  PRE_AUTH_COMPLETE: 'Pre-Auth Complete',
  FOLLOW_UP_COMPLETE: 'Follow-Up Complete',
  COMPLETED: 'Completed',
}

export function getKYPStatusLabel(status: string): string {
  return KYP_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
}
