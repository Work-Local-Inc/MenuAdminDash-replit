import { Database } from './supabase-database'

export type PromotionalDeal = Database['menuca_v3']['Tables']['promotional_deals']['Row']
export type PromotionalCoupon = Database['menuca_v3']['Tables']['promotional_coupons']['Row']
export type CouponUsageLog = Database['menuca_v3']['Tables']['coupon_usage_log']['Row']

export type DealInsert = Database['menuca_v3']['Tables']['promotional_deals']['Insert']
export type DealUpdate = Database['menuca_v3']['Tables']['promotional_deals']['Update']

export type CouponInsert = Database['menuca_v3']['Tables']['promotional_coupons']['Insert']
export type CouponUpdate = Database['menuca_v3']['Tables']['promotional_coupons']['Update']

// Extended types with restaurant info
export type DealWithRestaurant = PromotionalDeal & {
  restaurants: {
    id: number
    name: string
    slug: string
  }
}

export type CouponWithRestaurant = PromotionalCoupon & {
  restaurants: {
    id: number
    name: string
    slug: string
  }
}

// Analytics types
export interface DealPerformance {
  deal_id: number
  total_redemptions: number
  total_discount_given: number
  total_revenue: number
  avg_order_value: number
  conversion_rate: number
}

export interface RestaurantDealAnalytics {
  total_deals: number
  active_deals: number
  total_redemptions: number
  total_discount_given: number
  total_revenue: number
  avg_order_value: number
}

export interface RestaurantCouponAnalytics {
  total_coupons: number
  active_coupons: number
  total_redemptions: number
  total_discount_given: number
  total_revenue: number
}

export interface TopPerformingDeal {
  deal_id: number
  deal_name: string
  redemptions: number
  total_discount: number
  total_revenue: number
}
