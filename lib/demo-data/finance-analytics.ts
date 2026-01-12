import { FinanceAnalytics } from '@/app/md/finance/page'

export function generateFinanceDemoData(): FinanceAnalytics {
  const parties = ['ABC Suppliers', 'XYZ Corporation', 'Tech Solutions Ltd', 'Global Industries', 'Prime Services', 'Elite Trading', 'Mega Corp', 'Super Enterprises']
  const heads = ['Office Rent', 'Employee Salaries', 'Marketing Expenses', 'Travel & Conveyance', 'Utilities', 'Equipment', 'Professional Services', 'Maintenance']
  const paymentModes = ['HDFC Bank', 'ICICI Bank', 'Cash', 'UPI', 'Paytm']
  const statuses = ['PENDING', 'APPROVED', 'REJECTED']

  // Generate date range for trends (last 30 days)
  const trends: Array<{ date: string; credit: number; debit: number; netFlow: number }> = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const credit = Math.floor(Math.random() * 1000000) + 200000
    const debit = Math.floor(Math.random() * 800000) + 150000
    trends.push({
      date: date.toISOString().split('T')[0],
      credit,
      debit,
      netFlow: credit - debit,
    })
  }

  // Calculate totals
  const totalRevenue = trends.reduce((sum, t) => sum + t.credit, 0)
  const totalExpenses = trends.reduce((sum, t) => sum + t.debit, 0)
  const netCashFlow = totalRevenue - totalExpenses
  const pendingApprovals = Math.floor(Math.random() * 20) + 5

  // Generate party analysis
  const partyAnalysis = parties.map((partyName, index) => ({
    partyId: `party-${index}`,
    partyName,
    partyType: index % 2 === 0 ? 'VENDOR' : 'CLIENT' as string,
    totalCredits: Math.floor(Math.random() * 2000000) + 500000,
    totalDebits: Math.floor(Math.random() * 1500000) + 300000,
    netAmount: 0,
    transactionCount: Math.floor(Math.random() * 50) + 10,
  })).map((p) => ({
    ...p,
    netAmount: p.totalCredits - p.totalDebits,
  })).sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount))

  // Generate head analysis
  const headAnalysis = heads.map((headName, index) => ({
    headId: `head-${index}`,
    headName,
    department: index % 2 === 0 ? 'Operations' : 'Administration' as string | null,
    totalCredits: Math.floor(Math.random() * 500000) + 100000,
    totalDebits: Math.floor(Math.random() * 2000000) + 500000,
    netAmount: 0,
    transactionCount: Math.floor(Math.random() * 30) + 5,
  })).map((h) => ({
    ...h,
    netAmount: h.totalCredits - h.totalDebits,
  })).sort((a, b) => Math.abs(b.totalDebits) - Math.abs(a.totalDebits))

  // Generate payment mode analysis
  const paymentModeAnalysis = paymentModes.map((paymentModeName, index) => ({
    paymentModeId: `mode-${index}`,
    paymentModeName,
    totalCredits: Math.floor(Math.random() * 3000000) + 1000000,
    totalDebits: Math.floor(Math.random() * 2500000) + 800000,
    netFlow: 0,
    transactionCount: Math.floor(Math.random() * 100) + 20,
    currentBalance: Math.floor(Math.random() * 5000000) + 2000000,
  })).map((p) => ({
    ...p,
    netFlow: p.totalCredits - p.totalDebits,
  })).sort((a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance))

  // Generate approval status
  const approvalStatus = statuses.map((status) => ({
    status,
    count: status === 'APPROVED' ? 150 : status === 'PENDING' ? pendingApprovals : 10,
    amount: status === 'APPROVED' ? totalRevenue + totalExpenses : status === 'PENDING' ? Math.floor((totalRevenue + totalExpenses) * 0.1) : Math.floor((totalRevenue + totalExpenses) * 0.05),
  }))

  // Generate top transactions
  const topTransactions = Array.from({ length: 20 }, (_, index) => ({
    id: `txn-${index}`,
    serialNumber: `TXN${String(index + 1).padStart(6, '0')}`,
    transactionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    transactionType: index % 3 === 0 ? 'CREDIT' : 'DEBIT' as string,
    partyName: parties[Math.floor(Math.random() * parties.length)],
    partyType: index % 2 === 0 ? 'VENDOR' : 'CLIENT' as string,
    headName: heads[Math.floor(Math.random() * heads.length)],
    paymentModeName: paymentModes[Math.floor(Math.random() * paymentModes.length)],
    amount: Math.floor(Math.random() * 500000) + 50000,
    description: `Transaction for ${heads[Math.floor(Math.random() * heads.length)]}`,
  })).sort((a, b) => b.amount - a.amount)

  // Generate pending approvals
  const pendingApprovalsList = Array.from({ length: pendingApprovals }, (_, index) => ({
    id: `pending-${index}`,
    serialNumber: `PEND${String(index + 1).padStart(6, '0')}`,
    transactionDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    transactionType: index % 2 === 0 ? 'CREDIT' : 'DEBIT' as string,
    partyName: parties[Math.floor(Math.random() * parties.length)],
    partyType: index % 2 === 0 ? 'VENDOR' : 'CLIENT' as string,
    headName: heads[Math.floor(Math.random() * heads.length)],
    paymentModeName: paymentModes[Math.floor(Math.random() * paymentModes.length)],
    amount: Math.floor(Math.random() * 300000) + 20000,
    description: `Pending transaction for ${heads[Math.floor(Math.random() * heads.length)]}`,
    createdByName: ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams'][Math.floor(Math.random() * 4)],
  }))

  return {
    kpis: {
      totalRevenue,
      totalExpenses,
      netCashFlow,
      pendingApprovalsCount: pendingApprovals,
      approvedAmount: totalRevenue + totalExpenses,
      rejectedAmount: Math.floor((totalRevenue + totalExpenses) * 0.05),
    },
    transactionTrends: trends,
    partyAnalysis,
    headAnalysis,
    paymentModeAnalysis,
    approvalStatus,
    topTransactions,
    pendingApprovals: pendingApprovalsList,
  }
}
