"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { DollarSign, ShoppingCart, Store, Users, TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

// Mock data - will be replaced with real API calls
const stats = [
  {
    title: "Total Revenue",
    value: "$245,890",
    change: "+12.5%",
    icon: DollarSign,
    trend: "up",
  },
  {
    title: "Total Orders",
    value: "3,842",
    change: "+8.2%",
    icon: ShoppingCart,
    trend: "up",
  },
  {
    title: "Active Restaurants",
    value: "74",
    change: "+2",
    icon: Store,
    trend: "up",
  },
  {
    title: "Total Users",
    value: "32,349",
    change: "+15.3%",
    icon: Users,
    trend: "up",
  },
]

const revenueData = {
  daily: [
    { date: "Mon", revenue: 12500 },
    { date: "Tue", revenue: 15200 },
    { date: "Wed", revenue: 14800 },
    { date: "Thu", revenue: 18900 },
    { date: "Fri", revenue: 22400 },
    { date: "Sat", revenue: 28500 },
    { date: "Sun", revenue: 25100 },
  ],
  weekly: [
    { date: "Week 1", revenue: 85000 },
    { date: "Week 2", revenue: 92000 },
    { date: "Week 3", revenue: 78000 },
    { date: "Week 4", revenue: 105000 },
  ],
  monthly: [
    { date: "Jan", revenue: 245000 },
    { date: "Feb", revenue: 278000 },
    { date: "Mar", revenue: 312000 },
    { date: "Apr", revenue: 298000 },
    { date: "May", revenue: 345000 },
    { date: "Jun", revenue: 389000 },
  ],
}

const recentOrders = [
  { id: "ORD-1234", restaurant: "Pizza Palace", amount: 45.99, status: "delivered", time: "5 min ago" },
  { id: "ORD-1235", restaurant: "Sushi World", amount: 89.50, status: "preparing", time: "12 min ago" },
  { id: "ORD-1236", restaurant: "Burger Hub", amount: 32.00, status: "confirmed", time: "18 min ago" },
  { id: "ORD-1237", restaurant: "Taco Fiesta", amount: 56.75, status: "out_for_delivery", time: "22 min ago" },
  { id: "ORD-1238", restaurant: "Thai Garden", amount: 67.80, status: "delivered", time: "28 min ago" },
]

const topRestaurants = [
  { id: 1, name: "Pizza Palace", orders: 342, revenue: 15420, rating: 4.8 },
  { id: 2, name: "Sushi World", orders: 298, revenue: 18950, rating: 4.9 },
  { id: 3, name: "Burger Hub", orders: 267, revenue: 12340, rating: 4.6 },
  { id: 4, name: "Taco Fiesta", orders: 234, revenue: 11200, rating: 4.7 },
  { id: 5, name: "Thai Garden", orders: 189, revenue: 9870, rating: 4.5 },
]

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly">("daily")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your restaurant platform performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
        ))}
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData[timeRange]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `$${value / 1000}k`}
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
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between"
                  data-testid={`order-${order.id.toLowerCase()}`}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium font-mono">{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.restaurant}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-medium">{formatCurrency(order.amount, 'CAD')}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        order.status === "delivered" ? "default" :
                        order.status === "out_for_delivery" ? "secondary" :
                        "outline"
                      } className="text-xs">
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{order.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Restaurants */}
        <Card>
          <CardHeader>
            <CardTitle>Top Restaurants</CardTitle>
            <CardDescription>Best performing restaurants this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topRestaurants.map((restaurant, index) => (
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
                        {restaurant.orders} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-medium">{formatCurrency(restaurant.revenue, 'CAD')}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>{restaurant.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
