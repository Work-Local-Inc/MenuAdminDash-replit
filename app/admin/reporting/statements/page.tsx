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
import { Separator } from "@/components/ui/separator"

interface Restaurant {
  id: number
  name: string
  address?: string
}

interface StatementData {
  statement_number: string
  period_start: string
  period_end: string
  restaurant: {
    id: number
    name: string
    address: string
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
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Restaurant Statements</h1>
          <p className="text-muted-foreground">
            Generate payment statements for individual restaurants
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
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

        <Card className="lg:col-span-2 print:shadow-none print:border-none">
          <CardContent className="p-6">
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
              <div className="space-y-6" id="printable-statement">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold">Menu.ca Payment Statement</h2>
                  <p className="text-sm text-muted-foreground">
                    Statement #{statement.statement_number}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold">{statement.restaurant.name}</p>
                    <p className="text-muted-foreground">{statement.restaurant.address}</p>
                    {statement.restaurant.hst_number && (
                      <p className="text-muted-foreground">HST: {statement.restaurant.hst_number}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p><span className="text-muted-foreground">Period:</span></p>
                    <p className="font-medium">
                      {format(new Date(statement.period_start), "MMM d, yyyy")} - {format(new Date(statement.period_end), "MMM d, yyyy")}
                    </p>
                    <p className="text-muted-foreground">Restaurant ID: {statement.restaurant.id}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Transaction Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1">
                      <span>Cash Orders ({statement.summary.cash_orders.count})</span>
                      <span className="font-mono">{formatCurrency(statement.summary.cash_orders.total)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Credit Card Orders ({statement.summary.cc_orders.count})</span>
                      <span className="font-mono">{formatCurrency(statement.summary.cc_orders.total)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Interac Orders ({statement.summary.interac_orders.count})</span>
                      <span className="font-mono">{formatCurrency(statement.summary.interac_orders.total)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Fee Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    {statement.fees.commission > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Commission ({(statement.fees.commission_rate * 100).toFixed(0)}%)</span>
                        <span className="font-mono text-destructive">-{formatCurrency(statement.fees.commission)}</span>
                      </div>
                    )}
                    {statement.fees.weekly_commission > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Weekly Commission</span>
                        <span className="font-mono text-destructive">-{formatCurrency(statement.fees.weekly_commission)}</span>
                      </div>
                    )}
                    {statement.fees.delivery_commission > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Delivery Commission</span>
                        <span className="font-mono text-destructive">-{formatCurrency(statement.fees.delivery_commission)}</span>
                      </div>
                    )}
                    {statement.fees.transaction_fees > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Transaction Fees</span>
                        <span className="font-mono text-destructive">-{formatCurrency(statement.fees.transaction_fees)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span>Bank Fees (Stripe)</span>
                      <span className="font-mono text-destructive">-{formatCurrency(statement.fees.bank_fees)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>HST (13%)</span>
                      <span className="font-mono text-destructive">-{formatCurrency(statement.fees.hst)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between py-1 font-semibold">
                      <span>Total Fees</span>
                      <span className="font-mono text-destructive">-{formatCurrency(statement.fees.total_fees)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Net Amount Payable</span>
                    <span className="text-2xl font-bold font-mono text-primary">
                      {formatCurrency(statement.net_payable)}
                    </span>
                  </div>
                </div>

                <div className="text-center text-xs text-muted-foreground pt-4 border-t">
                  <p>This statement was generated by Menu.ca</p>
                  <p>For questions, contact accounting@menu.ca</p>
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
