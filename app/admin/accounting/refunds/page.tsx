"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, subDays } from "date-fns"
import { RefreshCw, DollarSign, FileText, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import { formatCurrency } from "@/lib/utils"
import { queryClient } from "@/lib/queryClient"

interface Refund {
  id: number
  order_id: number
  restaurant_id: number
  refund_amount: number
  original_order_total: number
  refund_type: "full" | "partial"
  reason_code: string
  notes: string | null
  stripe_refund_id: string | null
  stripe_payment_intent_id: string | null
  stripe_refund_status: string | null
  commission_reversed: number
  bank_fee_reversed: number
  transaction_fee_reversed: number
  hst_reversed: number
  adjustment_id: number | null
  applies_to_week_start: string | null
  applies_to_week_end: string | null
  refunded_by: number | null
  refunded_by_email: string | null
  status: string
  created_at: string
}

const REASON_LABELS: Record<string, string> = {
  customer_cancellation: "Customer Cancellation",
  restaurant_issue: "Restaurant Issue",
  platform_issue: "Platform Issue",
  fraud_chargeback: "Fraud / Chargeback",
  goodwill: "Goodwill",
  duplicate_order: "Duplicate Order",
  other: "Other",
}

const REASON_OPTIONS = [
  { value: "customer_cancellation", label: "Customer Cancellation" },
  { value: "restaurant_issue", label: "Restaurant Issue" },
  { value: "platform_issue", label: "Platform Issue" },
  { value: "fraud_chargeback", label: "Fraud / Chargeback" },
  { value: "goodwill", label: "Goodwill" },
  { value: "duplicate_order", label: "Duplicate Order" },
  { value: "other", label: "Other" },
]

function getReasonVariant(reason: string): "default" | "secondary" | "destructive" | "outline" {
  switch (reason) {
    case "fraud_chargeback":
      return "destructive"
    case "customer_cancellation":
    case "goodwill":
      return "secondary"
    case "restaurant_issue":
    case "platform_issue":
      return "outline"
    default:
      return "default"
  }
}

export default function RefundsPage() {
  const today = format(new Date(), "yyyy-MM-dd")
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd")

  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate] = useState(today)
  const [restaurantId, setRestaurantId] = useState("")
  const [reasonCode, setReasonCode] = useState("")

  const { data: restaurantsData } = useRestaurants()
  const restaurants: { id: number; name: string }[] = useMemo(() => {
    if (!restaurantsData) return []
    return (restaurantsData as any).restaurants || restaurantsData || []
  }, [restaurantsData])

  const restaurantMap = useMemo(() => {
    const map: Record<number, string> = {}
    restaurants.forEach((r) => {
      map[r.id] = r.name
    })
    return map
  }, [restaurants])

  const { data: refunds = [], isLoading } = useQuery<Refund[]>({
    queryKey: ['/api/refunds', startDate, endDate, restaurantId, reasonCode],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (restaurantId) params.set('restaurantId', restaurantId)
      if (reasonCode) params.set('reasonCode', reasonCode)
      const res = await fetch(`/api/refunds?${params}`)
      if (!res.ok) throw new Error('Failed to fetch refunds')
      return res.json()
    },
  })

  const summary = useMemo(() => {
    let totalAmount = 0
    refunds.forEach((r) => {
      totalAmount += parseFloat(String(r.refund_amount))
    })
    return {
      count: refunds.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
    }
  }, [refunds])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/refunds'] })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-row items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Refunds</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Track all refunds processed through the platform
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter refunds by date range, restaurant, and reason</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Restaurant</Label>
              <Select value={restaurantId || "all"} onValueChange={(v) => setRestaurantId(v === "all" ? "" : v)}>
                <SelectTrigger data-testid="select-restaurant">
                  <SelectValue placeholder="All Restaurants" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Restaurants</SelectItem>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reasonCode || "all"} onValueChange={(v) => setReasonCode(v === "all" ? "" : v)}>
                <SelectTrigger data-testid="select-reason">
                  <SelectValue placeholder="All Reasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  {REASON_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-row gap-4 flex-wrap">
        <Card className="flex-1 min-w-[200px]">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-count">
              {isLoading ? <Skeleton className="h-8 w-16" /> : summary.count}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[200px]">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount Refunded</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-amount">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(summary.totalAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Refund Records</CardTitle>
          <CardDescription>
            {startDate && endDate
              ? `${format(new Date(startDate + "T00:00:00"), "MMM d, yyyy")} — ${format(new Date(endDate + "T00:00:00"), "MMM d, yyyy")}`
              : "All dates"}
            {restaurantId && restaurantMap[parseInt(restaurantId)]
              ? ` for ${restaurantMap[parseInt(restaurantId)]}`
              : " for all restaurants"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              ))}
            </div>
          ) : refunds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4" />
              <p data-testid="text-empty-state">No refunds found for the selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Stripe Refund ID</TableHead>
                    <TableHead>Processed By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.map((refund) => (
                    <TableRow key={refund.id} data-testid={`row-refund-${refund.id}`}>
                      <TableCell className="font-medium" data-testid={`text-id-${refund.id}`}>
                        {refund.id}
                      </TableCell>
                      <TableCell data-testid={`text-order-${refund.id}`}>
                        #{refund.order_id}
                      </TableCell>
                      <TableCell data-testid={`text-restaurant-${refund.id}`}>
                        {restaurantMap[refund.restaurant_id] || `#${refund.restaurant_id}`}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600" data-testid={`text-amount-${refund.id}`}>
                        {formatCurrency(parseFloat(String(refund.refund_amount)))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={refund.refund_type === "full" ? "destructive" : "secondary"}
                          data-testid={`badge-type-${refund.id}`}
                        >
                          {refund.refund_type === "full" ? "Full" : "Partial"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getReasonVariant(refund.reason_code)}
                          data-testid={`badge-reason-${refund.id}`}
                        >
                          {REASON_LABELS[refund.reason_code] || refund.reason_code}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-stripe-id-${refund.id}`}>
                        {refund.stripe_refund_id ? (
                          <span className="font-mono text-xs">
                            {refund.stripe_refund_id.length > 20
                              ? `${refund.stripe_refund_id.slice(0, 20)}...`
                              : refund.stripe_refund_id}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-processed-by-${refund.id}`}>
                        {refund.refunded_by_email || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid={`text-date-${refund.id}`}>
                        {format(new Date(refund.created_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
