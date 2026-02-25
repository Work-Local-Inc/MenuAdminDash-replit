"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
import { useOrders } from "@/lib/hooks/use-orders"
import { useQueryClient } from "@tanstack/react-query"
import { formatCurrency, formatDate, formatTime } from "@/lib/utils"
import { Search, Filter, Download, Eye, Loader2, XCircle } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function OrdersPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const [showRefundForm, setShowRefundForm] = useState(false)
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [refundAmount, setRefundAmount] = useState<string>("")
  const [reasonCode, setReasonCode] = useState<string>("")
  const [refundNotes, setRefundNotes] = useState<string>("")
  const [isRefunding, setIsRefunding] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)
  const [refundSuccess, setRefundSuccess] = useState(false)
  const [refundResultId, setRefundResultId] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelMarkRefunded, setCancelMarkRefunded] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelSuccess, setCancelSuccess] = useState(false)

  const queryClient = useQueryClient()

  const { data: orders = [], isLoading } = useOrders({
    status: statusFilter !== "all" ? statusFilter : undefined,
  })

  const filteredOrders = orders.filter((order: any) => {
    const searchLower = search.toLowerCase()
    return (
      order.id?.toString().includes(searchLower) ||
      order.restaurant?.name?.toLowerCase().includes(searchLower) ||
      order.user?.email?.toLowerCase().includes(searchLower)
    )
  })

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "delivered":
        return "default"
      case "cancelled":
        return "destructive"
      case "out_for_delivery":
        return "secondary"
      case "confirmed":
      case "preparing":
        return "outline"
      default:
        return "secondary"
    }
  }

  const canRefund = (order: any) => {
    return (
      order.stripe_payment_intent_id &&
      ['paid', 'succeeded'].includes(order.payment_status)
    )
  }

  const canCancel = (order: any) => {
    return ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
  }

  const resetCancelForm = () => {
    setShowCancelConfirm(false)
    setCancelReason("")
    setCancelMarkRefunded(false)
    setIsCancelling(false)
    setCancelError(null)
    setCancelSuccess(false)
  }

  const processCancelOrder = async () => {
    if (!selectedOrder) return
    setIsCancelling(true)
    setCancelError(null)

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason || undefined,
          mark_refunded: cancelMarkRefunded,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setCancelError(data.error || 'Failed to cancel order')
        return
      }

      setCancelSuccess(true)
      setShowCancelConfirm(false)
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] })
    } catch (err: any) {
      setCancelError(err.message || 'Network error occurred')
    } finally {
      setIsCancelling(false)
    }
  }

  const resetRefundForm = () => {
    setShowRefundForm(false)
    setRefundType('full')
    setRefundAmount("")
    setReasonCode("")
    setRefundNotes("")
    setIsRefunding(false)
    setRefundError(null)
    setRefundSuccess(false)
    setRefundResultId(null)
    setShowConfirmation(false)
  }

  const getRefundAmountValue = () => {
    if (refundType === 'full') {
      return selectedOrder?.total || 0
    }
    return parseFloat(refundAmount) || 0
  }

  const handleRefundSubmit = () => {
    if (!reasonCode) {
      setRefundError("Please select a reason code")
      return
    }
    if (refundType === 'partial' && (!refundAmount || parseFloat(refundAmount) <= 0)) {
      setRefundError("Please enter a valid refund amount")
      return
    }
    if (refundType === 'partial' && parseFloat(refundAmount) > (selectedOrder?.total || 0)) {
      setRefundError("Refund amount cannot exceed order total")
      return
    }
    setRefundError(null)
    setShowConfirmation(true)
  }

  const processRefund = async () => {
    if (!selectedOrder) return
    setShowConfirmation(false)
    setIsRefunding(true)
    setRefundError(null)

    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          refund_amount: refundType === 'full' ? selectedOrder.total : parseFloat(refundAmount),
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
      setRefundResultId(data.stripe_refund_id || data.id)
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] })
    } catch (err: any) {
      setRefundError(err.message || 'Network error occurred')
    } finally {
      setIsRefunding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage all platform orders</p>
        </div>
        <Button variant="outline" data-testid="button-export">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter orders by status, restaurant, or search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID, restaurant, or customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `Showing ${filteredOrders.length} orders`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(10).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No orders found</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: any) => (
                    <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                      <TableCell className="font-medium font-mono">#{order.id}</TableCell>
                      <TableCell>{order.restaurant?.name || "Unknown"}</TableCell>
                      <TableCell>{order.user?.email || "Guest"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>{formatDate(order.created_at)}</div>
                        <div>{formatTime(order.created_at)}</div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(order.total || 0, 'CAD')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getStatusBadgeVariant(order.status)} data-testid={`badge-${order.id}-status`}>
                            {order.status?.replace(/_/g, ' ') || 'pending'}
                          </Badge>
                          {order.payment_status === 'refunded' && (
                            <Badge variant="destructive" data-testid={`badge-${order.id}-refunded`}>
                              Refunded
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog onOpenChange={(open) => {
                          if (!open) { resetRefundForm(); resetCancelForm() }
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                              data-testid={`button-view-${order.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Order #{order.id}</DialogTitle>
                              <DialogDescription>
                                Order details and status management
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-medium">Restaurant</p>
                                  <p className="text-sm text-muted-foreground">
                                    {order.restaurant?.name || "Unknown"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Customer</p>
                                  <p className="text-sm text-muted-foreground">
                                    {order.user?.email || "Guest"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Order Date</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(order.created_at)} {formatTime(order.created_at)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Total</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrency(order.total || 0, 'CAD')}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium mb-2">Status</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant={getStatusBadgeVariant(order.status)}>
                                    {order.status?.replace(/_/g, ' ') || 'pending'}
                                  </Badge>
                                  {order.payment_status === 'refunded' && (
                                    <Badge variant="destructive" data-testid="badge-order-refunded">
                                      Refunded
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {canRefund(order) && !showRefundForm && !refundSuccess && (
                                <div className="pt-2">
                                  <Button
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedOrder(order)
                                      setShowRefundForm(true)
                                      setRefundAmount(String(order.total || 0))
                                    }}
                                    data-testid="button-refund"
                                  >
                                    Refund
                                  </Button>
                                </div>
                              )}

                              {refundSuccess && (
                                <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4" data-testid="refund-success-message">
                                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                    Refund processed successfully
                                  </p>
                                  {refundResultId && (
                                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                      Stripe Refund ID: <span className="font-mono">{refundResultId}</span>
                                    </p>
                                  )}
                                </div>
                              )}

                              {showRefundForm && !refundSuccess && (
                                <div className="space-y-4 border rounded-md p-4" data-testid="refund-form">
                                  <h3 className="text-sm font-semibold">Process Refund</h3>

                                  <div className="space-y-2">
                                    <Label>Refund Type</Label>
                                    <RadioGroup
                                      value={refundType}
                                      onValueChange={(val) => {
                                        setRefundType(val as 'full' | 'partial')
                                        if (val === 'full') {
                                          setRefundAmount(String(order.total || 0))
                                        } else {
                                          setRefundAmount("")
                                        }
                                      }}
                                      className="flex gap-4"
                                      data-testid="radio-refund-type"
                                    >
                                      <div className="flex items-center gap-2">
                                        <RadioGroupItem value="full" id="refund-full" data-testid="radio-full-refund" />
                                        <Label htmlFor="refund-full" className="cursor-pointer">Full Refund</Label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <RadioGroupItem value="partial" id="refund-partial" data-testid="radio-partial-refund" />
                                        <Label htmlFor="refund-partial" className="cursor-pointer">Partial Refund</Label>
                                      </div>
                                    </RadioGroup>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="refund-amount">Refund Amount</Label>
                                    <Input
                                      id="refund-amount"
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      max={order.total || 0}
                                      value={refundType === 'full' ? String(order.total || 0) : refundAmount}
                                      onChange={(e) => setRefundAmount(e.target.value)}
                                      disabled={refundType === 'full'}
                                      data-testid="input-refund-amount"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="reason-code">Reason</Label>
                                    <Select value={reasonCode} onValueChange={setReasonCode}>
                                      <SelectTrigger data-testid="select-reason-code">
                                        <SelectValue placeholder="Select a reason..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="customer_cancellation">Customer Cancellation</SelectItem>
                                        <SelectItem value="restaurant_issue">Restaurant Issue</SelectItem>
                                        <SelectItem value="platform_issue">Platform Issue</SelectItem>
                                        <SelectItem value="fraud_chargeback">Fraud / Chargeback</SelectItem>
                                        <SelectItem value="goodwill">Goodwill</SelectItem>
                                        <SelectItem value="duplicate_order">Duplicate Order</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
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

                                  {refundError && (
                                    <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-3" data-testid="refund-error-message">
                                      <p className="text-sm text-red-800 dark:text-red-200">{refundError}</p>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Button
                                      variant="destructive"
                                      onClick={handleRefundSubmit}
                                      disabled={isRefunding}
                                      data-testid="button-process-refund"
                                    >
                                      {isRefunding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                      Process Refund
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={resetRefundForm}
                                      disabled={isRefunding}
                                      data-testid="button-cancel-refund"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {cancelSuccess && (
                                <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4" data-testid="cancel-success-message">
                                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                    Order cancelled successfully
                                  </p>
                                </div>
                              )}

                              {cancelError && !showCancelConfirm && (
                                <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-3" data-testid="cancel-error-message">
                                  <p className="text-sm text-red-800 dark:text-red-200">{cancelError}</p>
                                </div>
                              )}

                              {canCancel(order) && !showRefundForm && !refundSuccess && !cancelSuccess && (
                                <div className="pt-2 flex items-center gap-2 flex-wrap">
                                  {canRefund(order) ? null : (
                                    <p className="text-sm text-muted-foreground w-full mb-1">
                                      This order can be cancelled.
                                    </p>
                                  )}
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedOrder(order)
                                      setShowCancelConfirm(true)
                                      setCancelMarkRefunded(order.payment_status === 'refunded')
                                    }}
                                    data-testid="button-cancel-order"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel Order
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent data-testid="refund-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will refund {formatCurrency(getRefundAmountValue(), 'CAD')} to the customer&apos;s payment method and create an accounting adjustment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirmation">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={processRefund}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-refund"
            >
              Confirm Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent data-testid="cancel-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order #{selectedOrder?.id}</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the order as cancelled. The restaurant will no longer see it as a new order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Restaurant closed early, customer already refunded"
                data-testid="textarea-cancel-reason"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="mark-refunded"
                checked={cancelMarkRefunded}
                onCheckedChange={(checked) => setCancelMarkRefunded(checked === true)}
                data-testid="checkbox-mark-refunded"
              />
              <Label htmlFor="mark-refunded" className="cursor-pointer text-sm">
                Also mark payment as refunded (if refund was already processed outside the system)
              </Label>
            </div>
            {cancelError && (
              <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{cancelError}</p>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling} data-testid="button-dismiss-cancel">
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                processCancelOrder()
              }}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-cancel"
            >
              {isCancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
