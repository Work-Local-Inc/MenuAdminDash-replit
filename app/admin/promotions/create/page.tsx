"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Tag, 
  Gift, 
  TrendingUp,
  Sparkles,
  Clock,
  Calendar,
  Users,
  ArrowLeft,
  ChevronRight,
  Zap,
} from "lucide-react"

const campaignTypes = [
  {
    id: 'coupon',
    title: 'Coupon Code',
    description: 'Create a discount code customers enter at checkout',
    icon: Tag,
    color: 'bg-blue-500',
    baseHref: '/admin/coupons',
    features: ['Percentage or fixed discount', 'Usage limits', 'Expiration dates', 'Restaurant specific or global'],
  },
  {
    id: 'deal',
    title: 'Deal / Promotion',
    description: 'Create automatic discounts like BOGO, combos, or time-based offers',
    icon: Gift,
    color: 'bg-purple-500',
    baseHref: '/admin/promotions/deals',
    features: ['Buy one get one', 'Combo meals', 'Happy hour discounts', 'Limited time offers'],
  },
  {
    id: 'upsell',
    title: 'Upsell Rule',
    description: 'Suggest additional items to increase average order value',
    icon: TrendingUp,
    color: 'bg-green-500',
    baseHref: '/admin/promotions/upsells',
    features: ['Cart suggestions', 'Cross-sell products', 'Add-on discounts', 'Smart recommendations'],
  },
]

const templates = [
  { 
    name: 'First Order Discount', 
    type: 'coupon',
    description: 'Welcome new customers with 15% off', 
    icon: Sparkles,
    color: 'from-green-500 to-emerald-600',
    popular: true,
  },
  { 
    name: 'Happy Hour', 
    type: 'deal',
    description: '20% off during slow hours', 
    icon: Clock,
    color: 'from-orange-500 to-amber-600',
    popular: true,
  },
  { 
    name: 'Weekend BOGO', 
    type: 'deal',
    description: 'Buy one get one free on weekends', 
    icon: Calendar,
    color: 'from-blue-500 to-indigo-600',
    popular: false,
  },
  { 
    name: 'Loyalty Reward', 
    type: 'coupon',
    description: 'Reward returning customers', 
    icon: Gift,
    color: 'from-purple-500 to-pink-600',
    popular: false,
  },
  { 
    name: 'Add a Drink', 
    type: 'upsell',
    description: 'Suggest drinks with meal orders', 
    icon: TrendingUp,
    color: 'from-cyan-500 to-blue-600',
    popular: true,
  },
  { 
    name: 'Family Bundle', 
    type: 'deal',
    description: 'Combo deal for families', 
    icon: Users,
    color: 'from-pink-500 to-rose-600',
    popular: false,
  },
]

export default function CreateCampaignPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const restaurantId = searchParams.get('restaurant')
  const [selectedType, setSelectedType] = useState<string | null>(null)

  // Build href with restaurant context
  const buildHref = (baseHref: string) => {
    return restaurantId ? `${baseHref}?restaurant=${restaurantId}` : baseHref
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={restaurantId ? `/admin/promotions?restaurant=${restaurantId}` : "/admin/promotions"}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
          <p className="text-muted-foreground">
            Choose a campaign type or start from a template
          </p>
        </div>
      </div>

      {/* Campaign Types */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Campaign Type</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {campaignTypes.map((type) => (
            <Card 
              key={type.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedType === type.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => router.push(buildHref(type.baseHref))}
            >
              <CardContent className="p-6">
                <div className={`p-3 rounded-xl ${type.color} w-fit mb-4`}>
                  <type.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{type.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{type.description}</p>
                <ul className="space-y-1">
                  {type.features.map((feature, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-4" variant="outline">
                  Create {type.title}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Start Templates
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.name}
              className="group relative overflow-hidden rounded-xl border-2 hover:border-primary/50 p-6 text-left transition-all hover:shadow-lg bg-card"
              onClick={() => {
                const type = campaignTypes.find(t => t.id === template.type)
                if (type) router.push(buildHref(type.baseHref))
              }}
            >
              {template.popular && (
                <Badge className="absolute top-3 right-3 bg-yellow-500 text-yellow-950">
                  Popular
                </Badge>
              )}
              <div className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
              <template.icon className="h-8 w-8 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
              <h4 className="font-semibold group-hover:text-primary transition-colors">{template.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
              <Badge variant="outline" className="mt-3">
                {campaignTypes.find(t => t.id === template.type)?.title}
              </Badge>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
