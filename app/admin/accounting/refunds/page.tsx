"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { Search, Loader2, AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import { formatCurrency } from "@/lib/utils"
import { queryClient } from "@/lib/queryClient"

interface Transaction {
  id: number
  order_number: string | null
  total_amount: number
  subtotal: number
  delivery_fee: number
  tax_amount: number
  tip_amount: number
  payment_status: string
  stripe_payment_intent_id: string
  payment_method: string
  created_at: string
  restaurant_id: number
  restaurant_name: string
  customer_email: string | null
  customer_name: string | null
  is_test_order: boolean
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

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "succeeded", label: "Succeeded" },
  { value: "partially_refunded", label: "Partial Refund" },
  { value: "refunded", label: "Refunded" },
]

function getStatusBadge(status: string) {
  switch (status) {
    case "succeeded":
    case "paid":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-status-${status}`}>Succeeded</Badge>
    case "refunded":
      return <Badge variant="destructive" data-testid={`badge-status-${status}`}>Refunded</Badge>
    case "partially_refunded":
      return <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-status-${status}`}>Partial Refund</Badge>
    case "uncaptured":
      return <Badge variant="outline" data-testid={`badge-status-${status}`}>Uncaptured</Badge>
    default:
      return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>
  }
}

export default function TransactionsPage() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [restaurantId, setRestaurantId] = useState("")
  const [page, setPage] = useState(0)
  const limit = 50

  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null)
  const [refundType, setRefundType] = useState<"full" | "partial">("full")
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(0)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setSearch(searchInput)
      setPage(0)
    }
  }, [searchInput])

  const { data, isLoading } = useQuery<{ transactions: Transaction[]; total: number }>({
    queryKey: ["/api/transactions", search, statusFilter, restaurantId, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      if (restaurantId) params.set("restaurantId", restaurantId)
      params.set("limit", String(limit))
      params.set("offset", String(page * limit))
      const res = await fetch(`/api/transactions?${params}`)
      if (!res.ok) throw new Error("Failed to fetch transactions")
      return res.json()
    },
  })

  const transactions = data?.transactions || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] })
  }

  const openRefundDialog = (tx: Transaction) => {
    setRefundTarget(tx)
    setRefundType("full")
    setRefundAmount(String(tx.total_amount))
    setReasonCode("")
    setRefundNotes("")
    setRefundError(null)
    setRefundSuccess(false)
    setRefundResult(null)
    setShowConfirmation(false)
    setIsRefunding(false)
  }

  const closeRefundDialog = () => {
    setRefundTarget(null)
    setRefundType("full")
    setRefundAmount("")
    setReasonCode("")
    setRefundNotes("")
    setRefundError(null)
    setRefundSuccess(false)
    setRefundResult(null)
    setShowConfirmation(false)
    setIsRefunding(false)
  }

  const getRefundAmountValue = () => {
    if (!refundTarget) return 0
    if (refundType === "full") return refundTarget.total_amount
    return parseFloat(refundAmount) || 0
  }

  const handleRefundSubmit = () => {
    if (!reasonCode) {
      setRefundError("Please select a reason")
      return
    }
    if (!refundTarget) return
    const orderTotal = refundTarget.total_amount
    if (refundType === "partial" && (!refundAmount || parseFloat(refundAmount) <= 0)) {
      setRefundError("Please enter a valid refund amount")
      return
    }
    if (refundType === "partial" && parseFloat(refundAmount) > orderTotal) {
      setRefundError("Refund amount cannot exceed order total")
      return
    }
    setRefundError(null)
    setShowConfirmation(true)
  }

  const processRefund = async () => {
    if (!refundTarget) return
    setShowConfirmation(false)
    setIsRefunding(true)
    setRefundError(null)

    const orderTotal = refundTarget.total_amount

    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: refundTarget.id,
          refund_amount: refundType === "full" ? orderTotal : parseFloat(refundAmount),
          refund_type: refundType,
          reason_code: reasonCode,
          notes: refundNotes || null,
        }),
      })

      const responseData = await res.json()

      if (!res.ok) {
        setRefundError(responseData.error || "Failed to process refund")
        return
      }

      setRefundSuccess(true)
      setRefundResult(responseData)
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] })
    } catch (err: any) {
      setRefundError(err.message || "Network error occurred")
    } finally {
      setIsRefunding(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-row items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Transactions</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            View all card payments and issue refunds
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, order #, or payment ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? "default" : "ghost"}
              size="sm"
              className="toggle-elevate"
              onClick={() => { setStatusFilter(tab.value); setPage(0) }}
              data-testid={`button-status-${tab.value || "all"}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <Select value={restaurantId || "all"} onValueChange={(v) => { setRestaurantId(v === "all" ? "" : v); setPage(0) }}>
          <SelectTrigger className="w-[200px]" data-testid="select-restaurant">
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

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p data-testid="text-empty-state">No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                      <TableCell className="font-medium whitespace-nowrap" data-testid={`text-amount-${tx.id}`}>
                        {formatCurrency(parseFloat(String(tx.total_amount)), "CAD")}
                      </TableCell>
                      <TableCell data-testid={`cell-status-${tx.id}`}>
                        {getStatusBadge(tx.payment_status)}
                      </TableCell>
                      <TableCell data-testid={`text-description-${tx.id}`}>
                        Order #{tx.order_number || tx.id}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-customer-${tx.id}`}>
                        {tx.customer_email || tx.customer_name || "N/A"}
                      </TableCell>
                      <TableCell data-testid={`text-restaurant-${tx.id}`}>
                        {tx.restaurant_name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground" data-testid={`text-date-${tx.id}`}>
                        {format(new Date(tx.created_at), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        {(tx.payment_status === "succeeded" || tx.payment_status === "paid" || tx.payment_status === "partially_refunded") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRefundDialog(tx)}
                            data-testid={`button-refund-${tx.id}`}
                          >
                            Refund
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
            Showing {page * limit + 1}--{Math.min((page + 1) * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              data-testid="button-prev-page"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!refundTarget} onOpenChange={(open) => { if (!open) closeRefundDialog() }}>
        <DialogContent className="max-w-lg" data-testid="dialog-refund">
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              Process a Stripe refund and create the accounting adjustment automatically.
            </DialogDescription>
          </DialogHeader>

          {refundSuccess ? (
            <div className="space-y-4" data-testid="refund-success-section">
              <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4 space-y-2">
                <p className="font-semibold text-green-800 dark:text-green-200">Refund processed successfully</p>
                <div className="text-sm space-y-1 text-green-700 dark:text-green-300">
                  <p>Order #{refundTarget?.order_number || refundTarget?.id} - {formatCurrency(getRefundAmountValue(), "CAD")} refunded</p>
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
              <Button variant="outline" onClick={closeRefundDialog} className="w-full" data-testid="button-done">
                Done
              </Button>
            </div>
          ) : refundTarget ? (
            <div className="space-y-4" data-testid="refund-form-section">
              <div className="rounded-md border p-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Order:</span> #{refundTarget.order_number || refundTarget.id}</p>
                <p><span className="text-muted-foreground">Restaurant:</span> {refundTarget.restaurant_name}</p>
                <p><span className="text-muted-foreground">Customer:</span> {refundTarget.customer_email || refundTarget.customer_name || "N/A"}</p>
                <p><span className="text-muted-foreground">Total:</span> {formatCurrency(parseFloat(String(refundTarget.total_amount)), "CAD")}</p>
              </div>

              <div className="space-y-2">
                <Label>Refund Type</Label>
                <RadioGroup
                  value={refundType}
                  onValueChange={(v) => setRefundType(v as "full" | "partial")}
                  data-testid="radio-refund-type"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="full" id="refund-full" data-testid="radio-full" />
                    <Label htmlFor="refund-full">Full Refund ({formatCurrency(parseFloat(String(refundTarget.total_amount)), "CAD")})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="partial" id="refund-partial" data-testid="radio-partial" />
                    <Label htmlFor="refund-partial">Partial Refund</Label>
                  </div>
                </RadioGroup>
              </div>

              {refundType === "partial" && (
                <div className="space-y-2">
                  <Label htmlFor="refund-amount">Refund Amount</Label>
                  <Input
                    id="refund-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={refundTarget.total_amount}
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
                  <SelectTrigger data-testid="select-reason">
                    <SelectValue placeholder="Select a reason" />
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
                  placeholder="Additional details about this refund..."
                  data-testid="input-refund-notes"
                />
              </div>

              <div className="rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 p-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This will issue a refund through Stripe and create an accounting adjustment for the current statement period. This action cannot be undone.
                </p>
              </div>

              {refundError && (
                <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-3">
                  <p className="text-sm text-red-700 dark:text-red-300" data-testid="text-refund-error">{refundError}</p>
                </div>
              )}

              <Button
                variant="destructive"
                onClick={handleRefundSubmit}
                disabled={isRefunding}
                className="w-full"
                data-testid="button-process-refund"
              >
                {isRefunding ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Process Refund
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent data-testid="dialog-confirm-refund">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to refund {formatCurrency(getRefundAmountValue(), "CAD")} for Order #{refundTarget?.order_number || refundTarget?.id}? This will process a refund through Stripe and cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={processRefund} data-testid="button-confirm-refund">
              Confirm Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
