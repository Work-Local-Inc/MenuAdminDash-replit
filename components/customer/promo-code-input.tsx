"use client"

import { useState } from 'react'
import { useCartStore, AppliedPromo } from '@/lib/stores/cart-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Tag, X, Loader2, CheckCircle2 } from 'lucide-react'

interface PromoCodeInputProps {
  restaurantSlug: string
  brandedButtonStyle?: React.CSSProperties
}

export function PromoCodeInput({ restaurantSlug, brandedButtonStyle }: PromoCodeInputProps) {
  const { toast } = useToast()
  const { appliedPromo, applyPromo, clearPromo, getSubtotal, orderType } = useCartStore()
  
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const subtotal = getSubtotal()
  
  const handleApplyCode = async () => {
    if (!code.trim()) {
      setError('Please enter a promo code')
      return
    }
    
    setLoading(true)
    setError(null)
    
    console.log('[PromoCodeInput] Validating with:', {
      code: code.trim().toUpperCase(),
      restaurant_slug: restaurantSlug,
      subtotal,
      order_type: orderType,
    })
    
    try {
      const response = await fetch('/api/promotions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          restaurant_slug: restaurantSlug,
          subtotal,
          order_type: orderType,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Invalid promo code')
        return
      }
      
      // Apply the validated promo to cart
      const promo: AppliedPromo = {
        code: data.code,
        type: data.discount_type,
        value: data.discount_value,
        description: data.description,
        promoId: data.promo_id,
        promoType: data.promo_type,
      }
      
      applyPromo(promo)
      setCode('')
      
      toast({
        title: "Promo code applied!",
        description: promo.description,
      })
    } catch (err) {
      console.error('[PromoCodeInput] Error:', err)
      setError('Failed to validate promo code')
    } finally {
      setLoading(false)
    }
  }
  
  const handleRemovePromo = () => {
    clearPromo()
    toast({
      title: "Promo code removed",
      description: "Your discount has been removed",
    })
  }
  
  // If promo is already applied, show it
  if (appliedPromo) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {appliedPromo.code}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {appliedPromo.description}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemovePromo}
            className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900"
          >
            <X className="h-4 w-4 text-green-600" />
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter promo code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyCode()}
            className="pl-9"
            disabled={loading}
            data-testid="input-promo-code"
          />
        </div>
        <Button
          onClick={handleApplyCode}
          disabled={loading || !code.trim()}
          variant="outline"
          style={brandedButtonStyle}
          data-testid="button-apply-promo"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

