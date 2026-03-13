/**
 * Leave balances are now computed from policy (lib/hrms/leave-policy-calculator.ts).
 * These helpers are no-ops for backward compatibility with existing callers.
 */

/** @deprecated Balances are computed from policy; no-op. */
export async function initializeLeaveBalances(_employeeId: string): Promise<void> {
  // No-op: balances are computed from join date + approved leave history
}

/** @deprecated Balances are computed from policy; no-op. */
export async function ensureLeaveBalance(
  _employeeId: string,
  _leaveTypeId: string
): Promise<void> {
  // No-op: balances are computed from join date + approved leave history
}

