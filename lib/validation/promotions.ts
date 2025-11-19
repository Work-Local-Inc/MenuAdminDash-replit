import { z } from 'zod'

/**
 * Validation schemas for promotional deals
 * Used across API routes and frontend forms
 */

// Service types enum
export const serviceTypesSchema = z.array(
  z.enum(['delivery', 'pickup', 'dine_in'])
).min(1, 'At least one service type is required')

// Discount type enum
export const discountTypeSchema = z.enum(['percentage', 'fixed_amount'])

// Create deal schema (for POST /api/admin/promotions/deals/create)
export const createDealSchema = z.object({
  restaurant_id: z.number().int().positive('Restaurant ID must be a positive integer'),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().optional(),
  discount_type: discountTypeSchema,
  discount_value: z.number().positive('Discount value must be positive').finite('Discount value must be a valid number'),
  minimum_purchase: z.number().min(0, 'Minimum purchase cannot be negative').finite('Minimum purchase must be a valid number').optional().nullable(),
  start_date: z.string().datetime('Start date must be a valid ISO datetime'),
  end_date: z.string().datetime('End date must be a valid ISO datetime').optional().nullable(),
  service_types: serviceTypesSchema,
  first_order_only: z.boolean().default(false),
  is_enabled: z.boolean().default(true),
  terms_conditions: z.string().optional().nullable(),
  max_uses_per_user: z.number().int().min(1).optional().nullable(),
  max_total_uses: z.number().int().min(1).optional().nullable(),
  applicable_days: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  time_restrictions: z.object({
    start_time: z.string(),
    end_time: z.string()
  }).optional().nullable(),
})

// Update deal schema (for PATCH /api/admin/promotions/deals/[id])
// Does NOT allow restaurant_id changes (security)
export const updateDealSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  discount_type: discountTypeSchema.optional(),
  discount_value: z.number().positive().finite().optional(),
  minimum_purchase: z.number().min(0).finite().optional().nullable(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional().nullable(),
  service_types: serviceTypesSchema.optional(),
  first_order_only: z.boolean().optional(),
  is_enabled: z.boolean().optional(),
  terms_conditions: z.string().optional().nullable(),
  max_uses_per_user: z.number().int().min(1).optional().nullable(),
  max_total_uses: z.number().int().min(1).optional().nullable(),
  applicable_days: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  time_restrictions: z.object({
    start_time: z.string(),
    end_time: z.string()
  }).optional().nullable(),
}).strict() // Prevent any extra fields

// Toggle status schema (for PATCH /api/admin/promotions/deals/[id]/toggle)
export const toggleDealStatusSchema = z.object({
  is_enabled: z.boolean()
}).strict()

// Type exports for use in API routes and components
export type CreateDealInput = z.infer<typeof createDealSchema>
export type UpdateDealInput = z.infer<typeof updateDealSchema>
export type ToggleDealStatusInput = z.infer<typeof toggleDealStatusSchema>
