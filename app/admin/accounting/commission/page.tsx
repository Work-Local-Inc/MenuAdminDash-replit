"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { format, startOfWeek, subWeeks, addDays } from "date-fns"
import { CalendarIcon, Download, FileText, Save, ArrowUpDown, Search, TrendingUp, TrendingDown, Minus, CheckCircle } from "lucide-react"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface CommissionRestaurant {
  restaurant_id: number
  restaurant_name: string
  restaurant_address: string
  this_week: number
  prev_week: number
  carry_value: number
  net_paid: number
  next_week: number
  has_snapshot: boolean
  commission: number
  weekly_commission: number
  transaction_fees: number
  bank_fees: number
  delivery_commission: number
  hst: number
}

interface CommissionReportData {
  week_start: string
  week_end: string
  restaurants: CommissionRestaurant[]
  totals: {
    this_week: number
    prev_week: number
    carry_value: number
    net_paid: number
    next_week: number
  }
}

type SortField = 'name' | 'next_week'
type SortDirection = 'asc' | 'desc'
type FilterType = 'all' | 'positive' | 'negative' | 'zero'

export default function CommissionReportPage() {
  const lastMonday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const previousMonday = subWeeks(lastMonday, 1)
  const previousSunday = addDays(previousMonday, 6)

  const [weekStart, setWeekStart] = useState<Date>(previousMonday)
  const [weekEnd, setWeekEnd] = useState<Date>(previousSunday)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>('next_week')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filterType, setFilterType] = useState<FilterType>('all')

  const { toast } = useToast()

  const weekStartStr = format(weekStart, "yyyy-MM-dd")
  const weekEndStr = format(weekEnd, "yyyy-MM-dd")

  const reportQueryKey = `/api/reports/commission-report?weekStart=${weekStartStr}&weekEnd=${weekEndStr}`

  const { data, isLoading } = useQuery<CommissionReportData>({
    queryKey: [reportQueryKey],
  })

  const snapshotMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/reports/commission-report", {
        method: "POST",
        body: JSON.stringify({ weekStart: weekStartStr, weekEnd: weekEndStr }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [reportQueryKey],
      })
      toast({
        title: "Snapshot saved",
        description: `Weekly snapshot for ${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")} has been saved successfully.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save snapshot",
        description: error.message || "An error occurred while saving the snapshot.",
        variant: "destructive",
      })
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: (params: { restaurantId?: number; netPaid?: number; markAllPaid?: boolean }) =>
      apiRequest("/api/reports/commission-report", {
        method: "PATCH",
        body: JSON.stringify({
          weekStart: weekStartStr,
          restaurantId: params.restaurantId,
          netPaid: params.netPaid,
          markAllPaid: params.markAllPaid,
        }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [reportQueryKey],
      })
      toast({
        title: "Marked as paid",
        description: variables.markAllPaid
          ? "All restaurants have been marked as paid for this week."
          : "Restaurant has been marked as paid for this week.",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark as paid",
        description: error.message || "An error occurred while updating payment status.",
        variant: "destructive",
      })
    },
  })

  const formatCurrency = (amount: number) => {
    const sign = amount < 0 ? '-' : ''
    return `${sign}$${Math.abs(amount).toFixed(2)}`
  }

  const filteredAndSorted = useMemo(() => {
    if (!data?.restaurants) return []

    let filtered = data.restaurants.filter(r => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        if (!r.restaurant_name.toLowerCase().includes(search) &&
            !r.restaurant_address?.toLowerCase().includes(search) &&
            !r.restaurant_id.toString().includes(search)) {
          return false
        }
      }

      switch (filterType) {
        case 'positive':
          return r.next_week > 0
        case 'negative':
          return r.next_week < 0
        case 'zero':
          return r.next_week === 0
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
        case 'next_week':
          comparison = a.next_week - b.next_week
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [data?.restaurants, searchTerm, sortField, sortDirection, filterType])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const stats = useMemo(() => {
    if (!data?.restaurants) return { positive: 0, negative: 0, zero: 0 }
    return {
      positive: data.restaurants.filter(r => r.next_week > 0).length,
      negative: data.restaurants.filter(r => r.next_week < 0).length,
      zero: data.restaurants.filter(r => r.next_week === 0).length,
    }
  }, [data?.restaurants])

  const downloadCSV = () => {
    if (!data?.restaurants) return

    const titleRow = `"Net paid from ${weekStartStr} to ${weekEndStr}"`
    const headers = ['ID', 'Name', 'Address', 'Amount Payable']

    const rows = filteredAndSorted.map(r => [
      r.restaurant_id,
      `"${r.restaurant_name.replace(/"/g, '""')}"`,
      `"${(r.restaurant_address || '').replace(/"/g, '""')}"`,
      r.next_week.toFixed(2),
    ].join(','))

    const total = filteredAndSorted.reduce((sum, r) => sum + r.next_week, 0)
    const totalsRow = [
      '',
      '"TOTALS"',
      '',
      total.toFixed(2),
    ].join(',')

    const csvContent = [titleRow, headers.join(','), ...rows, '', totalsRow].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `commission-report-${weekStartStr}-to-${weekEndStr}.csv`
    link.click()
  }

  const dateRange = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <FileText className="h-6 w-6" />
              Commission Report
            </h1>
            <p className="text-muted-foreground mt-1">
              Weekly commission report with carry-over balances
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!data?.restaurants?.length || markPaidMutation.isPending}
                  data-testid="button-mark-all-paid"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {markPaidMutation.isPending ? "Updating..." : "Mark All Paid"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mark All Restaurants as Paid?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will set net_paid equal to next_week_balance for all restaurants in the {dateRange} snapshot. A snapshot must be saved first.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-mark-all-cancel">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => markPaidMutation.mutate({ markAllPaid: true })}
                    data-testid="button-mark-all-confirm"
                  >
                    Mark All Paid
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  disabled={!data?.restaurants?.length || snapshotMutation.isPending}
                  data-testid="button-snapshot-week"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {snapshotMutation.isPending ? "Saving..." : "Snapshot Week"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Save Weekly Snapshot?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will save the current week&apos;s data as the carry-over for next week. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-snapshot-cancel">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => snapshotMutation.mutate()}
                    data-testid="button-snapshot-confirm"
                  >
                    Save Snapshot
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              onClick={downloadCSV}
              disabled={!data?.restaurants?.length}
              variant="outline"
              data-testid="button-download-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Period</CardTitle>
            <CardDescription>Select the week to generate the commission report</CardDescription>
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
                      data-testid="button-week-start"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(weekStart, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
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

              <div className="flex-1 space-y-2">
                <Label>Week End (Sunday)</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  disabled
                  data-testid="button-week-end"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(weekEnd, "PPP")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card
              className={cn("cursor-pointer hover-elevate", filterType === 'positive' && "ring-2 ring-green-500")}
              onClick={() => setFilterType(filterType === 'positive' ? 'all' : 'positive')}
              data-testid="card-filter-positive"
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Positive</span>
                </div>
                <p className="text-2xl font-bold text-green-600 mt-1" data-testid="text-count-positive">{stats.positive}</p>
                {filterType === 'positive' && <Badge variant="secondary" className="mt-2">Filtered</Badge>}
              </CardContent>
            </Card>

            <Card
              className={cn("cursor-pointer hover-elevate", filterType === 'negative' && "ring-2 ring-red-500")}
              onClick={() => setFilterType(filterType === 'negative' ? 'all' : 'negative')}
              data-testid="card-filter-negative"
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Negative</span>
                </div>
                <p className="text-2xl font-bold text-red-600 mt-1" data-testid="text-count-negative">{stats.negative}</p>
                {filterType === 'negative' && <Badge variant="secondary" className="mt-2">Filtered</Badge>}
              </CardContent>
            </Card>

            <Card
              className={cn("cursor-pointer hover-elevate", filterType === 'zero' && "ring-2 ring-muted-foreground")}
              onClick={() => setFilterType(filterType === 'zero' ? 'all' : 'zero')}
              data-testid="card-filter-zero"
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Zero</span>
                </div>
                <p className="text-2xl font-bold text-muted-foreground mt-1" data-testid="text-count-zero">{stats.zero}</p>
                {filterType === 'zero' && <Badge variant="secondary" className="mt-2">Filtered</Badge>}
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg">Commission Data ({filteredAndSorted.length})</CardTitle>
              <CardDescription>{dateRange}</CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search restaurants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full sm:w-64"
                  data-testid="input-search"
                />
              </div>
              {filterType !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterType('all')}
                  data-testid="button-clear-filter"
                >
                  Clear Filter
                </Button>
              )}
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
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('name')}
                        data-testid="header-restaurant"
                      >
                        <div className="flex items-center gap-1">
                          Restaurant
                          <ArrowUpDown className={cn("h-3 w-3", sortField === 'name' && "text-primary")} />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">This Week</TableHead>
                      <TableHead className="text-right">Prev Week</TableHead>
                      <TableHead className="text-right">Carry Value</TableHead>
                      <TableHead className="text-right">Net Paid</TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('next_week')}
                        data-testid="header-next-week"
                      >
                        <div className="flex items-center justify-end gap-1">
                          Next Week
                          <ArrowUpDown className={cn("h-3 w-3", sortField === 'next_week' && "text-primary")} />
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSorted.map((r) => (
                      <TableRow
                        key={r.restaurant_id}
                        data-testid={`row-restaurant-${r.restaurant_id}`}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{r.restaurant_name}</span>
                            {r.restaurant_address && (
                              <span className="text-xs text-muted-foreground" data-testid={`text-address-${r.restaurant_id}`}>{r.restaurant_address}</span>
                            )}
                            <span className="text-xs text-muted-foreground">ID: {r.restaurant_id}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(r.this_week)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(r.prev_week)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(r.carry_value)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(r.net_paid)}</TableCell>
                        <TableCell className={cn(
                          "text-right font-mono font-bold",
                          r.next_week < 0 && "text-red-600",
                          r.next_week > 0 && "text-green-600"
                        )}>
                          {formatCurrency(r.next_week)}
                        </TableCell>
                        <TableCell className="text-center">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={r.next_week === 0 || markPaidMutation.isPending}
                                data-testid={`button-mark-paid-${r.restaurant_id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark Paid
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Mark as Paid?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will mark {r.restaurant_name} as paid with net_paid = {formatCurrency(r.next_week)} for the week of {dateRange}. A snapshot must be saved first.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-mark-paid-cancel-${r.restaurant_id}`}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => markPaidMutation.mutate({ restaurantId: r.restaurant_id, netPaid: r.next_week })}
                                  data-testid={`button-mark-paid-confirm-${r.restaurant_id}`}
                                >
                                  Confirm
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAndSorted.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No commission data found for this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {data && (
                  <div className="border-t mt-4 pt-4">
                    <Table>
                      <TableBody>
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>TOTALS</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(data.totals.this_week)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(data.totals.prev_week)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(data.totals.carry_value)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(data.totals.net_paid)}</TableCell>
                          <TableCell className={cn(
                            "text-right font-mono font-bold",
                            data.totals.next_week < 0 && "text-red-600",
                            data.totals.next_week > 0 && "text-green-600"
                          )}>
                            {formatCurrency(data.totals.next_week)}
                          </TableCell>
                          <TableCell />
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
