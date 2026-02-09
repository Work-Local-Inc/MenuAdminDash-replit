import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic'

/**
 * Cart item input for targeting validation
 */
interface CartItemInput {
  dish_id: number;
  course_id?: number;
  quantity: number;
  item_subtotal: number;
}

/**
 * Extract restaurant ID from slug format: "restaurant-name-123"
 */
function extractIdFromSlug(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  if (match) return parseInt(match[1], 10);
  
  const numericMatch = slug.match(/^(\d+)$/);
  if (numericMatch) return parseInt(numericMatch[1], 10);
  
  return null;
}

/**
 * Check if a cart item is eligible based on coupon targeting rules
 */
function isItemEligible(
  item: CartItemInput,
  targeting_type: string,
  targeting_mode: string,
  targeting_ids: number[]
): boolean {
  if (!targeting_ids || targeting_ids.length === 0) return true;
  
  const targetId = targeting_type === 'dish' ? item.dish_id : item.course_id;
  
  // If course targeting but course_id is missing, cannot determine eligibility
  if (targeting_type === 'course' && (targetId === undefined || targetId === null)) {
    // For include mode: item is NOT eligible (must be in list to qualify)
    // For exclude mode: item IS eligible (not in excluded list)
    return targeting_mode !== 'include';
  }
  
  const isInList = targeting_ids.includes(targetId as number);
  return targeting_mode === 'include' ? isInList : !isInList;
}

/**
 * Check if targeting is effectively enabled
 */
function hasActiveTargeting(
  targeting_type: string | null | undefined,
  targeting_ids: number[] | null | undefined
): boolean {
  if (!targeting_type || targeting_type === 'all') return false;
  if (!targeting_ids || targeting_ids.length === 0) return false;
  return true;
}

