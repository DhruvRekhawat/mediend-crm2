'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { 
  Wallet, 
  Users, 
  FolderTree, 
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react'
import { format, subDays } from 'date-fns'

interface PaymentModeSummary {
  id: string
  name: string
  openingBalance: number
  currentBalance: number
  totalCredits: number
  totalDebits: number
  netChange: number
}

interface PartyWiseSummary {
  partyId: string
  partyName: string
  partyType: string
  totalCredits: number
  totalDebits: number
  netAmount: number
  entriesCount: number
}

interface HeadWiseSummary {
  headId: string
  headName: string
  department: string | null
  totalCredits: number
  totalDebits: number
  netAmount: number
  entriesCount: number
}

interface DayWiseSummary {
  date: string
  totalCredits: number
  totalDebits: number
  netChange: number
  entriesCount: number
}

interface ReportResponse<T> {
  type: string
  data: T[]
  totals: {
    totalCredits: number
    totalDebits: number
    totalBalance?: number
    entriesCount?: number
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('payment-mode')
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false)
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false)

  const dateParams = new URLSearchParams()
  if (startDate) dateParams.set('startDate', startDate.toISOString())
  if (endDate) dateParams.set('endDate', endDate.toISOString())

  // Fetch payment mode summary
  const { data: paymentModeData, isLoading: loadingPaymentMode } = useQuery<ReportResponse<PaymentModeSummary>>({
    queryKey: ['report-payment-mode', startDate, endDate],
    queryFn: () => apiGet<ReportResponse<PaymentModeSummary>>(`/api/finance/reports/summary?type=payment-mode&${dateParams.toString()}`),
    enabled: activeTab === 'payment-mode',
  })

  // Fetch party-wise summary
  const { data: partyWiseData, isLoading: loadingPartyWise } = useQuery<ReportResponse<PartyWiseSummary>>({
    queryKey: ['report-party-wise', startDate, endDate],
    queryFn: () => apiGet<ReportResponse<PartyWiseSummary>>(`/api/finance/reports/summary?type=party-wise&${dateParams.toString()}`),
    enabled: activeTab === 'party-wise',
  })

  // Fetch head-wise summary
  const { data: headWiseData, isLoading: loadingHeadWise } = useQuery<ReportResponse<HeadWiseSummary>>({
    queryKey: ['report-head-wise', startDate, endDate],
    queryFn: () => apiGet<ReportResponse<HeadWiseSummary>>(`/api/finance/reports/summary?type=head-wise&${dateParams.toString()}`),
    enabled: activeTab === 'head-wise',
  })

  // Fetch day-wise summary
  const { data: dayWiseData, isLoading: loadingDayWise } = useQuery<ReportResponse<DayWiseSummary>>({
    queryKey: ['report-day-wise', startDate, endDate],
    queryFn: () => apiGet<ReportResponse<DayWiseSummary>>(`/api/finance/reports/summary?type=day-wise&${dateParams.toString()}`),
    enabled: activeTab === 'day-wise',
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finance Reports</h1>
        <p className="text-muted-foreground mt-1">View summaries and analytics</p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Filter reports by date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <Dialog open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PP') : 'Pick date'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date)
                      setIsStartCalendarOpen(false)
                    }}
                    initialFocus
                  />
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <Dialog open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PP') : 'Pick date'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date)
                      setIsEndCalendarOpen(false)
                    }}
                    initialFocus
                  />
                </DialogContent>
              </Dialog>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setStartDate(subDays(new Date(), 30))
                setEndDate(new Date())
              }}
            >
              Last 30 Days
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setStartDate(subDays(new Date(), 7))
                setEndDate(new Date())
              }}
            >
              Last 7 Days
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="payment-mode" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Payment Mode
          </TabsTrigger>
          <TabsTrigger value="party-wise" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Party-wise
          </TabsTrigger>
          <TabsTrigger value="head-wise" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Head-wise
          </TabsTrigger>
          <TabsTrigger value="day-wise" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Day-wise
          </TabsTrigger>
        </TabsList>

        {/* Payment Mode Summary */}
        <TabsContent value="payment-mode">
          <Card>
            <CardHeader>
              <CardTitle>Payment Mode Balance Summary</CardTitle>
              <CardDescription>Current balances across all payment modes</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Totals */}
              {paymentModeData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-green-50 dark:bg-green-900/10">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600">Total Credits</p>
                          <p className="text-2xl font-bold">{formatCurrency(paymentModeData.totals.totalCredits)}</p>
                        </div>
                        <ArrowUpCircle className="h-8 w-8 text-green-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 dark:bg-red-900/10">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-red-600">Total Debits</p>
                          <p className="text-2xl font-bold">{formatCurrency(paymentModeData.totals.totalDebits)}</p>
                        </div>
                        <ArrowDownCircle className="h-8 w-8 text-red-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 dark:bg-blue-900/10">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600">Total Balance</p>
                          <p className="text-2xl font-bold">{formatCurrency(paymentModeData.totals.totalBalance || 0)}</p>
                        </div>
                        <Wallet className="h-8 w-8 text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {loadingPaymentMode ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead className="text-right">Opening Balance</TableHead>
                      <TableHead className="text-right">Total Credits</TableHead>
                      <TableHead className="text-right">Total Debits</TableHead>
                      <TableHead className="text-right">Net Change</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentModeData?.data.map((mode) => (
                      <TableRow key={mode.id}>
                        <TableCell className="font-medium">{mode.name}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(mode.openingBalance)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(mode.totalCredits)}</TableCell>
                        <TableCell className="text-right font-mono text-red-600">{formatCurrency(mode.totalDebits)}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={`flex items-center justify-end gap-1 ${mode.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {mode.netChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {formatCurrency(Math.abs(mode.netChange))}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">{formatCurrency(mode.currentBalance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Party-wise Summary */}
        <TabsContent value="party-wise">
          <Card>
            <CardHeader>
              <CardTitle>Party-wise Summary</CardTitle>
              <CardDescription>Transaction totals by party</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPartyWise ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Party</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Total Credits</TableHead>
                      <TableHead className="text-right">Total Debits</TableHead>
                      <TableHead className="text-right">Net Amount</TableHead>
                      <TableHead className="text-center">Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partyWiseData?.data.map((party) => (
                      <TableRow key={party.partyId}>
                        <TableCell className="font-medium">{party.partyName}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{party.partyType}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(party.totalCredits)}</TableCell>
                        <TableCell className="text-right font-mono text-red-600">{formatCurrency(party.totalDebits)}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={party.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(party.netAmount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{party.entriesCount}</TableCell>
                      </TableRow>
                    ))}
                    {(!partyWiseData?.data || partyWiseData.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No data available for selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Head-wise Summary */}
        <TabsContent value="head-wise">
          <Card>
            <CardHeader>
              <CardTitle>Head-wise Summary</CardTitle>
              <CardDescription>Transaction totals by head/category</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHeadWise ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Head</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Total Credits</TableHead>
                      <TableHead className="text-right">Total Debits</TableHead>
                      <TableHead className="text-right">Net Amount</TableHead>
                      <TableHead className="text-center">Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {headWiseData?.data.map((head) => (
                      <TableRow key={head.headId}>
                        <TableCell className="font-medium">{head.headName}</TableCell>
                        <TableCell>{head.department || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(head.totalCredits)}</TableCell>
                        <TableCell className="text-right font-mono text-red-600">{formatCurrency(head.totalDebits)}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={head.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(head.netAmount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{head.entriesCount}</TableCell>
                      </TableRow>
                    ))}
                    {(!headWiseData?.data || headWiseData.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No data available for selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Day-wise Summary */}
        <TabsContent value="day-wise">
          <Card>
            <CardHeader>
              <CardTitle>Day-wise Summary</CardTitle>
              <CardDescription>Daily transaction totals</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDayWise ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total Credits</TableHead>
                      <TableHead className="text-right">Total Debits</TableHead>
                      <TableHead className="text-right">Net Change</TableHead>
                      <TableHead className="text-center">Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayWiseData?.data.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {format(new Date(day.date), 'EEE, dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(day.totalCredits)}</TableCell>
                        <TableCell className="text-right font-mono text-red-600">{formatCurrency(day.totalDebits)}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={`flex items-center justify-end gap-1 ${day.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {day.netChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {formatCurrency(Math.abs(day.netChange))}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{day.entriesCount}</TableCell>
                      </TableRow>
                    ))}
                    {(!dayWiseData?.data || dayWiseData.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No data available for selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

