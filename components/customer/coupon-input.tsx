'use client';

import { useState } from 'react';
import { Tag, Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/lib/stores/cart-store';
import { useToast } from '@/hooks/use-toast';

interface TierInfo {
  threshold_amount: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

interface CouponInputProps {
  restaurantSlug: string;
  buttonStyle?: 'rounded' | 'square' | null;
}

export function CouponInput({ restaurantSlug, buttonStyle }: CouponInputProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tierInfo, setTierInfo] = useState<{
    isTiered: boolean;
    activeTier: TierInfo | null;
    nextTier: TierInfo | null;
    allTiers: TierInfo[];
  } | null>(null);
  
  const { appliedPromo, applyPromo, getSubtotal, orderType, items } = useCartStore();
  const { toast } = useToast();
  
  const getButtonClassName = () => {
    return buttonStyle === 'square' 
      ? 'rounded-none' 
      : buttonStyle === 'rounded' 
      ? 'rounded-full' 
      : '';
  };
  
  const handleApplyCoupon = async () => {
    if (!code.trim()) {
      setError('Please enter a coupon code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/promotions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          restaurant_slug: restaurantSlug,
          subtotal: getSubtotal(),
          order_type: orderType,
          cart_items: items.map(item => ({
            dish_id: item.dishId,
            quantity: item.quantity,
            item_subtotal: item.subtotal,
          })),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Invalid coupon code');
        return;
      }
      
      applyPromo({
        code: data.code,
        type: data.discount_type,
        value: data.discount_value,
        description: data.description,
        promoId: data.promo_id,
        promoType: data.promo_type,
        // Include tier info for tiered discounts
        isTiered: data.is_tiered || false,
        activeTier: data.active_tier || null,
        nextTier: data.next_tier || null,
        allTiers: data.all_tiers || [],
        // Include targeting info for item-specific coupons
        targeting: data.targeting || null,
      });
      
      // Store tier info locally for display
      if (data.is_tiered) {
        setTierInfo({
          isTiered: true,
          activeTier: data.active_tier,
          nextTier: data.next_tier,
          allTiers: data.all_tiers || [],
        });
      }
      
      setCode('');
      toast({
        title: 'Coupon applied',
        description: data.description,
      });
      
    } catch (err) {
      console.error('Coupon validation error:', err);
      setError('Failed to validate coupon. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (appliedPromo) {
    return null;
  }
  
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Enter coupon code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyCoupon();
              }
            }}
            className={`pl-9 ${getButtonClassName()}`}
            disabled={isLoading}
            data-testid="input-coupon-code"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleApplyCoupon}
          disabled={isLoading || !code.trim()}
          className={getButtonClassName()}
          data-testid="button-apply-coupon"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" data-testid="text-coupon-error">
          {error}
        </p>
      )}
    </div>
  );
}
