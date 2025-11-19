import { z } from "zod"

export const couponCreateSchema = z.object({
  code: z.string().min(1),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().positive(),
  min_order_value: z.number().optional(),
  max_uses: z.number().int().positive().optional(),
  expires_at: z.string().datetime().optional(),
  restaurant_id: z.string().optional(),
  is_global: z.boolean().default(false),
}).strict()
