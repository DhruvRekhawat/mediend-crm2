'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, Download } from 'lucide-react'
import { format } from 'date-fns'
import { numberToWordsINR } from '@/lib/hrms/salary-calculation'

const MEDIEND_PRIMARY = '#2C6E6A'
const MEDIEND_SECONDARY = '#3A8F8B'
const MEDIEND_ACCENT = '#1A1A2E'

interface MonthlyPayrollSlip {
  type: 'monthly'
  id: string
  month: number
  year: number
  totalDaysInMonth: number
  payableDays: number
  unpaidLeaves: number
  paidLeaves?: number
  halfDays: number
  lateFines?: number
  adjustedBasic: number
  adjustedMedical: number
  adjustedConveyance: number
  adjustedOther: number
  adjustedSpecial: number
  adjustedGross: number
  epfEmployee: number
  applyEsic: boolean
  esicAmount: number
  applyTds: boolean
  tdsAmount: number
  insurance: number
  totalDeductions: number
  epfEmployer: number
  netPayable: number
  status: string
  employee: {
    id: string
    employeeCode: string
    joinDate: string | null
    designation: string | null
    panNumber: string | null
    bankAccountNumber: string | null
    uanNumber: string | null
    user: { name: string; email: string }
    department: { name: string } | null
  }
}

interface LegacyPayrollSlip {
  type: 'legacy'
  id: string
  month: number
  year: number
  disbursedAt: string
  basicSalary: number
  grossSalary: number
  netSalary: number
  status: string
  components: Array<{ componentType: string; name: string; amount: number }>
  employee: {
    employeeCode: string
    user: { name: string; email: string }
    department: { name: string } | null
  }
}

type PayrollSlipData = MonthlyPayrollSlip | LegacyPayrollSlip

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function maskPan(pan: string | null) {
  if (!pan || pan.length < 4) return '—'
  return 'XXXXX' + pan.slice(-4)
}

function maskBank(account: string | null) {
  if (!account || account.length < 4) return '—'
  const cleaned = account.replace(/\s/g, '')
  return 'XXXX XXXX ' + cleaned.slice(-4)
}

