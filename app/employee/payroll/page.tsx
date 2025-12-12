'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Download, Calendar, DollarSign } from 'lucide-react'
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
}

export default function EmployeePayrollPage() {
  const { data: payrollRecords, isLoading } = useQuery<PayrollRecord[]>({
    queryKey: ['payroll', 'my'],
    queryFn: () => apiGet<PayrollRecord[]>('/api/payroll/my'),
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

  const handleDownloadSlip = (id: string) => {
    window.open(`/employee/payroll/${id}/slip`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payroll</h1>
        <p className="text-muted-foreground mt-1">View your salary slips and payroll history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salary Slips</CardTitle>
          <CardDescription>Download your salary slips</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Disbursed Date</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Gross Salary</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRecords?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {getMonthName(record.month)}
                      </div>
                    </TableCell>
                    <TableCell>{record.year}</TableCell>
                    <TableCell>
                      {format(new Date(record.disbursedAt), 'PPP')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {formatCurrency(record.basicSalary)}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(record.grossSalary)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(record.netSalary)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadSlip(record.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Slip
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!payrollRecords || payrollRecords.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No payroll records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

