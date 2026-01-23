import { z } from "zod"

// Tier schema for tiered discounts (e.g., spend $50 get 10%, spend $100 get 20%)
export const discountTierSchema = z.object({
  threshold_amount: z.number().min(0), // Minimum cart subtotal to qualify for this tier
  discount_type: z.enum(["percentage", "fixed"]), // Type of discount at this tier
  discount_value: z.number().positive(), // Discount amount (percentage or fixed)
  description: z.string().optional().nullable(), // Optional description for this tier
})

export type DiscountTier = z.infer<typeof discountTierSchema>

// Schema matches the actual database column names in menuca_v3.promotional_coupons
export const couponCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1), // Required by database
  name_fr: z.string().optional().nullable(), // French translation
  description: z.string().optional().nullable(),
  description_fr: z.string().optional().nullable(), // French translation
  discount_type: z.enum(["percentage", "fixed", "tiered"]), // Added "tiered" option
  discount_amount: z.number().min(0), // For tiered discounts, this can be 0
  minimum_purchase: z.number().optional().nullable(), // Database column name
  max_redemptions: z.number().int().positive().optional().nullable(), // Database column name
  max_uses_per_customer: z.number().int().positive().optional().nullable(), // Per-customer limit
  valid_until_at: z.string().optional().nullable(), // Database column name (ISO datetime)
  valid_from_at: z.string().optional().nullable(),
  restaurant_id: z.number(), // ALWAYS required - coupons are location-specific only
  is_active: z.boolean().default(true),
  // Tiered discounts - JSONB array of tier objects
  discount_tiers: z.array(discountTierSchema).optional().nullable(),
})
