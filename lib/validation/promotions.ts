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
// Matches the form data sent from the deals page
export const createDealSchema = z.object({
  restaurant_id: z.number().int().positive('Restaurant ID must be a positive integer'),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  name_fr: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  description_fr: z.string().optional().nullable(),
  deal_type: z.string().optional().nullable(), // e.g., 'percent', 'value', 'freeItem', etc.
  discount_percent: z.number().min(0).optional().nullable(), // Percentage discount
  discount_amount: z.number().min(0).optional().nullable(), // Fixed amount discount
  date_start: z.string().optional().nullable(), // Start date (YYYY-MM-DD format)
  date_stop: z.string().optional().nullable(), // End date (YYYY-MM-DD format)
  time_start: z.string().optional().nullable(), // Start time
  time_stop: z.string().optional().nullable(), // End time
  is_enabled: z.boolean().default(true),
  min_order_value: z.number().min(0).optional().nullable(),
  max_uses_per_user: z.number().int().min(1).optional().nullable(),
  max_total_uses: z.number().int().min(1).optional().nullable(),
})

// Update deal schema (for PATCH /api/admin/promotions/deals/[id])
// Does NOT allow restaurant_id changes (security)
export const updateDealSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  name_fr: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  description_fr: z.string().optional().nullable(),
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
