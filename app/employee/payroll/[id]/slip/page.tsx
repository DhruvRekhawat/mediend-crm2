'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, Download } from 'lucide-react'
import { format } from 'date-fns'

interface PayrollComponent {
  id: string
  componentType: 'ALLOWANCE' | 'DEDUCTION'
  name: string
  amount: number
}

interface PayrollRecord {
  id: string
  month: number
  year: number
  disbursedAt: Date
  basicSalary: number
  grossSalary: number
  netSalary: number
  status: string
  components: PayrollComponent[]
  employee: {
    id: string
    employeeCode: string
    user: {
      id: string
      name: string
      email: string
    }
    department: {
      id: string
      name: string
    } | null
  }
}

export default function PayslipPage() {
  const params = useParams()
  const router = useRouter()
  const payrollId = params.id as string

  const { data: payrollRecord, isLoading } = useQuery<PayrollRecord>({
    queryKey: ['payroll', payrollId],
    queryFn: () => apiGet<PayrollRecord>(`/api/payroll/${payrollId}`),
    enabled: !!payrollId,
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]
    return months[month - 1] || ''
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Trigger print dialog which can be used to save as PDF
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading payslip...</p>
        </div>
      </div>
    )
  }

  if (!payrollRecord) {
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

  const allowances = payrollRecord.components.filter(c => c.componentType === 'ALLOWANCE')
  const deductions = payrollRecord.components.filter(c => c.componentType === 'DEDUCTION')

  return (
    <>
      {/* Print controls - hidden when printing */}
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

      {/* Payslip Content */}
      <div className="min-h-screen bg-gray-50 p-8 print:p-0 print:bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Payslip Container */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
            {/* Header with Logo */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 print:p-8">
              <div className="flex items-center justify-between mb-4">
                {/* Logo Area */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center print:w-20 print:h-20">
                    {/* Logo placeholder - replace with actual logo image */}
                    <div className="text-blue-600 font-bold text-xl print:text-2xl">LOGO</div>
                    {/* Uncomment below and add your logo image */}
                    {/* <img src="/logo.png" alt="Company Logo" className="w-full h-full object-contain" /> */}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold print:text-2xl">Company Name</h2>
                    <p className="text-blue-100 text-sm print:text-base">Your Company Tagline</p>
                  </div>
                </div>
                <div className="text-right">
                  <h1 className="text-2xl font-bold mb-1 print:text-3xl">SALARY SLIP</h1>
                  <p className="text-blue-100 text-sm print:text-base">
                    {getMonthName(payrollRecord.month)} {payrollRecord.year}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-8 print:p-6">

              {/* Employee Details */}
              <div className="grid grid-cols-2 gap-8 mb-8 print:gap-6">
                <div className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Employee Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-semibold text-gray-900">{payrollRecord.employee.user.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Employee Code:</span>
                      <span className="font-semibold text-gray-900">{payrollRecord.employee.employeeCode}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-semibold text-gray-900 text-xs">{payrollRecord.employee.user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-semibold text-gray-900">{payrollRecord.employee.department?.name || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0">
                  <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Payment Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Disbursed Date:</span>
                      <span className="font-semibold text-gray-900">{format(new Date(payrollRecord.disbursedAt), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-semibold text-green-600 uppercase">{payrollRecord.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pay Period:</span>
                      <span className="font-semibold text-gray-900">{getMonthName(payrollRecord.month)} {payrollRecord.year}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-6 text-gray-800 border-b-2 border-gray-300 pb-3">Salary Breakdown</h3>
                
                {/* Earnings */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Earnings</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Description</th>
                          <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">Basic Salary</td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(payrollRecord.basicSalary)}</td>
                        </tr>
                        {allowances.map((comp) => (
                          <tr key={comp.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-700">{comp.name}</td>
                            <td className="py-3 px-4 text-right font-medium text-gray-900">{formatCurrency(comp.amount)}</td>
                          </tr>
                        ))}
                        <tr className="bg-blue-50 font-bold border-t-2 border-gray-300">
                          <td className="py-4 px-4 text-gray-900">Gross Salary</td>
                          <td className="py-4 px-4 text-right text-blue-700">{formatCurrency(payrollRecord.grossSalary)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Deductions */}
                {deductions.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Deductions</h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Description</th>
                            <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {deductions.map((comp) => (
                            <tr key={comp.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-700">{comp.name}</td>
                              <td className="py-3 px-4 text-right font-medium text-red-600">-{formatCurrency(comp.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Net Salary */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 print:bg-green-50">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">Net Salary (Payable)</span>
                    <span className="text-3xl font-bold text-green-700">{formatCurrency(payrollRecord.netSalary)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t-2 border-gray-300">
                <div className="grid grid-cols-2 gap-8 mb-4 print:gap-6">
                  <div className="text-left">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Authorized Signatory</p>
                    <div className="border-t-2 border-gray-400 pt-2 w-48">
                      <p className="text-xs text-gray-500">Signature</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Employee Acknowledgment</p>
                    <div className="border-t-2 border-gray-400 pt-2 ml-auto w-48">
                      <p className="text-xs text-gray-500">Signature</p>
                    </div>
                  </div>
                </div>
                <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
                  <p className="font-medium">This is a system generated document and does not require a physical signature.</p>
                  <p className="mt-1">Generated on {format(new Date(), 'PPP')} at {format(new Date(), 'p')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5cm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          
          .print\\:p-8 {
            padding: 2rem !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:bg-white {
            background: white !important;
          }
          
          .print\\:w-20 {
            width: 5rem !important;
          }
          
          .print\\:h-20 {
            height: 5rem !important;
          }
          
          .print\\:text-2xl {
            font-size: 1.5rem !important;
            line-height: 2rem !important;
          }
          
          .print\\:text-3xl {
            font-size: 1.875rem !important;
            line-height: 2.25rem !important;
          }
          
          .print\\:text-base {
            font-size: 1rem !important;
            line-height: 1.5rem !important;
          }
        }
      `}</style>
    </>
  )
}

