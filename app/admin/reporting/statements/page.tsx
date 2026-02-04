"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, startOfWeek, endOfWeek, subWeeks, addDays } from "date-fns"
import { CalendarIcon, FileText, Printer, Search } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Restaurant {
  id: number
  name: string
  address?: string
}

interface StatementData {
  statement_number: string
  period_start: string
  period_end: string
  menu_hst_number: string
  restaurant: {
    id: number
    name: string
    contact_name: string
    address: string
    city: string
    postal_code: string
    phone: string
    hst_number?: string
  }
  summary: {
    cash_orders: { count: number; total: number }
    cc_orders: { count: number; total: number; bank_fees: number }
    interac_orders: { count: number; total: number; bank_fees: number }
  }
  fees: {
    commission: number
    commission_rate: number
    delivery_commission: number
    weekly_commission: number
    transaction_fees: number
    bank_fees: number
    hst: number
    total_fees: number
  }
  totals: {
    total_order_value: number
    total_unpaid: number
    delivery_tips: number
    delivery_fees: number
  }
  net_payable: number
}

export default function RestaurantStatementsPage() {
  const lastMonday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const previousMonday = subWeeks(lastMonday, 1)
  const previousSunday = addDays(previousMonday, 6)
  
  const [startDate, setStartDate] = useState<Date>(previousMonday)
  const [endDate, setEndDate] = useState<Date>(previousSunday)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")

  const { data: restaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
    select: (data: any) => data.restaurants || data,
  })

  const { data: statement, isLoading: isLoadingStatement } = useQuery<StatementData>({
    queryKey: [`/api/reports/statement?restaurantId=${selectedRestaurantId}&startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`],
    enabled: !!selectedRestaurantId,
  })

  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toString().includes(searchTerm)
  )

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  const handlePrint = () => {
    const printStyles = document.createElement('style')
    printStyles.id = 'print-styles'
    printStyles.innerHTML = `
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body {
          background: white !important;
        }
        .print-statement-container {
          max-width: 100% !important;
          margin: 0 !important;
          box-shadow: none !important;
        }
        .bg-red-600 {
          background-color: #dc2626 !important;
        }
        .bg-green-50 {
          background-color: #f0fdf4 !important;
        }
        .bg-gray-50 {
          background-color: #f9fafb !important;
        }
        .text-white {
          color: white !important;
        }
        .text-red-100 {
          color: #fee2e2 !important;
        }
        .text-green-700 {
          color: #15803d !important;
        }
        .border-green-200 {
          border-color: #bbf7d0 !important;
        }
      }
    `
    document.head.appendChild(printStyles)
    
    setTimeout(() => {
      window.print()
      document.getElementById('print-styles')?.remove()
    }, 100)
  }

  const dateRange = `${format(startDate, "yyyy-MM-dd")} - ${format(endDate, "yyyy-MM-dd")}`

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Restaurant Statements</h1>
          <p className="text-muted-foreground">
            Generate payment statements for individual restaurants
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 print:hidden">
          <CardHeader>
            <CardTitle>Statement Options</CardTitle>
            <CardDescription>
              Select restaurant and date range
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Search Restaurant</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-restaurant"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Restaurant</Label>
              <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
                <SelectTrigger data-testid="select-restaurant">
                  <SelectValue placeholder="Select a restaurant" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {filteredRestaurants.slice(0, 50).map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                      {restaurant.name} (#{restaurant.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Period End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {selectedRestaurantId && (
              <Button onClick={handlePrint} className="w-full" data-testid="button-print">
                <Printer className="mr-2 h-4 w-4" />
                Print Statement
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 print:shadow-none print:border-none print:col-span-3">
          <CardContent className="p-6 print:p-0">
            {!selectedRestaurantId ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p>Select a restaurant to generate statement</p>
              </div>
            ) : isLoadingStatement ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : statement ? (
              <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-sm print:shadow-none print:max-w-none print-statement-container" id="printable-statement">
                {/* Header with Logo */}
                <div className="bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center print:py-2">
                  <img 
                    src="https://nthpbtdjhhnwfxqsxbvy.supabase.co/storage/v1/object/public/email-assets/logo.png" 
                    alt="Menu.ca" 
                    className="h-10 print:h-8"
                  />
                </div>

                {/* Hero Section */}
                <div className="bg-red-600 px-6 py-8 text-center print:py-4">
                  <h1 className="text-2xl font-bold text-white print:text-xl">Statement</h1>
                  <p className="text-red-100 mt-1">Payment Summary for {statement.restaurant.name}</p>
                </div>

                {/* Statement Info */}
                <div className="px-6 py-6 print:py-4">
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Statement #</span>
                          <span className="font-semibold">{statement.statement_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Period</span>
                          <span className="font-semibold">{dateRange}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Customer ID</span>
                          <span className="font-semibold">{statement.restaurant.id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">PAID TO</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{statement.restaurant.name}</p>
                      {statement.restaurant.contact_name && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">{statement.restaurant.contact_name}</p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-300">{statement.restaurant.address}</p>
                      {(statement.restaurant.city || statement.restaurant.postal_code) && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {statement.restaurant.city}{statement.restaurant.city && statement.restaurant.postal_code ? ', ' : ''}{statement.restaurant.postal_code}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Transaction Summary */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="w-1 h-5 bg-red-600 rounded-full"></span>
                      Transaction Summary
                    </h2>
                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Orders</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Paid Directly</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Unpaid</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Bank Fees</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Owed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          <tr className="bg-white dark:bg-gray-900">
                            <td className="py-3 px-4 font-medium">Cash</td>
                            <td className="text-center py-3 px-4">{statement.summary.cash_orders.count}</td>
                            <td className="text-right py-3 px-4">{formatCurrency(statement.summary.cash_orders.total)}</td>
                            <td className="text-right py-3 px-4 text-gray-400">—</td>
                            <td className="text-right py-3 px-4 text-gray-400">—</td>
                            <td className="text-right py-3 px-4 font-medium">{formatCurrency(0)}</td>
                          </tr>
                          <tr className="bg-white dark:bg-gray-900">
                            <td className="py-3 px-4 font-medium">Credit Card</td>
                            <td className="text-center py-3 px-4">{statement.summary.cc_orders.count}</td>
                            <td className="text-right py-3 px-4 text-gray-400">—</td>
                            <td className="text-right py-3 px-4">{formatCurrency(statement.summary.cc_orders.total)}</td>
                            <td className="text-right py-3 px-4">{formatCurrency(statement.summary.cc_orders.bank_fees)}</td>
                            <td className="text-right py-3 px-4 font-medium">{formatCurrency(statement.summary.cc_orders.total)}</td>
                          </tr>
                          <tr className="bg-white dark:bg-gray-900">
                            <td className="py-3 px-4 font-medium">Interac®</td>
                            <td className="text-center py-3 px-4">{statement.summary.interac_orders.count}</td>
                            <td className="text-right py-3 px-4 text-gray-400">—</td>
                            <td className="text-right py-3 px-4">{formatCurrency(statement.summary.interac_orders.total)}</td>
                            <td className="text-right py-3 px-4">{formatCurrency(statement.summary.interac_orders.bank_fees)}</td>
                            <td className="text-right py-3 px-4 font-medium">{formatCurrency(statement.summary.interac_orders.total)}</td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-800 font-semibold">
                          <tr>
                            <td className="py-3 px-4">Total</td>
                            <td className="text-center py-3 px-4">
                              {statement.summary.cash_orders.count + statement.summary.cc_orders.count + statement.summary.interac_orders.count}
                            </td>
                            <td className="text-right py-3 px-4">{formatCurrency(statement.summary.cash_orders.total)}</td>
                            <td className="text-right py-3 px-4">{formatCurrency(statement.totals.total_unpaid)}</td>
                            <td className="text-right py-3 px-4">{formatCurrency(statement.fees.bank_fees)}</td>
                            <td className="text-right py-3 px-4">{formatCurrency(statement.totals.total_unpaid)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Fees & Deductions */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="w-1 h-5 bg-red-600 rounded-full"></span>
                      Fees & Deductions
                    </h2>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        <div className="flex justify-between py-3 px-4">
                          <span className="text-gray-600 dark:text-gray-300">Commission ({statement.fees.commission_rate}%)</span>
                          <span className="font-medium">-{formatCurrency(statement.fees.commission)}</span>
                        </div>
                        {statement.fees.weekly_commission > 0 && (
                          <div className="flex justify-between py-3 px-4">
                            <span className="text-gray-600 dark:text-gray-300">Weekly Commission</span>
                            <span className="font-medium">-{formatCurrency(statement.fees.weekly_commission)}</span>
                          </div>
                        )}
                        {statement.fees.delivery_commission > 0 && (
                          <div className="flex justify-between py-3 px-4">
                            <span className="text-gray-600 dark:text-gray-300">Delivery Commission</span>
                            <span className="font-medium">-{formatCurrency(statement.fees.delivery_commission)}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-3 px-4">
                          <span className="text-gray-600 dark:text-gray-300">Transaction Fees</span>
                          <span className="font-medium">-{formatCurrency(statement.fees.transaction_fees)}</span>
                        </div>
                        <div className="flex justify-between py-3 px-4">
                          <span className="text-gray-600 dark:text-gray-300">Bank Fees</span>
                          <span className="font-medium">-{formatCurrency(statement.fees.bank_fees)}</span>
                        </div>
                        <div className="flex justify-between py-3 px-4">
                          <span className="text-gray-600 dark:text-gray-300">HST (13%)</span>
                          <span className="font-medium">-{formatCurrency(statement.fees.hst)}</span>
                        </div>
                        <div className="flex justify-between py-3 px-4 bg-gray-100 dark:bg-gray-700 font-semibold">
                          <span>Total Fees</span>
                          <span className="text-red-600">-{formatCurrency(statement.fees.total_fees)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Payment */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6 text-center">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">NET PAYMENT</p>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-400">{formatCurrency(statement.net_payable)}</p>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                      {statement.totals.total_unpaid > 0 ? `${formatCurrency(statement.totals.total_unpaid)} collected - ${formatCurrency(statement.fees.total_fees)} fees` : 'No credit card orders this period'}
                    </p>
                  </div>

                  {/* Delivery Breakdown (if applicable) */}
                  {(statement.totals.delivery_tips > 0 || statement.totals.delivery_fees > 0) && (
                    <div className="mt-6">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-red-600 rounded-full"></span>
                        Delivery Breakdown
                      </h2>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Delivery Fees</span>
                            <span className="font-medium">{formatCurrency(statement.totals.delivery_fees)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Delivery Tips</span>
                            <span className="font-medium">{formatCurrency(statement.totals.delivery_tips)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-800 px-6 py-6 border-t border-gray-200 dark:border-gray-700 text-center print:py-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Allow three business days for payment</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Payments made under "Local Media Concepts Inc."</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">HST: {statement.menu_hst_number}</p>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Powered by Menu.ca</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Connecting you with local restaurants</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No statement data available for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
