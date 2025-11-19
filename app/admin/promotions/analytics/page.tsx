"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAdminRestaurants } from "@/hooks/use-admin-restaurants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Percent, Users, Gift } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { TableSkeleton } from "@/components/ui/loading-skeletons"

interface DealAnalytics {
  total_deals: number
  active_deals: number
  total_redemptions: number
  total_discount_given: string | number
  total_revenue: string | number
  avg_order_value: number
}

interface CouponAnalytics {
  total_coupons: number
  active_coupons: number
  total_redemptions: number
  total_discount_given: string | number
  total_revenue: string | number
}

interface TopDeal {
  deal_id: number
  deal_name: string
  redemption_count: number
  total_revenue: string
  avg_order_value: string
}

export default function PromotionalAnalyticsPage() {
  const [restaurantFilter, setRestaurantFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<string>("30")
  
  const { data: authorizedRestaurantIds = [], isLoading: restaurantsLoading } = useAdminRestaurants()

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<{
    dealAnalytics: DealAnalytics | null
    couponAnalytics: CouponAnalytics | null
    topDeals: TopDeal[]
  }>({
    queryKey: ['/api/admin/promotions/analytics', restaurantFilter, dateRange],
    enabled: !restaurantsLoading && authorizedRestaurantIds.length > 0,
  })

  const dealAnalytics = analyticsData?.dealAnalytics
  const couponAnalytics = analyticsData?.couponAnalytics
  const topDeals = analyticsData?.topDeals || []

  if (restaurantsLoading || analyticsLoading) {
    return <TableSkeleton />
  }

  if (authorizedRestaurantIds.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/promotions">
              <Button variant="ghost" size="sm" className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Deals
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Promotional Analytics</h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex min-h-[400px] items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">No Restaurant Access</p>
              <p className="text-muted-foreground">
                You don't have permission to view analytics for any restaurants yet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Helper function to safely parse numeric values from Supabase
  const safeParseNumber = (value: string | number | null | undefined): number => {
    if (value == null) return 0
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
  }

  const dealDiscountGiven = safeParseNumber(dealAnalytics?.total_discount_given)
  const couponDiscountGiven = safeParseNumber(couponAnalytics?.total_discount_given)
  const totalDiscountGiven = dealDiscountGiven + couponDiscountGiven

  const dealRevenue = safeParseNumber(dealAnalytics?.total_revenue)
  const couponRevenue = safeParseNumber(couponAnalytics?.total_revenue)
  const totalRevenue = dealRevenue + couponRevenue

  const totalRedemptions = (dealAnalytics?.total_redemptions || 0) + 
    (couponAnalytics?.total_redemptions || 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/promotions">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Deals
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Promotional Analytics</h1>
          <p className="text-muted-foreground">
            Track performance of your promotional deals and coupons
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Restaurant</label>
              <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
                <SelectTrigger data-testid="select-restaurant-filter">
                  <SelectValue placeholder="All Restaurants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Restaurants</SelectItem>
                  {authorizedRestaurantIds.map((id) => (
                    <SelectItem key={id} value={id.toString()}>
                      Restaurant #{id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-redemptions">
              {totalRedemptions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all promotions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discount Given</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-discount-given">
              {formatCurrency(totalDiscountGiven)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total discounts applied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-revenue">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From promotional orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-order">
              {formatCurrency(totalRedemptions > 0 ? totalRevenue / totalRedemptions : 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per promotional order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deals vs Coupons Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Promotional Deals</CardTitle>
            <CardDescription>
              Performance of location-based deals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Deals</span>
              <span className="font-medium">{dealAnalytics?.total_deals || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Deals</span>
              <span className="font-medium">{dealAnalytics?.active_deals || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Redemptions</span>
              <span className="font-medium">{dealAnalytics?.total_redemptions || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Discount Given</span>
              <span className="font-medium">
                {formatCurrency(dealDiscountGiven)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <span className="font-medium">
                {formatCurrency(dealRevenue)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Promotional Coupons</CardTitle>
            <CardDescription>
              Performance of coupon codes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Coupons</span>
              <span className="font-medium">{couponAnalytics?.total_coupons || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Coupons</span>
              <span className="font-medium">{couponAnalytics?.active_coupons || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Redemptions</span>
              <span className="font-medium">{couponAnalytics?.total_redemptions || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Discount Given</span>
              <span className="font-medium">
                {formatCurrency(couponDiscountGiven)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <span className="font-medium">
                {formatCurrency(couponRevenue)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Deals */}
      {topDeals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Deals</CardTitle>
            <CardDescription>
              Your best deals by redemption count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topDeals.map((deal, index) => (
                <div key={deal.deal_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{deal.deal_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {deal.redemption_count} redemptions
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(safeParseNumber(deal.total_revenue))}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(safeParseNumber(deal.avg_order_value))} avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
