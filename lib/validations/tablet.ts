import { z } from 'zod'

// ==================== Auth Schemas ====================

export const deviceRegisterSchema = z.object({
  device_name: z.string().min(1, 'Device name is required').max(100),
  restaurant_id: z.number().int().positive('Restaurant ID must be a positive integer'),
  has_printing_support: z.boolean().optional().default(true),
})

export const deviceLoginSchema = z.object({
  device_uuid: z.string().uuid('Invalid device UUID'),
  device_key: z.string().min(32, 'Invalid device key'),
})

export const deviceRefreshSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
})

// ==================== Order Schemas ====================

export const orderStatusEnum = z.enum([
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled',
])

export const ordersListQuerySchema = z.object({
  status: orderStatusEnum.optional(),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

export const orderStatusUpdateSchema = z.object({
  status: orderStatusEnum,
  notes: z.string().max(500).optional(),
  estimated_ready_minutes: z.number().int().min(1).max(180).optional(),
})

// ==================== Heartbeat Schema ====================

export const heartbeatSchema = z.object({
  battery_level: z.number().min(0).max(100).optional(),
  printer_status: z.enum(['online', 'offline', 'paper_low', 'error']).optional(),
  app_version: z.string().min(1, 'App version is required'),
  last_print_at: z.string().datetime().optional(),
})

// ==================== Type Exports ====================

export type DeviceRegisterInput = z.infer<typeof deviceRegisterSchema>
export type DeviceLoginInput = z.infer<typeof deviceLoginSchema>
export type DeviceRefreshInput = z.infer<typeof deviceRefreshSchema>
export type OrdersListQuery = z.infer<typeof ordersListQuerySchema>
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>
export type HeartbeatInput = z.infer<typeof heartbeatSchema>
