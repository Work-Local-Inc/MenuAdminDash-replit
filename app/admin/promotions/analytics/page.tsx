"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "lucide-react"

// Mock analytics data
const overviewStats = [
  { 
    title: 'Total Revenue Impact', 
    value: '$24,580', 
    change: '+18.2%', 
    positive: true,
    icon: DollarSign 
  },
  { 
    title: 'Total Redemptions', 
    value: '1,247', 
    change: '+12.5%', 
    positive: true,
    icon: Users 
  },
  { 
    title: 'Active Campaigns', 
    value: '8', 
    change: '+2', 
    positive: true,
    icon: Tag 
  },
  { 
    title: 'Avg. Discount Given', 
    value: '$8.45', 
    change: '-5.3%', 
    positive: false,
    icon: Gift 
  },
]

const topPerformers = [
  { name: 'SUMMER25', type: 'Coupon', redemptions: 342, revenue: '$8,550', convRate: '24%' },
  { name: 'Buy 2 Get 1', type: 'Deal', redemptions: 289, revenue: '$7,225', convRate: '31%' },
  { name: 'Add a Drink', type: 'Upsell', redemptions: 456, revenue: '$4,560', convRate: '38%' },
  { name: 'Happy Hour', type: 'Deal', redemptions: 178, revenue: '$2,670', convRate: '22%' },
  { name: 'FIRST15', type: 'Coupon', redemptions: 134, revenue: '$1,575', convRate: '15%' },
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/promotions">
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
              Track performance and ROI of your marketing campaigns
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewStats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${
                    stat.positive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.positive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {stat.change} vs last period
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section - Placeholder */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Redemptions Over Time</CardTitle>
            <CardDescription>Daily campaign redemptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/50">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Chart visualization coming soon
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Will show daily/weekly/monthly trends
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Campaign Type</CardTitle>
            <CardDescription>Breakdown by coupons, deals, upsells</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/50">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Pie chart visualization coming soon
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Will show revenue distribution
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Campaigns</CardTitle>
          <CardDescription>Ranked by total revenue generated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left font-medium">Campaign</th>
                  <th className="p-4 text-left font-medium">Type</th>
                  <th className="p-4 text-right font-medium">Redemptions</th>
                  <th className="p-4 text-right font-medium">Revenue</th>
                  <th className="p-4 text-right font-medium">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {topPerformers.map((campaign, i) => (
                  <tr key={campaign.name} className="border-b last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">#{i + 1}</span>
                        <span className="font-medium">{campaign.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{campaign.type}</Badge>
                    </td>
                    <td className="p-4 text-right">{campaign.redemptions}</td>
                    <td className="p-4 text-right font-medium text-green-600">{campaign.revenue}</td>
                    <td className="p-4 text-right">{campaign.convRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
                  <p className="text-sm text-muted-foreground">Total Codes Created</p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Redemptions</p>
                  <p className="text-2xl font-bold">476</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Avg. Discount Value</p>
                  <p className="text-2xl font-bold">$12.50</p>
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
                  <p className="text-sm text-muted-foreground">Active Deals</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Redemptions</p>
                  <p className="text-2xl font-bold">467</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Revenue Generated</p>
                  <p className="text-2xl font-bold">$9,895</p>
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
                  <p className="text-sm text-muted-foreground">Active Rules</p>
                  <p className="text-2xl font-bold">4</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">32%</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Avg. Order Increase</p>
                  <p className="text-2xl font-bold">$4.75</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
