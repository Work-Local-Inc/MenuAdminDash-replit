"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, startOfWeek, endOfWeek, subWeeks, addDays, differenceInDays, parseISO } from "date-fns"
import { CalendarIcon, Download, FileText, AlertTriangle, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface RestaurantStatement {
  restaurant_id: number
  legacy_id: number | null
  restaurant_name: string
  total_paid: number
  commission: number
  weekly_commission: number
  transaction_fees: number
  bank_fees: number
  delivery_commission: number
  delivery_tips: number
  hst: number
  net_total: number
  cash_count: number
  cc_count: number
  total_count: number
  last_order_date: string | null
  has_order_history: boolean
}

interface BatchStatementsData {
  week_number: number
  year: number
  period_start: string
  period_end: string
  statements: RestaurantStatement[]
  totals: {
    total_paid: number
    commission: number
    weekly_commission: number
    transaction_fees: number
    bank_fees: number
    delivery_commission: number
    delivery_tips: number
    hst: number
    net_total: number
  }
}

type SortField = 'name' | 'total_paid' | 'net_total' | 'last_order'
type SortDirection = 'asc' | 'desc'
type FilterType = 'all' | 'positive' | 'negative' | 'zero' | 'inactive'

export default function BatchStatementsPage() {
  const lastMonday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const previousMonday = subWeeks(lastMonday, 1)
  const previousSunday = addDays(previousMonday, 6)
  
  const [startDate, setStartDate] = useState<Date>(previousMonday)
  const [endDate, setEndDate] = useState<Date>(previousSunday)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>('net_total')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filterType, setFilterType] = useState<FilterType>('all')

  const { data, isLoading } = useQuery<BatchStatementsData>({
    queryKey: [`/api/reports/batch-statements?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`],
  })

  const formatCurrency = (amount: number) => {
    const sign = amount < 0 ? '-' : ''
    return `${sign}$${Math.abs(amount).toFixed(2)}`
  }

  const getInactivityStatus = (lastOrderDate: string | null, hasOrderHistory: boolean) => {
    if (!hasOrderHistory) return null
    if (!lastOrderDate) return 'unknown'
    
    const daysSince = differenceInDays(new Date(), parseISO(lastOrderDate))
    if (daysSince > 90) return 'inactive'
    if (daysSince > 30) return 'slow'
    return null
  }

  const filteredAndSortedStatements = useMemo(() => {
    if (!data?.statements) return []

    let filtered = data.statements.filter(s => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        if (!s.restaurant_name.toLowerCase().includes(search) && 
            !s.restaurant_id.toString().includes(search) &&
            !(s.legacy_id?.toString() || '').includes(search)) {
          return false
        }
      }

      switch (filterType) {
        case 'positive':
          return s.net_total > 0
        case 'negative':
          return s.net_total < 0
        case 'zero':
          return s.net_total === 0
        case 'inactive':
          return getInactivityStatus(s.last_order_date, s.has_order_history) === 'inactive'
        default:
          return true
      }
    })

    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.restaurant_name.localeCompare(b.restaurant_name)
          break
        case 'total_paid':
          comparison = a.total_paid - b.total_paid
          break
        case 'net_total':
          comparison = a.net_total - b.net_total
          break
        case 'last_order':
          if (!a.last_order_date && !b.last_order_date) comparison = 0
          else if (!a.last_order_date) comparison = 1
          else if (!b.last_order_date) comparison = -1
          else comparison = new Date(a.last_order_date).getTime() - new Date(b.last_order_date).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [data?.statements, searchTerm, sortField, sortDirection, filterType])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const downloadCSV = () => {
    if (!data?.statements) return

    const headers = [
      'ID',
      'Legacy ID', 
      'Restaurant Name',
      'Address',
      'Total Paid (CC)',
      'Commission',
      'Weekly Commission',
      'Trans Fee',
      'Bank Fee',
      'Delivery Commission',
      'Delivery Tips',
      'HST',
      'Net Total',
      'Cash Orders',
      'CC Orders',
      'Total Orders',
      'Last Order Date',
      'Status'
    ]

    const rows = filteredAndSortedStatements.map(s => {
      const status = getInactivityStatus(s.last_order_date, s.has_order_history)
      const statusText = status === 'inactive' ? 'INACTIVE (90+ days)' : 
                        status === 'slow' ? 'Slow (30+ days)' : 
                        s.has_order_history ? 'Active' : ''
      
      return [
        s.restaurant_id,
        s.legacy_id || '',
        `"${s.restaurant_name.replace(/"/g, '""')}"`,
        '',
        s.total_paid.toFixed(2),
        s.commission.toFixed(2),
        s.weekly_commission.toFixed(2),
        s.transaction_fees.toFixed(2),
        s.bank_fees.toFixed(2),
        s.delivery_commission.toFixed(2),
        s.delivery_tips.toFixed(2),
        s.hst.toFixed(2),
        s.net_total.toFixed(2),
        s.cash_count,
        s.cc_count,
        s.total_count,
        s.last_order_date ? format(parseISO(s.last_order_date), 'yyyy-MM-dd') : '',
        statusText
      ].join(',')
    })

    const totalsRow = [
      '',
      '',
      '"TOTALS"',
      '',
      data.totals.total_paid.toFixed(2),
      data.totals.commission.toFixed(2),
      data.totals.weekly_commission.toFixed(2),
      data.totals.transaction_fees.toFixed(2),
      data.totals.bank_fees.toFixed(2),
      data.totals.delivery_commission.toFixed(2),
      data.totals.delivery_tips.toFixed(2),
      data.totals.hst.toFixed(2),
      data.totals.net_total.toFixed(2),
      '',
      '',
      '',
      '',
      ''
    ].join(',')

    const csvContent = [headers.join(','), ...rows, '', totalsRow].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `menu_statements_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}.csv`
    link.click()
  }

  const stats = useMemo(() => {
    if (!data?.statements) return { positive: 0, negative: 0, zero: 0, inactive: 0 }
    
    return {
      positive: data.statements.filter(s => s.net_total > 0).length,
      negative: data.statements.filter(s => s.net_total < 0).length,
      zero: data.statements.filter(s => s.net_total === 0).length,
      inactive: data.statements.filter(s => getInactivityStatus(s.last_order_date, s.has_order_history) === 'inactive').length,
    }
  }, [data?.statements])

  const dateRange = `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <FileText className="h-6 w-6" />
              Batch Statements
            </h1>
            <p className="text-muted-foreground mt-1">
              Weekly statement summary for all restaurants
            </p>
          </div>
          
          <Button 
            onClick={downloadCSV} 
            disabled={!data?.statements?.length}
            data-testid="button-download-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Period</CardTitle>
            <CardDescription>Select the week to generate statements for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label>Week Start (Monday)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-start-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        if (date) {
                          const monday = startOfWeek(date, { weekStartsOn: 1 })
                          setStartDate(monday)
                          setEndDate(addDays(monday, 6))
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1 space-y-2">
                <Label>Week End (Sunday)</Label>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left font-normal"
                  disabled
                  data-testid="button-end-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(endDate, "PPP")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover-elevate" onClick={() => setFilterType(filterType === 'positive' ? 'all' : 'positive')}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Positive</span>
                </div>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.positive}</p>
                {filterType === 'positive' && <Badge variant="secondary" className="mt-2">Filtered</Badge>}
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover-elevate" onClick={() => setFilterType(filterType === 'negative' ? 'all' : 'negative')}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Negative</span>
                </div>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.negative}</p>
                {filterType === 'negative' && <Badge variant="secondary" className="mt-2">Filtered</Badge>}
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover-elevate" onClick={() => setFilterType(filterType === 'zero' ? 'all' : 'zero')}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Zero</span>
                </div>
                <p className="text-2xl font-bold text-muted-foreground mt-1">{stats.zero}</p>
                {filterType === 'zero' && <Badge variant="secondary" className="mt-2">Filtered</Badge>}
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover-elevate" onClick={() => setFilterType(filterType === 'inactive' ? 'all' : 'inactive')}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Inactive (90+ days)</span>
                </div>
                <p className="text-2xl font-bold text-orange-500 mt-1">{stats.inactive}</p>
                {filterType === 'inactive' && <Badge variant="secondary" className="mt-2">Filtered</Badge>}
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg">Statements ({filteredAndSortedStatements.length})</CardTitle>
              <CardDescription>{dateRange} • Week {data?.week_number}</CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search restaurants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64"
                data-testid="input-search"
              />
              <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-filter">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Restaurants</SelectItem>
                  <SelectItem value="positive">Positive Balance</SelectItem>
                  <SelectItem value="negative">Negative Balance</SelectItem>
                  <SelectItem value="zero">Zero Balance</SelectItem>
                  <SelectItem value="inactive">Inactive (90+ days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                        Restaurant {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('total_paid')}>
                        Total Paid {sortField === 'total_paid' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Weekly</TableHead>
                      <TableHead className="text-right">Trans Fee</TableHead>
                      <TableHead className="text-right">Bank Fee</TableHead>
                      <TableHead className="text-right">Del. Comm.</TableHead>
                      <TableHead className="text-right">Tips</TableHead>
                      <TableHead className="text-right">HST</TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('net_total')}>
                        Net Total {sortField === 'net_total' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort('last_order')}>
                        Activity {sortField === 'last_order' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedStatements.map((statement) => {
                      const inactivityStatus = getInactivityStatus(statement.last_order_date, statement.has_order_history)
                      
                      return (
                        <TableRow 
                          key={statement.restaurant_id}
                          className={statement.net_total < 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}
                          data-testid={`row-statement-${statement.restaurant_id}`}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{statement.restaurant_name}</span>
                              <span className="text-xs text-muted-foreground">
                                ID: {statement.restaurant_id}
                                {statement.legacy_id && ` (V1: ${statement.legacy_id})`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(statement.total_paid)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(statement.commission)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(statement.weekly_commission)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(statement.transaction_fees)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(statement.bank_fees)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(statement.delivery_commission)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(statement.delivery_tips)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(statement.hst)}</TableCell>
                          <TableCell className={`text-right font-mono font-bold ${statement.net_total < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(statement.net_total)}
                          </TableCell>
                          <TableCell className="text-center">
                            {inactivityStatus === 'inactive' ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                90+ days
                              </Badge>
                            ) : inactivityStatus === 'slow' ? (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                30+ days
                              </Badge>
                            ) : statement.has_order_history ? (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                Active
                              </Badge>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {data && (
                  <div className="border-t mt-4 pt-4">
                    <Table>
                      <TableBody>
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>TOTALS</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(data.totals.total_paid)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(data.totals.commission)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(data.totals.weekly_commission)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(data.totals.transaction_fees)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(data.totals.bank_fees)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(data.totals.delivery_commission)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(data.totals.delivery_tips)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(data.totals.hst)}</TableCell>
                          <TableCell className={`text-right font-mono ${data.totals.net_total < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(data.totals.net_total)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
