"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Tag,
  Gift,
  ArrowLeft,
  Calendar,
  Download,
  Percent,
  Ticket,
  RefreshCcw,
  Building2,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useAdminRestaurants } from "@/hooks/use-admin-restaurants"

interface ChartData {
  overview: {
    coupons: number
    activeCoupons: number
    deals: number
    activeDeals: number
    upsells: number
    activeUpsells: number
  }
  couponTypeBreakdown: { name: string; value: number; type: string }[]
  dealTypeBreakdown: { name: string; value: number; type: string }[]
  topCoupons: { id: number; name: string; code: string; type: string; value: number; minPurchase: number }[]
  topDeals: { id: number; name: string; type: string; value: number; code: string }[]
  monthlyTrends: { month: string; coupons: number; deals: number }[]
  totalRedemptions: number
}

const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

export default function AnalyticsPage() {
  const searchParams = useSearchParams()
  const restaurantIdFromUrl = searchParams.get('restaurant')
  
  const { data: restaurants } = useAdminRestaurants()
  // Use URL param if provided, otherwise default to "all"
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(restaurantIdFromUrl || "all")
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Sync state with URL when URL changes
  useEffect(() => {
    if (restaurantIdFromUrl && restaurantIdFromUrl !== selectedRestaurantId) {
      setSelectedRestaurantId(restaurantIdFromUrl)
    }
  }, [restaurantIdFromUrl])
  
  // Find selected restaurant info
  const selectedRestaurant = restaurants?.find((r: any) => r.id?.toString() === selectedRestaurantId)

  const fetchChartData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedRestaurantId && selectedRestaurantId !== "all") {
        params.set('restaurant_id', selectedRestaurantId)
      }
      
      const response = await fetch(`/api/admin/promotions/analytics/chart-data?${params}`)
      if (response.ok) {
        const data = await response.json()
        setChartData(data)
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChartData()
  }, [selectedRestaurantId])

  const overviewStats = chartData ? [
    { 
      title: 'Total Coupons', 
      value: chartData.overview.coupons.toString(), 
      subValue: `${chartData.overview.activeCoupons} active`,
      icon: Tag,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    { 
      title: 'Total Deals', 
      value: chartData.overview.deals.toString(), 
      subValue: `${chartData.overview.activeDeals} active`,
      icon: Gift,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    { 
      title: 'Upsell Rules', 
      value: chartData.overview.upsells.toString(), 
      subValue: `${chartData.overview.activeUpsells} active`,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    { 
      title: 'Total Redemptions', 
      value: chartData.totalRedemptions.toString(), 
      subValue: 'All time',
      icon: Users,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ] : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={selectedRestaurantId !== "all" ? `/admin/promotions?restaurant=${selectedRestaurantId}` : '/admin/promotions'}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              Campaign Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              {selectedRestaurant 
                ? `Analytics for ${selectedRestaurant.name}`
                : 'Track performance of your marketing campaigns'
              }
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Restaurants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Restaurants</SelectItem>
              {restaurants?.map((r: any) => (
                <SelectItem key={r.id} value={r.id.toString()}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchChartData}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {overviewStats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.subValue}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trends Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Promotions Created</CardTitle>
            <CardDescription>Monthly breakdown of coupons and deals</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData && chartData.monthlyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="coupons" name="Coupons" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="deals" name="Deals" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coupon Types Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Coupon Types Distribution</CardTitle>
            <CardDescription>Breakdown by discount type</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData && chartData.couponTypeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={chartData.couponTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {chartData.couponTypeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No coupon data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deal Types Chart */}
      {chartData && chartData.dealTypeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Deal Types</CardTitle>
            <CardDescription>Distribution of active promotional deals</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData.dealTypeBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" className="text-xs" width={120} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" name="Count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Performers Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Coupons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-500" />
              Top Coupons
            </CardTitle>
            <CardDescription>By discount value</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : chartData && chartData.topCoupons.length > 0 ? (
              <div className="space-y-3">
                {chartData.topCoupons.map((coupon, i) => (
                  <div key={coupon.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">#{i + 1}</span>
                      <div>
                        <p className="font-medium">{coupon.name || coupon.code}</p>
                        <p className="text-xs text-muted-foreground font-mono">{coupon.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {coupon.type === 'percent' ? `${coupon.value}%` : 
                         coupon.type === 'currency' ? `$${coupon.value}` :
                         coupon.type === 'delivery' ? 'Free Delivery' : 
                         'Free Item'}
                      </Badge>
                      {coupon.minPurchase > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Min ${coupon.minPurchase}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No coupons found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Deals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-500" />
              Top Deals
            </CardTitle>
            <CardDescription>Currently active promotions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : chartData && chartData.topDeals.length > 0 ? (
              <div className="space-y-3">
                {chartData.topDeals.map((deal, i) => (
                  <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">#{i + 1}</span>
                      <div>
                        <p className="font-medium">{deal.name}</p>
                        {deal.code && (
                          <p className="text-xs text-muted-foreground font-mono">{deal.code}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {deal.type === 'percent' || deal.type === 'percentTotal' ? `${deal.value}% off` :
                         deal.type === 'freeItem' ? 'Free Item' :
                         deal.type === 'value' || deal.type === 'valueTotal' ? `$${deal.value} off` :
                         deal.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No active deals found
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Breakdown by Type */}
      <Tabs defaultValue="coupons">
        <TabsList>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="upsells">Upsells</TabsTrigger>
        </TabsList>
        <TabsContent value="coupons" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-500" />
                Coupon Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Codes</p>
                  <p className="text-2xl font-bold">{chartData?.overview.coupons || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Active Codes</p>
                  <p className="text-2xl font-bold">{chartData?.overview.activeCoupons || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Discount Types</p>
                  <p className="text-2xl font-bold">{chartData?.couponTypeBreakdown.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="deals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-500" />
                Deal Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Deals</p>
                  <p className="text-2xl font-bold">{chartData?.overview.deals || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Active Deals</p>
                  <p className="text-2xl font-bold">{chartData?.overview.activeDeals || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Deal Types</p>
                  <p className="text-2xl font-bold">{chartData?.dealTypeBreakdown.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="upsells" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Upsell Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Rules</p>
                  <p className="text-2xl font-bold">{chartData?.overview.upsells || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Active Rules</p>
                  <p className="text-2xl font-bold">{chartData?.overview.activeUpsells || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">--</p>
                  <p className="text-xs text-muted-foreground">Tracking coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
