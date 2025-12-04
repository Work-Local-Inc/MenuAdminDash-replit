
"use client"
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import { usePromotionStats, useActivePromotions } from "@/lib/hooks/use-promotions"
import { 
  Megaphone, 
  Tag, 
  Gift, 
  TrendingUp, 
  Plus,
  ArrowRight,
  Calendar,
  Users,
  DollarSign,
  Percent,
  Clock,
  Zap,
  Sparkles,
  ChevronRight,
  BarChart3,
  Target,
  Store,
  Building2,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

// Quick action card component - uses onClick for reliable navigation
function QuickActionCard({ 
  icon: Icon, 
  title, 
  description, 
  href, 
  color,
  restaurantId,
  onNavigate,
}: { 
  icon: any
  title: string
  description: string
  href: string
  color: string
  restaurantId?: string
  onNavigate: (href: string) => void
}) {
  const handleClick = () => {
    const fullHref = restaurantId ? `${href}?restaurant=${restaurantId}` : href
    onNavigate(fullHref)
  }
  
  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/50"
      onClick={handleClick}
      data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </CardContent>
    </Card>
  )
}

// Stats card component
function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon,
  loading 
}: { 
  title: string
  value: string | number
  change?: string
  icon: any
  loading?: boolean
}) {
  const isPositive = change?.startsWith('+')
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
            {change && !loading && (
              <p className={`text-xs mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {change} from last month
              </p>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Active promotion card
function ActivePromoCard({ 
  promo 
}: { 
  promo: {
    id: number
    name: string
    code: string
    type: 'coupon' | 'deal' | 'upsell'
    discount: string
    usageCount: number
    expiresAt?: string
    isActive: boolean
  }
}) {
  const typeColors = {
    coupon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    deal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    upsell: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }
  
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4">
        <Badge className={typeColors[promo.type]} variant="secondary">
          {promo.type}
        </Badge>
        <div>
          <p className="font-medium">{promo.name}</p>
          <p className="text-sm text-muted-foreground font-mono">{promo.code}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="font-semibold text-primary">{promo.discount}</p>
          <p className="text-xs text-muted-foreground">{promo.usageCount} uses</p>
        </div>
        {promo.expiresAt && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Expires
            </p>
            <p className="text-sm">{promo.expiresAt}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MarketingHubPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Restaurant selection state - synced with URL
  const initialRestaurantId = searchParams.get('restaurant') || ''
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(initialRestaurantId)
  
  // Fetch restaurants
  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants({ status: 'active' })
  
  // Update state when URL changes
  useEffect(() => {
    const urlRestaurantId = searchParams.get('restaurant') || ''
    if (urlRestaurantId !== selectedRestaurantId) {
      setSelectedRestaurantId(urlRestaurantId)
    }
  }, [searchParams])
  
  // Auto-select if user only has access to 1 restaurant
  useEffect(() => {
    if (!selectedRestaurantId && !loadingRestaurants && restaurants.length === 1) {
      const onlyRestaurant = restaurants[0]
      setSelectedRestaurantId(onlyRestaurant.id.toString())
      router.replace(`/admin/promotions?restaurant=${onlyRestaurant.id}`)
    }
  }, [restaurants, loadingRestaurants, selectedRestaurantId, router])
  
  // Handler to update both state and URL
  const handleRestaurantChange = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId)
    if (restaurantId) {
      router.push(`/admin/promotions?restaurant=${restaurantId}`)
    } else {
      router.push('/admin/promotions')
    }
  }
  
  // Get selected restaurant info
  const selectedRestaurant = restaurants.find((r: any) => r.id.toString() === selectedRestaurantId)

  // Fetch marketing stats for selected restaurant (REAL DATA)
  const { data: stats, isLoading: statsLoading } = usePromotionStats(
    selectedRestaurantId ? parseInt(selectedRestaurantId) : undefined
  )

  // Fetch active promotions for selected restaurant (REAL DATA)
  const { data: activePromosData, isLoading: promosLoading } = useActivePromotions(
    selectedRestaurantId ? parseInt(selectedRestaurantId) : undefined
  )
  const activePromos = activePromosData?.promotions || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl">
              <Megaphone className="h-6 w-6 text-white" />
            </div>
            Marketing Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage coupons, deals, and promotions to boost your sales
          </p>
        </div>
        {selectedRestaurantId && (
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href={`/admin/promotions/analytics?restaurant=${selectedRestaurantId}`}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/promotions/create?restaurant=${selectedRestaurantId}`}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Restaurant Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Select Location
          </CardTitle>
          <CardDescription>
            Choose a restaurant location to manage its marketing campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRestaurants ? (
            <Skeleton className="h-10 w-full max-w-md" />
          ) : (
            <Select value={selectedRestaurantId} onValueChange={handleRestaurantChange}>
              <SelectTrigger className="w-full max-w-md" data-testid="select-restaurant">
                <SelectValue placeholder="Select a restaurant location" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((restaurant: any) => (
                  <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {restaurant.name} - {restaurant.city}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Show content only when restaurant is selected */}
      {!selectedRestaurantId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Location Selected</p>
            <p className="text-muted-foreground">
              Please select a restaurant location above to manage its marketing campaigns
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selected Restaurant Badge */}
          {selectedRestaurant && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-medium">Managing:</span>
              <Badge variant="secondary" className="text-sm">
                {selectedRestaurant.name} - {selectedRestaurant.city}
              </Badge>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Active Coupons" 
              value={stats?.activeCoupons ?? 0}
              change={stats?.couponChange}
              icon={Tag}
              loading={statsLoading}
            />
            <StatCard 
              title="Active Deals" 
              value={stats?.activeDeals ?? 0}
              change={stats?.dealChange}
              icon={Gift}
              loading={statsLoading}
            />
            <StatCard 
              title="Total Redemptions" 
              value={stats?.totalRedemptions ?? 0}
              change={stats?.redemptionChange}
              icon={Users}
              loading={statsLoading}
            />
            <StatCard 
              title="Revenue Impact" 
              value={statsLoading ? '...' : formatCurrency(stats?.revenueImpact ?? 0, 'CAD')}
              change={stats?.revenueChange}
              icon={TrendingUp}
              loading={statsLoading}
            />
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <QuickActionCard
                icon={Tag}
                title="Create Coupon"
                description="Discount codes for customers to use at checkout"
                href="/admin/coupons"
                color="bg-blue-500"
                restaurantId={selectedRestaurantId}
                onNavigate={(href) => router.push(href)}
              />
              <QuickActionCard
                icon={Gift}
                title="Create Deal"
                description="BOGO, combo deals, and limited-time offers"
                href="/admin/promotions/deals"
                color="bg-purple-500"
                restaurantId={selectedRestaurantId}
                onNavigate={(href) => router.push(href)}
              />
              <QuickActionCard
                icon={TrendingUp}
                title="Create Upsell"
                description="Suggest add-ons to increase order value"
                href="/admin/promotions/upsells"
                color="bg-green-500"
                restaurantId={selectedRestaurantId}
                onNavigate={(href) => router.push(href)}
              />
            </div>
          </div>

          {/* Active Promotions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    Active Promotions
                  </CardTitle>
                  <CardDescription>
                    Currently running campaigns for this location
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/admin/promotions/all?restaurant=${selectedRestaurantId}`}>
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {promosLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : activePromos && activePromos.length > 0 ? (
                <div className="space-y-3">
                  {activePromos.map((promo: any) => (
                    <ActivePromoCard key={promo.id} promo={promo} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No active promotions for this location</p>
                  <Button className="mt-4" asChild>
                    <Link href={`/admin/promotions/create?restaurant=${selectedRestaurantId}`}>
                      Create Your First Campaign
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Campaign Templates
              </CardTitle>
              <CardDescription>
                Start with a pre-built template to save time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { name: 'First Order Discount', icon: Sparkles, desc: '15% off first purchase', color: 'from-green-500 to-emerald-600' },
                  { name: 'Happy Hour', icon: Clock, desc: '20% off 2-5pm', color: 'from-orange-500 to-amber-600' },
                  { name: 'Weekend Special', icon: Calendar, desc: 'BOGO on weekends', color: 'from-blue-500 to-indigo-600' },
                  { name: 'Loyalty Reward', icon: Gift, desc: 'Free item after 10 orders', color: 'from-purple-500 to-pink-600' },
                ].map((template) => (
                  <button
                    key={template.name}
                    className="group relative overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 p-6 text-left transition-all hover:shadow-lg"
                    onClick={() => router.push(`/admin/promotions/create?restaurant=${selectedRestaurantId}&template=${template.name.toLowerCase().replace(/ /g, '-')}`)}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <template.icon className="h-8 w-8 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    <h4 className="font-semibold group-hover:text-primary transition-colors">{template.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{template.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
