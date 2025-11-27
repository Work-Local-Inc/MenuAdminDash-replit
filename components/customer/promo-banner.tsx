"use client"

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tag, Gift, Percent, ChevronRight, Clock, Copy, Check, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Promotion {
  id: string
  type: 'coupon' | 'deal'
  name: string
  code?: string
  description: string
  discountText: string
  minPurchase?: number
  firstOrderOnly?: boolean
  expiresAt?: string
  imageUrl?: string
  timeRange?: string
}

interface PromoBannerProps {
  restaurantSlug: string
  brandColor?: string
}

export function PromoBanner({ restaurantSlug, brandColor }: PromoBannerProps) {
  const { toast } = useToast()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [featured, setFeatured] = useState<Promotion | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const response = await fetch(`/api/customer/restaurants/${restaurantSlug}/promotions`)
        if (response.ok) {
          const data = await response.json()
          setPromotions(data.promotions || [])
          setFeatured(data.featured || null)
        }
      } catch (error) {
        console.error('[PromoBanner] Error fetching promotions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPromotions()
  }, [restaurantSlug])

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast({
      title: "Code copied!",
      description: `Use code ${code} at checkout`,
    })
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) {
    return (
      <div className="px-3 sm:px-4 py-3">
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    )
  }

  if (!promotions.length) {
    return null
  }

  const bgColor = brandColor || '#DC2626'
  const promoCount = promotions.length

  return (
    <div className="px-3 sm:px-4 py-3 space-y-3">
      {/* Featured Promo Banner */}
      {featured && (
        <Card 
          className="overflow-hidden border-0 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%)` }}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-4">
              {/* Icon/Image */}
              <div className="flex-shrink-0">
                {featured.imageUrl ? (
                  <img 
                    src={featured.imageUrl} 
                    alt={featured.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 flex items-center justify-center">
                    {featured.type === 'coupon' ? (
                      <Tag className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    ) : (
                      <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/80 text-xs font-medium uppercase tracking-wider">
                    {featured.type === 'coupon' ? 'Promo Code' : 'Special Deal'}
                  </span>
                  {featured.firstOrderOnly && (
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                      First Order
                    </Badge>
                  )}
                </div>
                <h3 className="text-white font-bold text-lg sm:text-xl truncate">
                  {featured.discountText}
                </h3>
                <p className="text-white/80 text-sm truncate">
                  {featured.description}
                </p>
                {featured.minPurchase && featured.minPurchase > 0 && (
                  <p className="text-white/60 text-xs mt-1">
                    Min. order ${featured.minPurchase}
                  </p>
                )}
              </div>

              {/* Code/Action */}
              {featured.code && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-shrink-0 gap-2 bg-white text-gray-900 hover:bg-gray-100"
                  onClick={() => copyCode(featured.code!)}
                >
                  <span className="font-mono font-bold">{featured.code}</span>
                  {copiedCode === featured.code ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Time range if applicable */}
            {featured.timeRange && (
              <div className="flex items-center gap-1 mt-3 text-white/70 text-xs">
                <Clock className="w-3 h-3" />
                <span>Available {featured.timeRange}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* More promos toggle */}
      {promoCount > 1 && (
        <div className="space-y-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
          >
            <Gift className="w-4 h-4" />
            <span>{expanded ? 'Hide' : 'View'} {promoCount - 1} more offer{promoCount > 2 ? 's' : ''}</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>

          {/* Expanded list */}
          {expanded && (
            <div className="grid gap-2 sm:grid-cols-2">
              {promotions.filter(p => p.id !== featured?.id).map((promo) => (
                <Card key={promo.id} className="overflow-hidden">
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${bgColor}15` }}
                      >
                        {promo.type === 'coupon' ? (
                          <Percent className="w-5 h-5" style={{ color: bgColor }} />
                        ) : (
                          <Gift className="w-5 h-5" style={{ color: bgColor }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{promo.discountText}</p>
                        <p className="text-xs text-muted-foreground truncate">{promo.description}</p>
                        {promo.firstOrderOnly && (
                          <Badge variant="outline" className="text-xs mt-1">First Order</Badge>
                        )}
                      </div>
                    </div>
                    {promo.code && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0 gap-1.5"
                        onClick={() => copyCode(promo.code!)}
                      >
                        <span className="font-mono text-xs">{promo.code}</span>
                        {copiedCode === promo.code ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

