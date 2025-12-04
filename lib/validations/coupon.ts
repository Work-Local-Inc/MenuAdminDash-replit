import { z } from "zod"

// Schema matches the actual database column names in menuca_v3.promotional_coupons
export const couponCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1), // Required by database
  description: z.string().optional().nullable(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_amount: z.number().positive(), // Database column name
  minimum_purchase: z.number().optional().nullable(), // Database column name
  max_redemptions: z.number().int().positive().optional().nullable(), // Database column name
  valid_until_at: z.string().optional().nullable(), // Database column name (ISO datetime)
  valid_from_at: z.string().optional().nullable(),
  restaurant_id: z.number(), // ALWAYS required - coupons are location-specific only
  is_active: z.boolean().default(true),
})