/**
 * POST /api/promotions/validate
 * Validate a promo code against promotional_coupons or promotional_deals
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any;
    const body = await request.json();
    
    const { code, restaurant_slug, subtotal, order_type, user_id, cart_items } = body;
    
    console.log('[Promo Validate] Request:', { code, restaurant_slug, subtotal, order_type, cart_items_count: cart_items?.length });
    
    if (!code || !restaurant_slug) {
      return NextResponse.json(
        { error: 'Code and restaurant are required' },
        { status: 400 }
      );
    }

    const restaurant_id = extractIdFromSlug(restaurant_slug);
    
    console.log('[Promo Validate] Extracted restaurant_id:', restaurant_id, 'from slug:', restaurant_slug);
    
    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'Invalid restaurant identifier' },
        { status: 400 }
      );
    }
    
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurant_id)
      .single();

    console.log('[Promo Validate] Restaurant lookup:', { restaurant, restaurantError });

    if (restaurantError || !restaurant) {
      console.log('[Promo Validate] Restaurant not found for ID:', restaurant_id, 'Error:', restaurantError);
      return NextResponse.json(
        { error: `Restaurant not found (slug: ${restaurant_slug}, id: ${restaurant_id})` },
        { status: 404 }
      );
    }

    // =====================================================
    // Check promotional_coupons (legacy/main coupons table)
    // =====================================================
    const { data: coupon, error: couponError } = await supabase
      .schema('menuca_v3')
      .from('promotional_coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('restaurant_id', restaurant_id)
      .is('deleted_at', null)
      .single();

    console.log('[Promo Validate] Coupon lookup:', { 
      code: code.toUpperCase(), 
      restaurant_id, 
      coupon: coupon ? { id: coupon.id, code: coupon.code, targeting_type: coupon.targeting_type } : null, 
      couponError: couponError?.message 
    });

    if (coupon && !couponError) {
      const now = new Date();
      
      if (coupon.valid_from_at && new Date(coupon.valid_from_at) > now) {
        return NextResponse.json(
          { error: 'This promo code is not yet active' },
          { status: 400 }
        );
      }
      
      if (coupon.valid_until_at && new Date(coupon.valid_until_at) < now) {
        return NextResponse.json(
          { error: 'This promo code has expired' },
          { status: 400 }
        );
      }
      
      if (coupon.is_active === false) {
        return NextResponse.json(
          { error: 'This promo code is no longer active' },
          { status: 400 }
        );
      }
      
      const usageLimit = coupon.max_redemptions ?? coupon.usage_limit;
      if (usageLimit !== null && usageLimit !== undefined) {
        const { count: usageCount } = await supabase
          .schema('menuca_v3')
          .from('coupon_usage_log')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id);
        
        if (usageCount !== null && usageCount >= usageLimit) {
          return NextResponse.json(
            { error: 'This promo code has reached its usage limit' },
            { status: 400 }
          );
        }
      }
      
      const maxPerCustomer = coupon.max_uses_per_customer;
      if (maxPerCustomer !== null && maxPerCustomer !== undefined && user_id) {
        const { count: userUsageCount } = await supabase
          .schema('menuca_v3')
          .from('coupon_usage_log')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('user_id', user_id);
        
        if (userUsageCount !== null && userUsageCount >= maxPerCustomer) {
          return NextResponse.json(
            { error: 'You have already used this promo code the maximum number of times' },
            { status: 400 }
          );
        }
      }

      // =====================================================
      // Item Targeting Logic
      // =====================================================
      const targetingType = coupon.targeting_type || 'all';
      const targetingMode = coupon.targeting_mode || 'include';
      const targetingIds: number[] = coupon.targeting_ids || [];
      
      const targetingEnabled = hasActiveTargeting(targetingType, targetingIds);
      
      let eligibleSubtotal = subtotal;
      let eligibleItems: CartItemInput[] = [];
      let enrichedCartItems: CartItemInput[] = [];
      let targetingWarning: string | undefined;
      
      if (targetingEnabled && cart_items && Array.isArray(cart_items) && cart_items.length > 0) {
        enrichedCartItems = [...cart_items] as CartItemInput[];
        
        if (targetingType === 'course') {
          const itemsNeedingCourse = enrichedCartItems.filter(item => item.course_id === undefined || item.course_id === null);
          
          if (itemsNeedingCourse.length > 0) {
            const dishIds = itemsNeedingCourse.map(item => item.dish_id);
            
            const { data: dishes, error: dishesError } = await supabase
              .schema('menuca_v3')
              .from('dishes')
              .select('id, course_id')
              .in('id', dishIds);
            
            if (!dishesError && dishes) {
              const courseMap = new Map<number, number>();
              for (const dish of dishes) {
                if (dish.course_id) {
                  courseMap.set(dish.id, dish.course_id);
                }
              }
              
              enrichedCartItems = enrichedCartItems.map(item => ({
                ...item,
                course_id: item.course_id ?? courseMap.get(item.dish_id)
              }));
            }
          }
        }
        
        eligibleItems = enrichedCartItems.filter(item => 
          isItemEligible(item, targetingType, targetingMode, targetingIds)
        );
        
        eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (item.item_subtotal || 0), 0);
        
        console.log('[Promo Validate] Targeting applied:', {
          targetingType,
          targetingMode,
          targetingIds,
          totalItems: enrichedCartItems.length,
          eligibleItems: eligibleItems.length,
          eligibleSubtotal,
          totalSubtotal: subtotal
        });
        
        if (eligibleSubtotal === 0) {
          return NextResponse.json(
            { error: 'No items in your cart qualify for this coupon' },
            { status: 400 }
          );
        }
      } else if (targetingEnabled && (!cart_items || !Array.isArray(cart_items) || cart_items.length === 0)) {
        targetingWarning = 'This coupon applies to specific items only. Final discount will be calculated at checkout.';
      }
      
      const subtotalForChecks = targetingEnabled && cart_items ? eligibleSubtotal : subtotal;
      
      if (coupon.minimum_purchase && subtotalForChecks < coupon.minimum_purchase) {
        const needed = (coupon.minimum_purchase - subtotalForChecks).toFixed(2);
        const itemContext = targetingEnabled ? ' on eligible items' : '';
        return NextResponse.json(
          { error: `Add $${needed} more${itemContext} to use this code (min. $${coupon.minimum_purchase})` },
          { status: 400 }
        );
      }
      
      const availTypes = coupon.availability_types || [];
      const orderTypeOk = availTypes.length === 0 || 
        (order_type === 'delivery' && (availTypes.includes('delivery') || availTypes.includes('all'))) ||
        (order_type === 'pickup' && (availTypes.includes('takeout') || availTypes.includes('pickup') || availTypes.includes('all')));
      
      if (availTypes.length > 0 && !orderTypeOk) {
        return NextResponse.json(
          { error: `This code is not valid for ${order_type} orders` },
          { status: 400 }
        );
      }
      
      if (coupon.is_first_order_only && user_id) {
        const { count: previousOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user_id)
          .eq('restaurant_id', restaurant_id)
          .eq('payment_status', 'succeeded');

        if (previousOrders && previousOrders > 0) {
          return NextResponse.json(
            { error: 'This code is only valid for first-time customers' },
            { status: 400 }
          );
        }
      }
      
      let discountValue = 0;
      let description = '';
      let discountType = coupon.discount_type;
      let activeTier = null;
      let nextTier = null;
      
      if (discountType === 'tiered' && coupon.discount_tiers && Array.isArray(coupon.discount_tiers)) {
        const tiers = coupon.discount_tiers.sort((a: any, b: any) => b.threshold_amount - a.threshold_amount);
        
        for (const tier of tiers) {
          if (subtotalForChecks >= tier.threshold_amount) {
            activeTier = tier;
            break;
          }
        }
        
        if (activeTier) {
          const currentIndex = tiers.indexOf(activeTier);
          if (currentIndex > 0) {
            nextTier = tiers[currentIndex - 1];
          }
        } else if (tiers.length > 0) {
          nextTier = tiers[tiers.length - 1];
        }
        
        if (activeTier) {
          if (activeTier.discount_type === 'percentage') {
            discountValue = activeTier.discount_value;
            discountType = 'percent';
            description = `${discountValue}% off (spend $${activeTier.threshold_amount}+ tier)`;
          } else {
            discountValue = activeTier.discount_value;
            discountType = 'currency';
            description = `$${discountValue} off (spend $${activeTier.threshold_amount}+ tier)`;
          }
        } else {
          const lowestTier = tiers[tiers.length - 1];
          const amountNeeded = (lowestTier.threshold_amount - subtotalForChecks).toFixed(2);
          return NextResponse.json(
            { 
              error: `Add $${amountNeeded} more to unlock ${lowestTier.discount_type === 'percentage' ? `${lowestTier.discount_value}%` : `$${lowestTier.discount_value}`} off`,
              is_tiered: true,
              next_tier: lowestTier,
              amount_needed: parseFloat(amountNeeded)
            },
            { status: 400 }
          );
        }
      } else if (discountType === 'percent' || discountType === 'percentage') {
        discountValue = coupon.discount_amount ?? coupon.redeem_value_limit ?? 0;
        description = `${discountValue}% off your order`;
        discountType = 'percent';
      } else if (discountType === 'currency' || discountType === 'fixed') {
        discountValue = coupon.discount_amount ?? coupon.redeem_value_limit ?? 0;
        description = `$${discountValue} off your order`;
        discountType = 'currency';
      } else if (discountType === 'item') {
        discountValue = 0;
        description = coupon.name || 'Free item';
      } else if (discountType === 'delivery') {
        discountValue = 0;
        description = 'Free delivery';
      } else {
        discountValue = coupon.discount_amount ?? coupon.redeem_value_limit ?? 0;
        description = coupon.name || 'Discount applied';
      }
      
      const response: any = {
        valid: true,
        code: coupon.code,
        discount_type: discountType,
        discount_value: discountValue,
        description: description,
        promo_id: coupon.id,
        promo_type: 'coupon',
        name: coupon.name,
        is_tiered: coupon.discount_type === 'tiered',
        active_tier: activeTier,
        next_tier: nextTier,
        all_tiers: coupon.discount_type === 'tiered' ? coupon.discount_tiers : undefined,
      };
      
      if (targetingEnabled) {
        response.targeting = {
          type: targetingType,
          mode: targetingMode,
          eligible_subtotal: eligibleSubtotal,
          total_subtotal: subtotal,
          eligible_items_count: eligibleItems.length,
          total_items_count: cart_items?.length || 0,
        };
      }
      
      if (targetingWarning) {
        response.targeting_warning = targetingWarning;
      }
      
      return NextResponse.json(response);
    }

    // =====================================================
    // Check promotional_deals for promo_code match
    // =====================================================
    const { data: deal, error: dealError } = await supabase
      .schema('menuca_v3')
      .from('promotional_deals')
      .select('*')
      .eq('promo_code', code.toUpperCase())
      .eq('restaurant_id', restaurant_id)
      .eq('is_enabled', true)
      .single();

    if (deal && !dealError) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      if (deal.date_start && deal.date_start > today) {
        return NextResponse.json(
          { error: 'This promo code is not yet active' },
          { status: 400 }
        );
      }
      
      if (deal.date_stop && deal.date_stop < today) {
        return NextResponse.json(
          { error: 'This promo code has expired' },
          { status: 400 }
        );
      }
      
      if (deal.minimum_purchase && subtotal < deal.minimum_purchase) {
        const needed = (deal.minimum_purchase - subtotal).toFixed(2);
        return NextResponse.json(
          { error: `Add $${needed} more to use this code (min. $${deal.minimum_purchase})` },
          { status: 400 }
        );
      }
      
      const maxTotalUses = deal.max_total_uses;
      if (maxTotalUses !== null && maxTotalUses !== undefined) {
        const { count: usageCount } = await supabase
          .schema('menuca_v3')
          .from('coupon_usage_log')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', deal.id);
        
        if (usageCount !== null && usageCount >= maxTotalUses) {
          return NextResponse.json(
            { error: 'This promo code has reached its usage limit' },
            { status: 400 }
          );
        }
      }
      
      const maxPerUser = deal.max_uses_per_user;
      if (maxPerUser !== null && maxPerUser !== undefined && user_id) {
        const { count: userUsageCount } = await supabase
          .schema('menuca_v3')
          .from('coupon_usage_log')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', deal.id)
          .eq('user_id', user_id);
        
        if (userUsageCount !== null && userUsageCount >= maxPerUser) {
          return NextResponse.json(
            { error: 'You have already used this promo code the maximum number of times' },
            { status: 400 }
          );
        }
      }
      
      let discountType: 'percent' | 'currency' | 'item' | 'delivery' = 'percent';
      let discountValue = 0;
      let description = deal.name || 'Special deal';
      
      if (deal.deal_type === 'percent' || deal.deal_type === 'percentTotal') {
        discountType = 'percent';
        discountValue = deal.discount_percent || 0;
        description = `${discountValue}% off your order`;
      } else if (deal.deal_type === 'value' || deal.deal_type === 'valueTotal') {
        discountType = 'currency';
        discountValue = deal.discount_amount || 0;
        description = `$${discountValue} off your order`;
      } else if (deal.deal_type === 'freeItem') {
        discountType = 'item';
        discountValue = 0;
        description = deal.name || 'Free item included';
      }
      
      return NextResponse.json({
        valid: true,
        code: deal.promo_code,
        discount_type: discountType,
        discount_value: discountValue,
        description: description,
        promo_id: deal.id,
        promo_type: 'deal',
        name: deal.name,
      });
    }

    return NextResponse.json(
      { error: 'Invalid promo code' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[POST /api/promotions/validate] Error:', error);
    return NextResponse.json(
      { error: 'Unable to validate code at this time' },
      { status: 500 }
    );
  }
}
