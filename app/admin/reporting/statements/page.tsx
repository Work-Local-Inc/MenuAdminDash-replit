"use client"

import { useState } from "react"
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
    window.print()
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
              <div className="space-y-6 text-sm print:text-xs" id="printable-statement">
                <div className="flex justify-between items-start">
                  <div></div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold print:text-lg">Statement</h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24">Date:</span>
                      <span>{dateRange}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24">Statement #</span>
                      <span>{statement.statement_number}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24">Customer ID</span>
                      <span>{statement.restaurant.id}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">HST: {statement.menu_hst_number}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground">Paid to:</p>
                  <div className="pl-8">
                    {statement.restaurant.contact_name && (
                      <p className="font-medium">{statement.restaurant.contact_name}</p>
                    )}
                    <p className="font-medium">{statement.restaurant.name}</p>
                    <p>{statement.restaurant.address}</p>
                    {(statement.restaurant.city || statement.restaurant.postal_code) && (
                      <p>{statement.restaurant.city}{statement.restaurant.city && statement.restaurant.postal_code ? ', ' : ''}{statement.restaurant.postal_code}</p>
                    )}
                    {statement.restaurant.phone && <p>{statement.restaurant.phone}</p>}
                  </div>
                </div>

                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-1">Date</th>
                      <th className="text-left py-2 px-1">Description</th>
                      <th className="text-center py-2 px-1">Total Transactions</th>
                      <th className="text-right py-2 px-1">Total Amount Paid Directly</th>
                      <th className="text-right py-2 px-1">Total Amount Unpaid</th>
                      <th className="text-right py-2 px-1">Total Bank Fees</th>
                      <th className="text-right py-2 px-1">Total owed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-1">{dateRange}</td>
                      <td className="py-2 px-1">Cash Transactions</td>
                      <td className="text-center py-2 px-1">{statement.summary.cash_orders.count}</td>
                      <td className="text-right py-2 px-1">{formatCurrency(statement.summary.cash_orders.total)}</td>
                      <td className="text-right py-2 px-1 text-muted-foreground">N/A</td>
                      <td className="text-right py-2 px-1 text-muted-foreground">N/A</td>
                      <td className="text-right py-2 px-1">{formatCurrency(0)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-1">{dateRange}</td>
                      <td className="py-2 px-1">Credit Card Transactions</td>
                      <td className="text-center py-2 px-1">{statement.summary.cc_orders.count}</td>
                      <td className="text-right py-2 px-1 text-muted-foreground">N/A</td>
                      <td className="text-right py-2 px-1">{formatCurrency(statement.summary.cc_orders.total)}</td>
                      <td className="text-right py-2 px-1">{formatCurrency(statement.summary.cc_orders.bank_fees)}</td>
                      <td className="text-right py-2 px-1">{formatCurrency(statement.summary.cc_orders.total)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-1">{dateRange}</td>
                      <td className="py-2 px-1">Interac® Transactions</td>
                      <td className="text-center py-2 px-1">{statement.summary.interac_orders.count}</td>
                      <td className="text-right py-2 px-1 text-muted-foreground">N/A</td>
                      <td className="text-right py-2 px-1">{formatCurrency(statement.summary.interac_orders.total)}</td>
                      <td className="text-right py-2 px-1">{formatCurrency(statement.summary.interac_orders.bank_fees)}</td>
                      <td className="text-right py-2 px-1">{formatCurrency(statement.summary.interac_orders.total)}</td>
                    </tr>
                    <tr className="font-medium">
                      <td className="py-2 px-1"></td>
                      <td className="py-2 px-1 text-right">Total:</td>
                      <td className="text-center py-2 px-1">
                        {statement.summary.cash_orders.count + statement.summary.cc_orders.count + statement.summary.interac_orders.count}
                      </td>
                      <td className="text-right py-2 px-1">{formatCurrency(statement.summary.cash_orders.total)}</td>
                      <td className="text-right py-2 px-1">{formatCurrency(statement.totals.total_unpaid)}</td>
                      <td className="text-right py-2 px-1">{formatCurrency(statement.fees.bank_fees)}</td>
                      <td className="text-right py-2 px-1">{formatCurrency(statement.totals.total_unpaid)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Credits and Charges</h3>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-1">Description</th>
                        <th className="text-left py-2 px-1">Date</th>
                        <th className="text-right py-2 px-1">Amount</th>
                        <th className="text-right py-2 px-1">Tax</th>
                        <th className="text-right py-2 px-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-medium">
                        <td className="py-2 px-1">Total Owed</td>
                        <td className="py-2 px-1"></td>
                        <td className="text-right py-2 px-1">{(statement.fees.total_fees - statement.fees.hst).toFixed(2)}</td>
                        <td className="text-right py-2 px-1">{statement.fees.hst.toFixed(2)}</td>
                        <td className="text-right py-2 px-1">{statement.fees.total_fees.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-2">Remittance</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Statement #</span>
                        <span>{statement.statement_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date</span>
                        <span>{dateRange}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total order value</span>
                        <span>{formatCurrency(statement.totals.total_order_value)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total amount unpaid</span>
                        <span>{formatCurrency(statement.totals.total_unpaid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Commission</span>
                        <span>{formatCurrency(statement.fees.commission)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery commission</span>
                        <span>{formatCurrency(statement.fees.delivery_commission)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weekly commission</span>
                        <span>{formatCurrency(statement.fees.weekly_commission)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transaction fee($)</span>
                        <span>{formatCurrency(statement.fees.transaction_fees)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bank fees</span>
                        <span>{formatCurrency(statement.fees.bank_fees)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>HST: {formatCurrency(statement.fees.hst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total fees</span>
                        <span>{formatCurrency(statement.fees.total_fees)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery fee and tips</span>
                        <span>{formatCurrency(statement.totals.delivery_tips + statement.totals.delivery_fees)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Charges owed</span>
                        <span>{formatCurrency(0)}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>Net Paid</span>
                        <span>{formatCurrency(statement.net_payable)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 invisible">Delivery</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Delivery service</span>
                        <span></span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery service tips</span>
                        <span>{formatCurrency(statement.totals.delivery_tips)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Commission</span>
                        <span>{statement.fees.delivery_commission.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery fee</span>
                        <span>{statement.totals.delivery_fees.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Allow three business days for payment</p>
                  <p>Payments will be made under the name "Local Media Concepts Inc."</p>
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
