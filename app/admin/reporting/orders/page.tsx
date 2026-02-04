"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { CalendarIcon, Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface OrderReportRow {
  order_id: string
  order_number: string
  date_placed: string
  order_time: string
  restaurant_id: number
  restaurant_name: string
  order_status: string
  order_type: string
  subtotal: number
  tax_amount: number
  delivery_fee: number
  tip_amount: number
  discount_amount: number
  total_amount: number
  payment_method: string
  payment_status: string
}

interface OrderReportTotals {
  total_orders: number
  total_amount: number
  total_cc: number
  total_cash: number
  total_interac: number
  total_tips: number
  total_tax: number
  total_delivery_fees: number
}

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom'

export default function DailyOrdersPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>('yesterday')
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 1))
  const [customEndDate, setCustomEndDate] = useState<Date>(subDays(new Date(), 1))

  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    switch (datePreset) {
      case 'today':
        return { startDate: startOfDay(now), endDate: endOfDay(now) }
      case 'yesterday':
        const yesterday = subDays(now, 1)
        return { startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) }
      case 'this_week':
        const thisWeekStart = new Date(now)
        thisWeekStart.setDate(now.getDate() - now.getDay() + 1)
        return { startDate: startOfDay(thisWeekStart), endDate: endOfDay(now) }
      case 'last_week':
        const lastWeekStart = new Date(now)
        lastWeekStart.setDate(now.getDate() - now.getDay() - 6)
        const lastWeekEnd = new Date(lastWeekStart)
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6)
        return { startDate: startOfDay(lastWeekStart), endDate: endOfDay(lastWeekEnd) }
      case 'this_month':
        return { startDate: startOfMonth(now), endDate: endOfDay(now) }
      case 'last_month':
        const lastMonth = subMonths(now, 1)
        return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) }
      case 'custom':
        return { startDate: startOfDay(customStartDate), endDate: endOfDay(customEndDate) }
      default:
        return { startDate: startOfDay(now), endDate: endOfDay(now) }
    }
  }, [datePreset, customStartDate, customEndDate])

  const { data, isLoading, error } = useQuery<{ orders: OrderReportRow[], totals: OrderReportTotals }>({
    queryKey: [`/api/reports/orders?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`],
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      accepted: "secondary",
      pending: "outline",
      rejected: "destructive",
      cancelled: "destructive",
    }
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>
  }

  const getPaymentBadge = (method: string) => {
    const colors: Record<string, string> = {
      credit_card: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      cash: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      interac: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    }
    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", colors[method] || "bg-gray-100 text-gray-800")}>
        {method.replace('_', ' ')}
      </span>
    )
  }

  const handleExportCSV = () => {
    if (!data?.orders.length) return
    
    const headers = [
      "Order ID", "Order Number", "Date", "Time", "Restaurant ID", "Restaurant",
      "Status", "Type", "Subtotal", "Tax", "Delivery Fee", "Tip", "Discount", 
      "Total", "Payment Method", "Payment Status"
    ]
    
    const csvContent = [
      headers.join(","),
      ...data.orders.map(row => [
        row.order_id,
        `"${row.order_number}"`,
        row.date_placed,
        row.order_time,
        row.restaurant_id,
        `"${row.restaurant_name.replace(/"/g, '""')}"`,
        row.order_status,
        row.order_type,
        row.subtotal.toFixed(2),
        row.tax_amount.toFixed(2),
        row.delivery_fee.toFixed(2),
        row.tip_amount.toFixed(2),
        row.discount_amount.toFixed(2),
        row.total_amount.toFixed(2),
        row.payment_method,
        row.payment_status,
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `orders-report-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Orders Report</h1>
          <p className="text-muted-foreground">
            View orders by date range with transaction details
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger className="w-[180px]" data-testid="select-date-preset">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {datePreset === 'custom' && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[160px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(customStartDate, "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={(date) => date && setCustomStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[160px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(customEndDate, "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={(date) => date && setCustomEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}

            <div className="flex-1" />

            <Button onClick={handleExportCSV} disabled={!data?.orders.length}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Showing: {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
          </p>
        </CardContent>
      </Card>

      {data?.totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{data.totals.total_orders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(data.totals.total_amount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Credit Card</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.totals.total_cc)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Cash</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totals.total_cash)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Interac</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(data.totals.total_interac)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tips</p>
              <p className="text-2xl font-bold">{formatCurrency(data.totals.total_tips)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tax</p>
              <p className="text-2xl font-bold">{formatCurrency(data.totals.total_tax)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Delivery Fees</p>
              <p className="text-2xl font-bold">{formatCurrency(data.totals.total_delivery_fees)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {data?.orders.length || 0} orders found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load orders
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.orders.map((order) => (
                    <TableRow key={order.order_id} data-testid={`row-order-${order.order_id}`}>
                      <TableCell className="tabular-nums text-sm">{order.order_number}</TableCell>
                      <TableCell>
                        <div className="text-sm">{order.date_placed}</div>
                        <div className="text-xs text-muted-foreground">{order.order_time}</div>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={order.restaurant_name}>
                        {order.restaurant_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.order_type}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.order_status)}</TableCell>
                      <TableCell>{getPaymentBadge(order.payment_method)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(order.subtotal)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(order.tax_amount)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(order.total_amount)}</TableCell>
                      <TableCell>
                        <Link href={`/admin/orders/${order.order_id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.orders || data.orders.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No orders found for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
