"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { DollarSign, ShoppingCart, Store, Users, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useDashboardStats, useRecentOrders, useRevenueHistory } from "@/lib/hooks/use-dashboard"

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly">("daily")
  
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: recentOrders = [], isLoading: ordersLoading } = useRecentOrders(5)
  const { data: revenueData = [], isLoading: revenueLoading } = useRevenueHistory(timeRange)
  
  console.log('Dashboard rendered:', { stats, statsLoading, statsError, timeRange })

  const statCards = [
    {
      title: "Total Revenue",
      value: stats?.totalRevenue ? formatCurrency(stats.totalRevenue, 'CAD') : '$0',
      change: "+12.5%",
      icon: DollarSign,
      trend: "up" as const,
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders?.toLocaleString() || "0",
      change: "+8.2%",
      icon: ShoppingCart,
      trend: "up" as const,
    },
    {
      title: "Active Restaurants",
      value: stats?.activeRestaurants?.toString() || "0",
      change: "+2",
      icon: Store,
      trend: "up" as const,
    },
    {
      title: "Total Users",
      value: stats?.totalUsers?.toLocaleString() || "0",
      change: "+15.3%",
      icon: Users,
      trend: "up" as const,
    },
  ]

  const testFetch = async () => {
    console.log('Manual fetch test starting...')
    try {
      const res = await fetch('/api/dashboard/stats')
      console.log('Manual fetch response:', res.status)
      const data = await res.json()
      console.log('Manual fetch data:', data)
      alert(`SUCCESS! Got ${data.activeRestaurants} restaurants and ${data.totalUsers} users`)
    } catch (error) {
      console.error('Manual fetch error:', error)
      alert(`ERROR: ${error}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your restaurant platform performance
        </p>
        <button 
          onClick={testFetch}
          className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded"
          data-testid="button-test-fetch"
        >
          TEST FETCH (Click Me)
        </button>
        <div className="mt-2 text-sm">
          Stats Loading: {String(statsLoading)} | Has Data: {String(!!stats)} | Error: {String(!!statsError)}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          statCards.map((stat) => (
            <Card key={stat.title} data-testid={`card-${stat.title.toLowerCase().replace(/ /g, '-')}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`text-${stat.title.toLowerCase().replace(/ /g, '-')}-value`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className={stat.trend === "up" ? "text-green-600" : "text-red-600"}>
                    {stat.change}
                  </span>{" "}
                  from last period
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Track your revenue trends over time</CardDescription>
            </div>
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
              <TabsList>
                <TabsTrigger value="daily" data-testid="button-chart-daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly" data-testid="button-chart-weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly" data-testid="button-chart-monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {revenueLoading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => value >= 1000 ? `$${value / 1000}k` : `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value, 'CAD')}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders from your platform</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent orders</p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order: any) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between"
                    data-testid={`order-${order.id}`}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium font-mono">#{order.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.restaurant?.name || 'Unknown Restaurant'}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-medium">{formatCurrency(order.total || 0, 'CAD')}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          order.status === "delivered" ? "default" :
                          order.status === "out_for_delivery" ? "secondary" :
                          "outline"
                        } className="text-xs">
                          {order.status?.replace(/_/g, ' ') || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Restaurants */}
        <Card>
          <CardHeader>
            <CardTitle>Top Restaurants</CardTitle>
            <CardDescription>Best performing restaurants this month</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : stats?.topRestaurants?.length > 0 ? (
              <div className="space-y-4">
                {stats.topRestaurants.slice(0, 5).map((restaurant: any, index: number) => (
                  <div 
                    key={restaurant.id} 
                    className="flex items-center justify-between"
                    data-testid={`restaurant-${restaurant.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{restaurant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {restaurant.orders || 0} orders
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-medium">{formatCurrency(restaurant.revenue || 0, 'CAD')}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>{restaurant.rating || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No restaurant data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
