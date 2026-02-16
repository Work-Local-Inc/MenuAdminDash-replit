"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { Search, Loader2, RefreshCw, Download, Copy, Check, Eye } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import { formatCurrency } from "@/lib/utils"
import { queryClient } from "@/lib/queryClient"
import Link from "next/link"

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

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "succeeded", label: "Succeeded" },
  { value: "partially_refunded", label: "Partially Refunded" },
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

function CopyableStripeId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const truncated = id.length > 16 ? `${id.slice(0, 8)}...${id.slice(-6)}` : id

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [id])

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopy() }}
      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"
      title={id}
      data-testid={`button-copy-stripe-id-${id}`}
    >
      <span>{truncated}</span>
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

export default function AccountingTransactionsPage() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [restaurantId, setRestaurantId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [page, setPage] = useState(0)
  const limit = 50

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
    queryKey: ["/api/transactions", search, statusFilter, restaurantId, startDate, endDate, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      if (restaurantId) params.set("restaurantId", restaurantId)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
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

  const summaryStats = useMemo(() => {
    return {
      totalCount: total,
      totalAmount: transactions.reduce((sum, tx) => sum + parseFloat(String(tx.total_amount)), 0),
      totalTips: transactions.reduce((sum, tx) => sum + parseFloat(String(tx.tip_amount)), 0),
      totalTax: transactions.reduce((sum, tx) => sum + parseFloat(String(tx.tax_amount)), 0),
    }
  }, [transactions, total])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] })
  }

  const handleExportCSV = () => {
    if (!transactions.length) return

    const headers = [
      "Order #", "Customer Name", "Customer Email", "Restaurant", "Subtotal",
      "Delivery Fee", "Tax", "Tip", "Total", "Status", "Payment Method",
      "Stripe Payment Intent ID", "Date", "Test Order"
    ]

    const csvContent = [
      headers.join(","),
      ...transactions.map(tx => [
        `"${tx.order_number || tx.id}"`,
        `"${(tx.customer_name || "").replace(/"/g, '""')}"`,
        `"${(tx.customer_email || "").replace(/"/g, '""')}"`,
        `"${tx.restaurant_name.replace(/"/g, '""')}"`,
        parseFloat(String(tx.subtotal)).toFixed(2),
        parseFloat(String(tx.delivery_fee)).toFixed(2),
        parseFloat(String(tx.tax_amount)).toFixed(2),
        parseFloat(String(tx.tip_amount)).toFixed(2),
        parseFloat(String(tx.total_amount)).toFixed(2),
        tx.payment_status,
        tx.payment_method,
        tx.stripe_payment_intent_id,
        tx.created_at,
        tx.is_test_order ? "Yes" : "No",
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-row items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Transactions</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            View all Stripe payment transactions
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportCSV} disabled={!transactions.length} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground" data-testid="label-total-transactions">Total Transactions</p>
            <p className="text-2xl font-bold" data-testid="text-total-transactions">{summaryStats.totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground" data-testid="label-total-amount">Total Amount</p>
            <p className="text-2xl font-bold" data-testid="text-total-amount">{formatCurrency(summaryStats.totalAmount, "CAD")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground" data-testid="label-total-tips">Total Tips</p>
            <p className="text-2xl font-bold" data-testid="text-total-tips">{formatCurrency(summaryStats.totalTips, "CAD")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground" data-testid="label-total-tax">Total Tax</p>
            <p className="text-2xl font-bold" data-testid="text-total-tax">{formatCurrency(summaryStats.totalTax, "CAD")}</p>
          </CardContent>
        </Card>
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

      <div className="flex flex-row gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">From:</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(0) }}
            className="w-[160px]"
            data-testid="input-start-date"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">To:</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(0) }}
            className="w-[160px]"
            data-testid="input-end-date"
          />
        </div>
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setStartDate(""); setEndDate(""); setPage(0) }}
            data-testid="button-clear-dates"
          >
            Clear dates
          </Button>
        )}
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
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Stripe ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                      <TableCell className="font-medium whitespace-nowrap" data-testid={`text-order-number-${tx.id}`}>
                        #{tx.order_number || tx.id}
                      </TableCell>
                      <TableCell data-testid={`text-customer-${tx.id}`}>
                        <div className="text-sm">{tx.customer_name || "N/A"}</div>
                        {tx.customer_email && (
                          <div className="text-xs text-muted-foreground">{tx.customer_email}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={tx.restaurant_name} data-testid={`text-restaurant-${tx.id}`}>
                        {tx.restaurant_name}
                      </TableCell>
                      <TableCell data-testid={`text-amount-${tx.id}`}>
                        <div className="font-medium">{formatCurrency(parseFloat(String(tx.total_amount)), "CAD")}</div>
                        <div className="text-xs text-muted-foreground">
                          Sub: {formatCurrency(parseFloat(String(tx.subtotal)), "CAD")}
                          {parseFloat(String(tx.delivery_fee)) > 0 && ` + Del: ${formatCurrency(parseFloat(String(tx.delivery_fee)), "CAD")}`}
                          {parseFloat(String(tx.tip_amount)) > 0 && ` + Tip: ${formatCurrency(parseFloat(String(tx.tip_amount)), "CAD")}`}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`cell-status-${tx.id}`}>
                        {getStatusBadge(tx.payment_status)}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-payment-method-${tx.id}`}>
                        {tx.payment_method ? tx.payment_method.replace(/_/g, " ") : "N/A"}
                      </TableCell>
                      <TableCell data-testid={`text-stripe-id-${tx.id}`}>
                        <CopyableStripeId id={tx.stripe_payment_intent_id} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm" data-testid={`text-date-${tx.id}`}>
                        {format(new Date(tx.created_at), "MMM d, yyyy")}
                        <div className="text-xs">{format(new Date(tx.created_at), "h:mm a")}</div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/orders/${tx.id}`}>
                          <Button variant="ghost" size="icon" data-testid={`button-view-order-${tx.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
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
    </div>
  )
}
