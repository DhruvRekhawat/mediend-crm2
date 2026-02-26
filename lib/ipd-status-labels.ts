/**
 * Display labels for IpdStatus (admission record IPD mark).
 * ADMITTED_DONE = patient admitted; IPD_DONE = surgery done.
 */
export function getIpdStatusLabel(status: string | null | undefined): string {
  if (!status) return '–'
  switch (status) {
    case 'ADMITTED_DONE':
      return 'Admitted'
    case 'IPD_DONE':
      return 'Surgery Done'
    case 'POSTPONED':
      return 'Postponed'
    case 'CANCELLED':
      return 'Cancelled'
    case 'DISCHARGED':
      return 'Discharged'
    default:
      return status.replace(/_/g, ' ')
  }
}
