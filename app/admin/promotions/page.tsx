"use client"

import { useState } from "react"
import { usePromotionalDeals, useToggleDealStatus } from "@/lib/hooks/use-promotional-deals"
import { useAdminRestaurants } from "@/hooks/use-admin-restaurants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreVertical, BarChart3, Copy, Trash2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { TableSkeleton } from "@/components/ui/loading-skeletons"
import { useToast } from "@/hooks/use-toast"

export default function PromotionalDealsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [restaurantFilter, setRestaurantFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")

  const { data: dealsData, isLoading: dealsLoading } = usePromotionalDeals()
  const { data: authorizedRestaurantIds = [], isLoading: restaurantsLoading } = useAdminRestaurants()
  const toggleStatus = useToggleDealStatus()
  const { toast } = useToast()

  const deals = dealsData?.deals || []

  // Get unique restaurants from deals
  const uniqueRestaurants = Array.from(
    new Map(
      deals.map(deal => [deal.restaurant_id, { id: deal.restaurant_id, name: deal.restaurants.name }])
    ).values()
  )

  // Filter deals
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = !searchQuery || 
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.restaurants.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRestaurant = restaurantFilter === "All" || 
      deal.restaurant_id.toString() === restaurantFilter
    
    const matchesStatus = statusFilter === "All" ||
      (statusFilter === "active" && deal.is_enabled) ||
      (statusFilter === "inactive" && !deal.is_enabled) ||
      (statusFilter === "expired" && deal.date_stop && new Date(deal.date_stop) < new Date()) ||
      (statusFilter === "scheduled" && deal.date_start && new Date(deal.date_start) > new Date())

    return matchesSearch && matchesRestaurant && matchesStatus
  })

  const handleToggleStatus = async (dealId: number, currentStatus: boolean) => {
    try {
      await toggleStatus.mutateAsync({ dealId, isEnabled: !currentStatus })
      toast({
        title: "Success",
        description: `Deal ${!currentStatus ? 'enabled' : 'disabled'} successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to toggle deal status',
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (deal: typeof deals[0]) => {
    if (deal.disabled_at) {
      return <Badge variant="destructive" data-testid={`badge-status-deleted-${deal.id}`}>Deleted</Badge>
    }
    if (!deal.is_enabled) {
      return <Badge variant="secondary" data-testid={`badge-status-disabled-${deal.id}`}>Disabled</Badge>
    }
    if (deal.date_stop && new Date(deal.date_stop) < new Date()) {
      return <Badge variant="outline" data-testid={`badge-status-expired-${deal.id}`}>Expired</Badge>
    }
    if (deal.date_start && new Date(deal.date_start) > new Date()) {
      return <Badge variant="outline" data-testid={`badge-status-scheduled-${deal.id}`}>Scheduled</Badge>
    }
    return <Badge variant="default" className="bg-green-600" data-testid={`badge-status-active-${deal.id}`}>Active</Badge>
  }

  const getDiscountDisplay = (deal: typeof deals[0]) => {
    if (deal.discount_percent) {
      return `${deal.discount_percent}% off`
    }
    if (deal.discount_amount) {
      return `${formatCurrency(parseFloat(deal.discount_amount.toString()))} off`
    }
    return 'No discount'
  }

  if (dealsLoading || restaurantsLoading) {
    return <TableSkeleton />
  }

  if (authorizedRestaurantIds.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">No Restaurant Access</h2>
          <p className="text-muted-foreground">
            You don't have permission to manage any restaurants yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotional Deals</h1>
          <p className="text-muted-foreground">
            Manage promotional deals and discounts for your restaurants
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/promotions/analytics">
            <Button variant="outline" data-testid="button-view-analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Link href="/admin/promotions/create">
            <Button data-testid="button-create-deal">
              <Plus className="mr-2 h-4 w-4" />
              Create Deal
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Deals ({filteredDeals.length})</CardTitle>
          <CardDescription>
            Filter and manage your promotional deals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-deals"
                />
              </div>
            </div>

            <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-restaurant-filter">
                <SelectValue placeholder="Restaurant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Restaurants</SelectItem>
                {uniqueRestaurants.map((restaurant) => (
                  <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                    {restaurant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Disabled</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No promotional deals found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeals.map((deal) => (
                    <TableRow key={deal.id} data-testid={`row-deal-${deal.id}`}>
                      <TableCell>
                        <div className="font-medium">{deal.name}</div>
                        {deal.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {deal.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{deal.restaurants.name}</div>
                      </TableCell>
                      <TableCell>{getDiscountDisplay(deal)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {deal.date_start ? format(new Date(deal.date_start), 'MMM d, yyyy') : 'No start'}
                          {' - '}
                          {deal.date_stop ? format(new Date(deal.date_stop), 'MMM d, yyyy') : 'No end'}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(deal)}</TableCell>
                      <TableCell>
                        <Switch
                          checked={deal.is_enabled}
                          onCheckedChange={() => handleToggleStatus(deal.id, deal.is_enabled)}
                          disabled={toggleStatus.isPending || deal.disabled_at !== null}
                          data-testid={`switch-toggle-deal-${deal.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${deal.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/admin/promotions/${deal.id}`}>
                              <DropdownMenuItem data-testid={`action-edit-${deal.id}`}>
                                Edit Deal
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/admin/promotions/${deal.id}/stats`}>
                              <DropdownMenuItem data-testid={`action-stats-${deal.id}`}>
                                <BarChart3 className="mr-2 h-4 w-4" />
                                View Stats
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem data-testid={`action-clone-${deal.id}`}>
                              <Copy className="mr-2 h-4 w-4" />
                              Clone Deal
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              data-testid={`action-delete-${deal.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
