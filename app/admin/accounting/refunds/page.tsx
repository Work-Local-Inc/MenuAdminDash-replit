"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, subDays } from "date-fns"
import { RefreshCw, DollarSign, FileText, Hash, Plus, Search, Loader2, AlertTriangle } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  const [reasonFilter, setReasonFilter] = useState("")

  const [showNewRefund, setShowNewRefund] = useState(false)
  const [orderLookup, setOrderLookup] = useState("")
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [foundOrder, setFoundOrder] = useState<any>(null)

  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [refundAmount, setRefundAmount] = useState("")
  const [reasonCode, setReasonCode] = useState("")
  const [refundNotes, setRefundNotes] = useState("")
  const [isRefunding, setIsRefunding] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)
  const [refundSuccess, setRefundSuccess] = useState(false)
  const [refundResult, setRefundResult] = useState<any>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

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
    queryKey: ['/api/refunds', startDate, endDate, restaurantId, reasonFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (restaurantId) params.set('restaurantId', restaurantId)
      if (reasonFilter) params.set('reasonCode', reasonFilter)
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

  const resetNewRefundForm = () => {
    setShowNewRefund(false)
    setOrderLookup("")
    setIsLookingUp(false)
    setLookupError(null)
    setFoundOrder(null)
    setRefundType('full')
    setRefundAmount("")
    setReasonCode("")
    setRefundNotes("")
    setIsRefunding(false)
    setRefundError(null)
    setRefundSuccess(false)
    setRefundResult(null)
    setShowConfirmation(false)
  }

  const handleOrderLookup = async () => {
    const orderId = orderLookup.replace(/^#/, '').trim()
    if (!orderId) {
      setLookupError("Please enter an order number")
      return
    }

    setIsLookingUp(true)
    setLookupError(null)
    setFoundOrder(null)

    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setLookupError(data.error || `Order #${orderId} not found`)
        return
      }
      const order = await res.json()

      if (!order.stripe_payment_intent_id) {
        setLookupError("This order was not paid via card (no Stripe payment). Only card payments can be refunded.")
        return
      }

      if (order.payment_status === 'refunded') {
        setLookupError("This order has already been fully refunded.")
        return
      }

      setFoundOrder(order)
      setRefundAmount(String(order.total || order.total_amount || 0))
    } catch (err: any) {
      setLookupError(err.message || "Failed to look up order")
    } finally {
      setIsLookingUp(false)
    }
  }

  const getRefundAmountValue = () => {
    if (refundType === 'full') {
      return foundOrder?.total || foundOrder?.total_amount || 0
    }
    return parseFloat(refundAmount) || 0
  }

  const handleRefundSubmit = () => {
    if (!reasonCode) {
      setRefundError("Please select a reason")
      return
    }
    const orderTotal = foundOrder?.total || foundOrder?.total_amount || 0
    if (refundType === 'partial' && (!refundAmount || parseFloat(refundAmount) <= 0)) {
      setRefundError("Please enter a valid refund amount")
      return
    }
    if (refundType === 'partial' && parseFloat(refundAmount) > orderTotal) {
      setRefundError("Refund amount cannot exceed order total")
      return
    }
    setRefundError(null)
    setShowConfirmation(true)
  }

  const processRefund = async () => {
    if (!foundOrder) return
    setShowConfirmation(false)
    setIsRefunding(true)
    setRefundError(null)

    const orderTotal = foundOrder.total || foundOrder.total_amount || 0

    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: foundOrder.id,
          refund_amount: refundType === 'full' ? orderTotal : parseFloat(refundAmount),
          refund_type: refundType,
          reason_code: reasonCode,
          notes: refundNotes || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setRefundError(data.error || 'Failed to process refund')
        return
      }

      setRefundSuccess(true)
      setRefundResult(data)
      queryClient.invalidateQueries({ queryKey: ['/api/refunds'] })
    } catch (err: any) {
      setRefundError(err.message || 'Network error occurred')
    } finally {
      setIsRefunding(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-row items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Refunds</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Issue refunds and track all refunds processed through the platform
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowNewRefund(true)} data-testid="button-new-refund">
            <Plus className="h-4 w-4 mr-2" />
            New Refund
          </Button>
          <Button variant="outline" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
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
              <Select value={reasonFilter || "all"} onValueChange={(v) => setReasonFilter(v === "all" ? "" : v)}>
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
                    <TableHead className="text-right">Refund</TableHead>
                    <TableHead className="text-right">Original Total</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Commission Rev.</TableHead>
                    <TableHead className="text-right">Fees Rev.</TableHead>
                    <TableHead className="text-right">HST Rev.</TableHead>
                    <TableHead>Stripe ID</TableHead>
                    <TableHead>By</TableHead>
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
                      <TableCell className="text-right font-medium text-red-600 dark:text-red-400" data-testid={`text-amount-${refund.id}`}>
                        -{formatCurrency(parseFloat(String(refund.refund_amount)))}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground" data-testid={`text-original-${refund.id}`}>
                        {formatCurrency(parseFloat(String(refund.original_order_total)))}
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
                      <TableCell className="text-right text-muted-foreground" data-testid={`text-commission-${refund.id}`}>
                        {formatCurrency(parseFloat(String(refund.commission_reversed || 0)))}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground" data-testid={`text-fees-${refund.id}`}>
                        {formatCurrency(
                          parseFloat(String(refund.bank_fee_reversed || 0)) +
                          parseFloat(String(refund.transaction_fee_reversed || 0))
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground" data-testid={`text-hst-${refund.id}`}>
                        {formatCurrency(parseFloat(String(refund.hst_reversed || 0)))}
                      </TableCell>
                      <TableCell data-testid={`text-stripe-id-${refund.id}`}>
                        {refund.stripe_refund_id ? (
                          <span className="font-mono text-xs">
                            {refund.stripe_refund_id.length > 16
                              ? `${refund.stripe_refund_id.slice(0, 16)}...`
                              : refund.stripe_refund_id}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-processed-by-${refund.id}`}>
                        {refund.refunded_by_email || "-"}
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

      <Dialog open={showNewRefund} onOpenChange={(open) => { if (!open) resetNewRefundForm() }}>
        <DialogContent className="max-w-lg" data-testid="dialog-new-refund">
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              Look up an order by number, then issue a Stripe refund and create the accounting adjustment automatically.
            </DialogDescription>
          </DialogHeader>

          {refundSuccess ? (
            <div className="space-y-4" data-testid="refund-success-section">
              <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4 space-y-2">
                <p className="font-semibold text-green-800 dark:text-green-200">Refund processed successfully</p>
                <div className="text-sm space-y-1 text-green-700 dark:text-green-300">
                  <p>Order #{foundOrder?.id} - {formatCurrency(getRefundAmountValue(), 'CAD')} refunded</p>
                  {refundResult?.stripe_refund_id && (
                    <p>Stripe Refund: <span className="font-mono">{refundResult.stripe_refund_id}</span></p>
                  )}
                  <p>Accounting adjustment created for the current statement week.</p>
                  {refundResult?.fee_breakdown && (
                    <div className="mt-2 pt-2 border-t border-green-300 dark:border-green-700">
                      <p className="font-medium">Fee Reversals:</p>
                      <p>Commission: {formatCurrency(refundResult.fee_breakdown.commission_reversed || 0)}</p>
                      <p>Bank Fee: {formatCurrency(refundResult.fee_breakdown.bank_fee_reversed || 0)}</p>
                      <p>Transaction Fee: {formatCurrency(refundResult.fee_breakdown.transaction_fee_reversed || 0)}</p>
                      <p>HST: {formatCurrency(refundResult.fee_breakdown.hst_reversed || 0)}</p>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={resetNewRefundForm} className="w-full" data-testid="button-done">
                Done
              </Button>
            </div>
          ) : !foundOrder ? (
            <div className="space-y-4" data-testid="order-lookup-section">
              <div className="space-y-2">
                <Label htmlFor="order-lookup">Order Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="order-lookup"
                    placeholder="e.g. 160"
                    value={orderLookup}
                    onChange={(e) => { setOrderLookup(e.target.value); setLookupError(null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleOrderLookup() }}
                    data-testid="input-order-lookup"
                  />
                  <Button onClick={handleOrderLookup} disabled={isLookingUp} data-testid="button-lookup">
                    {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {lookupError && (
                <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-3" data-testid="lookup-error">
                  <p className="text-sm text-red-800 dark:text-red-200">{lookupError}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4" data-testid="refund-form-section">
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Order</span>
                    <span className="font-medium">#{foundOrder.id}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Restaurant</span>
                    <span className="font-medium">{restaurantMap[foundOrder.restaurant_id] || `#${foundOrder.restaurant_id}`}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">{foundOrder.customer_name || foundOrder.customer_email || '-'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Order Total</span>
                    <span className="font-bold">{formatCurrency(foundOrder.total || foundOrder.total_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Payment</span>
                    <span className="font-mono text-xs">{foundOrder.stripe_payment_intent_id?.slice(0, 20)}...</span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Refund Type</Label>
                <RadioGroup
                  value={refundType}
                  onValueChange={(val) => {
                    setRefundType(val as 'full' | 'partial')
                    if (val === 'full') {
                      setRefundAmount(String(foundOrder.total || foundOrder.total_amount || 0))
                    } else {
                      setRefundAmount("")
                    }
                  }}
                  data-testid="radio-refund-type"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="refund-full" data-testid="radio-full-refund" />
                    <Label htmlFor="refund-full" className="cursor-pointer">Full Refund ({formatCurrency(foundOrder.total || foundOrder.total_amount || 0)})</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="partial" id="refund-partial" data-testid="radio-partial-refund" />
                    <Label htmlFor="refund-partial" className="cursor-pointer">Partial Refund</Label>
                  </div>
                </RadioGroup>
              </div>

              {refundType === 'partial' && (
                <div className="space-y-2">
                  <Label htmlFor="refund-amount">Refund Amount</Label>
                  <Input
                    id="refund-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={foundOrder.total || foundOrder.total_amount || 0}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0.00"
                    data-testid="input-refund-amount"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={reasonCode} onValueChange={setReasonCode}>
                  <SelectTrigger data-testid="select-reason-code">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund-notes">Notes (optional)</Label>
                <Textarea
                  id="refund-notes"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="Additional notes about this refund..."
                  data-testid="textarea-refund-notes"
                />
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    This will issue a Stripe refund of {formatCurrency(getRefundAmountValue(), 'CAD')} to the customer and create an accounting adjustment to reverse the associated fees (commission, bank fees, HST).
                  </p>
                </div>
              </div>

              {refundError && (
                <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-3" data-testid="refund-error">
                  <p className="text-sm text-red-800 dark:text-red-200">{refundError}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleRefundSubmit}
                  disabled={isRefunding}
                  variant="destructive"
                  className="flex-1"
                  data-testid="button-process-refund"
                >
                  {isRefunding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Process Refund
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setFoundOrder(null)}
                  disabled={isRefunding}
                  data-testid="button-back"
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent data-testid="refund-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will refund {formatCurrency(getRefundAmountValue(), 'CAD')} to the customer via Stripe and create an accounting adjustment to reverse commission, bank fees, and HST. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={processRefund}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-refund"
            >
              Yes, Process Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