export default function PayslipPage() {
  const params = useParams()
  const router = useRouter()
  const payrollId = params.id as string

  const { data: payrollData, isLoading } = useQuery<PayrollSlipData>({
    queryKey: ['payroll', payrollId],
    queryFn: () => apiGet<PayrollSlipData>(`/api/payroll/${payrollId}`),
    enabled: !!payrollId,
  })

  const handlePrint = () => window.print()
  const handleDownload = () => window.open(`/api/payroll/my/${payrollId}/slip`, '_blank')

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading payslip...</p>
      </div>
    )
  }

  if (!payrollData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Payslip not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const isMonthly = payrollData.type === 'monthly'
  const monthName = MONTHS[payrollData.month - 1] || ''
  const employee = payrollData.employee

  return (
    <>
      <div className="no-print p-4 bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-[#F5F5F5] p-8 print:p-0 print:bg-white">
        <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none" style={{ color: '#333333' }}>
          {/* MediEND Header */}
          <div className="p-6 print:p-8 border-b-2" style={{ borderColor: MEDIEND_PRIMARY }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-2xl font-semibold lowercase" style={{ color: MEDIEND_PRIMARY }}>
                  mediend
                </div>
                <div className="font-semibold mt-1" style={{ color: MEDIEND_ACCENT }}>
                  MediEND Healthcare Solutions
                </div>
                <div className="text-sm text-muted-foreground">(A unit of Kundkund Healthcare Pvt. Ltd.)</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Payslip for the month of</div>
                <div className="text-xl font-bold" style={{ color: MEDIEND_PRIMARY }}>
                  {monthName} {payrollData.year}
                </div>
              </div>
            </div>
          </div>

          {/* Employee Details */}
          <div className="p-6 print:p-6 border-b" style={{ borderColor: '#F5F5F5' }}>
            <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: MEDIEND_PRIMARY }}>
              Employee Details
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Employee Name</span>
                <span className="font-medium">{employee.user.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Employee ID</span>
                <span className="font-medium">{employee.employeeCode}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Designation</span>
                <span className="font-medium">{'designation' in employee ? (employee.designation ?? '—') : '—'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{employee.department?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Date of Joining</span>
                <span className="font-medium">
                  {'joinDate' in employee && employee.joinDate
                    ? format(new Date(employee.joinDate), 'dd-MMM-yyyy')
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">PAN Number</span>
                <span className="font-medium">{maskPan('panNumber' in employee ? employee.panNumber : null)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Bank Account</span>
                <span className="font-medium">{maskBank('bankAccountNumber' in employee ? employee.bankAccountNumber : null)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">UAN Number</span>
                <span className="font-medium">{'uanNumber' in employee ? (employee.uanNumber ?? '—') : '—'}</span>
              </div>
            </div>
          </div>

          {isMonthly && (
            <div className="p-6 print:p-6 border-b" style={{ borderColor: '#F5F5F5' }}>
              <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: MEDIEND_PRIMARY }}>
                Attendance Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-sm">
                <div className="text-center p-2 rounded bg-[#F5F5F5]">
                  <div className="font-semibold">Total Days</div>
                  <div>{(payrollData as MonthlyPayrollSlip).totalDaysInMonth}</div>
                </div>
                <div className="text-center p-2 rounded bg-[#F5F5F5]">
                  <div className="font-semibold">Payable Days</div>
                  <div>{(payrollData as MonthlyPayrollSlip).payableDays}</div>
                </div>
                <div className="text-center p-2 rounded bg-[#F5F5F5]">
                  <div className="font-semibold">Half Days</div>
                  <div>{(payrollData as MonthlyPayrollSlip).halfDays}</div>
                </div>
                <div className="text-center p-2 rounded bg-[#F5F5F5]">
                  <div className="font-semibold">Paid Leaves</div>
                  <div>{(payrollData as MonthlyPayrollSlip).paidLeaves ?? 0}</div>
                </div>
                <div className="text-center p-2 rounded bg-[#F5F5F5]">
                  <div className="font-semibold">Unpaid / LOP</div>
                  <div>{(payrollData as MonthlyPayrollSlip).unpaidLeaves}</div>
                </div>
                <div className="text-center p-2 rounded bg-[#F5F5F5]">
                  <div className="font-semibold">Late Fines</div>
                  <div>{formatCurrency((payrollData as MonthlyPayrollSlip).lateFines ?? 0)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Earnings vs Deductions */}
          <div className="p-6 print:p-6 border-b" style={{ borderColor: '#F5F5F5' }}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: MEDIEND_PRIMARY }}>
                  Earnings
                </h3>
                <table className="w-full text-sm">
                  <tbody>
                    {isMonthly ? (
                      <>
                        <tr className="border-b" style={{ borderColor: '#F5F5F5' }}>
                          <td className="py-2">Basic Salary</td>
                          <td className="text-right font-medium">{formatCurrency((payrollData as MonthlyPayrollSlip).adjustedBasic)}</td>
                        </tr>
                        <tr className="border-b" style={{ borderColor: '#F5F5F5' }}>
                          <td className="py-2">Medical Allow.</td>
                          <td className="text-right font-medium">{formatCurrency((payrollData as MonthlyPayrollSlip).adjustedMedical)}</td>
                        </tr>
                        <tr className="border-b" style={{ borderColor: '#F5F5F5' }}>
                          <td className="py-2">Conveyance Allow.</td>
                          <td className="text-right font-medium">{formatCurrency((payrollData as MonthlyPayrollSlip).adjustedConveyance)}</td>
                        </tr>
                        <tr className="border-b" style={{ borderColor: '#F5F5F5' }}>
                          <td className="py-2">Other Allowance</td>
                          <td className="text-right font-medium">{formatCurrency((payrollData as MonthlyPayrollSlip).adjustedOther)}</td>
                        </tr>
                        <tr className="border-b" style={{ borderColor: '#F5F5F5' }}>
                          <td className="py-2">Special Allow.</td>
                          <td className="text-right font-medium">{formatCurrency((payrollData as MonthlyPayrollSlip).adjustedSpecial)}</td>
                        </tr>
                        <tr className="font-bold pt-2">
                          <td className="py-2">TOTAL EARNINGS</td>
                          <td className="text-right" style={{ color: MEDIEND_PRIMARY }}>{formatCurrency((payrollData as MonthlyPayrollSlip).adjustedGross)}</td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr className="border-b" style={{ borderColor: '#F5F5F5' }}>
                          <td className="py-2">Basic Salary</td>
                          <td className="text-right font-medium">{formatCurrency((payrollData as LegacyPayrollSlip).basicSalary)}</td>
                        </tr>
                        {(payrollData as LegacyPayrollSlip).components
                          .filter((c) => c.componentType === 'ALLOWANCE')
                          .map((c) => (
                            <tr key={c.name} className="border-b" style={{ borderColor: '#F5F5F5' }}>
                              <td className="py-2">{c.name}</td>
                              <td className="text-right font-medium">{formatCurrency(c.amount)}</td>
                            </tr>
                          ))}
                        <tr className="font-bold pt-2">
                          <td className="py-2">TOTAL EARNINGS</td>
                          <td className="text-right" style={{ color: MEDIEND_PRIMARY }}>{formatCurrency((payrollData as LegacyPayrollSlip).grossSalary)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: MEDIEND_PRIMARY }}>
                  Deductions
                </h3>
                <table className="w-full text-sm">
                  <tbody>
                    {isMonthly ? (
                      <>
                        <tr className="border-b" style={{ borderColor: '#F5F5F5' }}>
                          <td className="py-2">EPF (Employee)</td>
                          <td className="text-right font-medium">{formatCurrency((payrollData as MonthlyPayrollSlip).epfEmployee)}</td>
                        </tr>
                        <tr className="border-b" style={{ borderColor: '#F5F5F5' }}>
                          <td className="py-2">ESIC</td>
                          <td className="text-right font-medium">{formatCurrency((payrollData as MonthlyPayrollSlip).esicAmount)}</td>
                        </tr>
                        <tr className="border-b" style={{ borderColor: '#F5F5F5' }}>
                          <td className="py-2">Prof. Tax</td>
                          <td className="text-right font-medium">₹0</td>
                        </tr>
                        <tr className="border-b" style={{ borderColor: '#F5F5F5' }}>
                          <td className="py-2">Insurance</td>
                          <td className="text-right font-medium">{formatCurrency((payrollData as MonthlyPayrollSlip).insurance)}</td>
                        </tr>
                        <tr className="border-b" style={{ borderColor: '#F5F5F5' }}>
                          <td className="py-2">TDS</td>
                          <td className="text-right font-medium">{formatCurrency((payrollData as MonthlyPayrollSlip).tdsAmount)}</td>
                        </tr>
                        {((payrollData as MonthlyPayrollSlip).lateFines ?? 0) > 0 && (
                          <tr className="border-b" style={{ borderColor: '#F5F5F5' }}>
                            <td className="py-2">Late fines</td>
                            <td className="text-right font-medium">{formatCurrency((payrollData as MonthlyPayrollSlip).lateFines!)}</td>
                          </tr>
                        )}
                        <tr className="font-bold pt-2">
                          <td className="py-2">TOTAL DEDUCTIONS</td>
                          <td className="text-right" style={{ color: MEDIEND_PRIMARY }}>{formatCurrency((payrollData as MonthlyPayrollSlip).totalDeductions)}</td>
                        </tr>
                      </>
                    ) : (
                      <>
                        {(payrollData as LegacyPayrollSlip).components
                          .filter((c) => c.componentType === 'DEDUCTION')
                          .map((c) => (
                            <tr key={c.name} className="border-b" style={{ borderColor: '#F5F5F5' }}>
                              <td className="py-2">{c.name}</td>
                              <td className="text-right font-medium">-{formatCurrency(c.amount)}</td>
                            </tr>
                          ))}
                        <tr className="font-bold pt-2">
                          <td className="py-2">TOTAL DEDUCTIONS</td>
                          <td className="text-right" style={{ color: MEDIEND_PRIMARY }}>
                            {formatCurrency(
                              (payrollData as LegacyPayrollSlip).components
                                .filter((c) => c.componentType === 'DEDUCTION')
                                .reduce((s, c) => s + c.amount, 0)
                            )}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {isMonthly && (
            <div className="p-6 print:p-6 border-b" style={{ borderColor: '#F5F5F5' }}>
              <h3 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: MEDIEND_PRIMARY }}>
                Employer Contributions (Not deducted from salary)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between p-2 rounded bg-[#F5F5F5]">
                  <span>Employer PF</span>
                  <span className="font-medium">{formatCurrency((payrollData as MonthlyPayrollSlip).epfEmployer)}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-[#F5F5F5]">
                  <span>Employer ESIC</span>
                  <span className="font-medium">₹0</span>
                </div>
              </div>
            </div>
          )}

          {/* Net Payable */}
          <div className="p-6 print:p-6 border-b-2" style={{ borderColor: MEDIEND_PRIMARY }}>
            <div className="rounded-lg p-6 bg-[#F5F5F5]">
              <div className="text-lg font-bold" style={{ color: MEDIEND_ACCENT }}>
                NET PAYABLE: {formatCurrency(isMonthly ? (payrollData as MonthlyPayrollSlip).netPayable : (payrollData as LegacyPayrollSlip).netSalary)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                (Rupees {numberToWordsINR(isMonthly ? (payrollData as MonthlyPayrollSlip).netPayable : (payrollData as LegacyPayrollSlip).netSalary)})
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 print:p-6 text-sm text-muted-foreground">
            <p className="mb-2">This is a system-generated payslip and does not require a signature.</p>
            <p>Generated on: {format(new Date(), 'dd-MMM-yyyy HH:mm')}</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0.5cm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  )
}
