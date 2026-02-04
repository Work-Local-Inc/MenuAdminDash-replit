"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, startOfWeek, endOfWeek, subWeeks, addDays } from "date-fns"
import { CalendarIcon, Download, ArrowUpDown, Filter } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CommissionSummaryRow {
  restaurant_id: number
  restaurant_name: string
  restaurant_address: string
  total_unpaid: number
  commission: number
  weekly_commission: number
  transaction_fee: number
  bank_fee: number
  charges: number
  delivery_commission: number
  delivery_tips: number
  hst: number
  total: number
  uses_gateway: boolean
  order_count: number
}

type SortField = keyof CommissionSummaryRow
type SortDirection = 'asc' | 'desc'

export default function WeeklyCommissionPage() {
  const lastMonday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const previousMonday = subWeeks(lastMonday, 1)
  const previousSunday = addDays(previousMonday, 6)
  
  const [weekStart, setWeekStart] = useState<Date>(previousMonday)
  const [weekEnd, setWeekEnd] = useState<Date>(previousSunday)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("total")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showNonGatewayOnly, setShowNonGatewayOnly] = useState(false)
  const [showNegativeOnly, setShowNegativeOnly] = useState(false)

  const { data: summaryData, isLoading, error } = useQuery<CommissionSummaryRow[]>({
    queryKey: [`/api/reports/commission-summary?startDate=${format(weekStart, "yyyy-MM-dd")}&endDate=${format(weekEnd, "yyyy-MM-dd")}`],
  })

  const filteredAndSortedData = useMemo(() => {
    if (!summaryData) return []
    
    let filtered = summaryData.filter(row => {
      const matchesSearch = row.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.restaurant_id.toString().includes(searchTerm)
      const matchesGateway = !showNonGatewayOnly || !row.uses_gateway
      const matchesNegative = !showNegativeOnly || row.total < 0
      return matchesSearch && matchesGateway && matchesNegative
    })

    return filtered.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      const modifier = sortDirection === 'asc' ? 1 : -1
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * modifier
      }
      return String(aVal).localeCompare(String(bVal)) * modifier
    })
  }, [summaryData, searchTerm, sortField, sortDirection, showNonGatewayOnly, showNegativeOnly])

  const totals = useMemo(() => {
    if (!filteredAndSortedData.length) return null
    return {
      total_unpaid: filteredAndSortedData.reduce((sum, r) => sum + r.total_unpaid, 0),
      commission: filteredAndSortedData.reduce((sum, r) => sum + r.commission, 0),
      weekly_commission: filteredAndSortedData.reduce((sum, r) => sum + r.weekly_commission, 0),
      transaction_fee: filteredAndSortedData.reduce((sum, r) => sum + r.transaction_fee, 0),
      bank_fee: filteredAndSortedData.reduce((sum, r) => sum + r.bank_fee, 0),
      delivery_commission: filteredAndSortedData.reduce((sum, r) => sum + r.delivery_commission, 0),
      delivery_tips: filteredAndSortedData.reduce((sum, r) => sum + r.delivery_tips, 0),
      hst: filteredAndSortedData.reduce((sum, r) => sum + r.hst, 0),
      total: filteredAndSortedData.reduce((sum, r) => sum + r.total, 0),
    }
  }, [filteredAndSortedData])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleExportCSV = () => {
    if (!filteredAndSortedData.length) return
    
    const headers = [
      "ID", "Name", "Address", "Total Unpaid", "Commission", "Weekly Commission",
      "Transaction Fee", "Bank Fee", "Charges", "Delivery Commission", 
      "Delivery Tips", "HST", "Total", "Uses Gateway", "Order Count"
    ]
    
    const csvContent = [
      headers.join(","),
      ...filteredAndSortedData.map(row => [
        row.restaurant_id,
        `"${row.restaurant_name.replace(/"/g, '""')}"`,
        `"${row.restaurant_address.replace(/"/g, '""')}"`,
        row.total_unpaid.toFixed(2),
        row.commission.toFixed(2),
        row.weekly_commission.toFixed(2),
        row.transaction_fee.toFixed(2),
        row.bank_fee.toFixed(2),
        row.charges.toFixed(2),
        row.delivery_commission.toFixed(2),
        row.delivery_tips.toFixed(2),
        row.hst.toFixed(2),
        row.total.toFixed(2),
        row.uses_gateway ? "Yes" : "No",
        row.order_count,
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `commission-summary-${format(weekStart, "yyyy-MM-dd")}-to-${format(weekEnd, "yyyy-MM-dd")}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={cn(
          "h-3 w-3",
          sortField === field && "text-primary"
        )} />
      </div>
    </TableHead>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Weekly Commission Summary</h1>
          <p className="text-muted-foreground">
            Generate payment reports for Monday processing
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Period</CardTitle>
          <CardDescription>
            Select the week to generate the commission summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Week:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(weekStart, "MMM d, yyyy")} - {format(weekEnd, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={weekStart}
                    onSelect={(date) => {
                      if (date) {
                        const monday = startOfWeek(date, { weekStartsOn: 1 })
                        setWeekStart(monday)
                        setWeekEnd(addDays(monday, 6))
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleExportCSV} disabled={!filteredAndSortedData.length}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Commission Data</CardTitle>
              <CardDescription>
                {filteredAndSortedData.length} restaurants with orders this week
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[200px]"
                data-testid="input-search-restaurants"
              />
              <Button
                variant={showNegativeOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowNegativeOnly(!showNegativeOnly)}
                data-testid="button-filter-negative"
              >
                <Filter className="mr-1 h-3 w-3" />
                Negative Only
              </Button>
              <Button
                variant={showNonGatewayOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowNonGatewayOnly(!showNonGatewayOnly)}
                data-testid="button-filter-non-gateway"
              >
                <Filter className="mr-1 h-3 w-3" />
                Non-Gateway
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load commission data
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader field="restaurant_id">ID</SortableHeader>
                    <SortableHeader field="restaurant_name">Name</SortableHeader>
                    <SortableHeader field="order_count">Orders</SortableHeader>
                    <SortableHeader field="total_unpaid">CC Total</SortableHeader>
                    <SortableHeader field="commission">Commission</SortableHeader>
                    <SortableHeader field="weekly_commission">Weekly</SortableHeader>
                    <SortableHeader field="transaction_fee">Trans Fee</SortableHeader>
                    <SortableHeader field="bank_fee">Bank Fee</SortableHeader>
                    <SortableHeader field="delivery_commission">Delivery</SortableHeader>
                    <SortableHeader field="delivery_tips">Tips</SortableHeader>
                    <SortableHeader field="hst">HST</SortableHeader>
                    <SortableHeader field="total">Net Pay</SortableHeader>
                    <TableHead>Gateway</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedData.map((row) => (
                    <TableRow 
                      key={row.restaurant_id}
                      className={cn(
                        row.total < 0 && "bg-destructive/10",
                        !row.uses_gateway && "bg-yellow-50 dark:bg-yellow-950/20"
                      )}
                      data-testid={`row-restaurant-${row.restaurant_id}`}
                    >
                      <TableCell className="tabular-nums text-sm">{row.restaurant_id}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" title={row.restaurant_name}>
                        {row.restaurant_name}
                      </TableCell>
                      <TableCell>{row.order_count}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(row.total_unpaid)}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(row.commission)}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(row.weekly_commission)}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(row.transaction_fee)}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(row.bank_fee)}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(row.delivery_commission)}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(row.delivery_tips)}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(row.hst)}</TableCell>
                      <TableCell className={cn(
                        "tabular-nums font-semibold",
                        row.total < 0 && "text-destructive"
                      )}>
                        {formatCurrency(row.total)}
                      </TableCell>
                      <TableCell>
                        {row.uses_gateway ? (
                          <Badge variant="secondary">Yes</Badge>
                        ) : (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700">Invoice</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAndSortedData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                        No commission data found for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {totals && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Totals</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">CC Total:</span>
                  <p className="tabular-nums font-semibold">{formatCurrency(totals.total_unpaid)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Commission:</span>
                  <p className="tabular-nums font-semibold">{formatCurrency(totals.commission)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Bank Fees:</span>
                  <p className="tabular-nums font-semibold">{formatCurrency(totals.bank_fee)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Delivery:</span>
                  <p className="tabular-nums font-semibold">{formatCurrency(totals.delivery_commission)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">HST:</span>
                  <p className="tabular-nums font-semibold">{formatCurrency(totals.hst)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Payable:</span>
                  <p className="tabular-nums font-semibold text-primary">{formatCurrency(totals.total)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
