"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrders } from "@/lib/hooks/use-orders"
import { formatCurrency, formatDate, formatTime } from "@/lib/utils"
import { Search, Filter, Download, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function OrdersPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

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

      {/* Filters */}
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

      {/* Orders Table */}
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
                        <Badge variant={getStatusBadgeVariant(order.status)} data-testid={`badge-${order.id}-status`}>
                          {order.status?.replace(/_/g, ' ') || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
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
                          <DialogContent className="max-w-2xl">
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
                                <Badge variant={getStatusBadgeVariant(order.status)}>
                                  {order.status?.replace(/_/g, ' ') || 'pending'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Full order management with status workflow coming soon...
                              </p>
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
    </div>
  )
}
