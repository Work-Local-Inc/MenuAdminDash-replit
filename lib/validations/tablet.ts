import { z } from 'zod'

// ==================== Auth Schemas ====================

export const deviceRegisterSchema = z.object({
  device_name: z.string().min(1, 'Device name is required').max(100),
  restaurant_id: z.coerce.number().int().positive('Restaurant ID must be a positive integer'),
  has_printing_support: z.preprocess((val) => {
    if (typeof val === 'string') return val === 'true'
    return val
  }, z.boolean().optional().default(true)),
}).passthrough()

export const deviceLoginSchema = z.object({
  device_uuid: z.string().uuid('Invalid device UUID'),
  device_key: z.string().min(32, 'Invalid device key'),
}).passthrough()

export const deviceRefreshSchema = z.object({
  session_token: z.string().min(1, 'Session token is required'),
}).passthrough()

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
  since: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
}).passthrough()

export const orderStatusUpdateSchema = z.object({
  status: orderStatusEnum,
  notes: z.string().max(500).optional().nullable(),
  estimated_ready_minutes: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return null
    const num = Number(val)
    return isNaN(num) ? null : num
  }, z.number().int().min(1).max(180).optional().nullable()),
}).passthrough()

// ==================== Heartbeat Schema ====================

const KNOWN_PRINTER_STATUSES = ['online', 'offline', 'paper_low', 'error', 'unknown', 'connecting', 'no_printer', 'idle', 'busy', 'paper_jam', 'paper_out', 'not_connected', 'disconnected'] as const

export const heartbeatSchema = z.object({
  battery_level: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return null
    const num = Number(val)
    return isNaN(num) ? null : Math.min(100, Math.max(0, num))
  }, z.number().min(0).max(100).optional().nullable()),
  printer_status: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return null
    if (typeof val === 'string') {
      const lower = val.toLowerCase().trim()
      if (KNOWN_PRINTER_STATUSES.includes(lower as any)) return lower
      return 'unknown'
    }
    return 'unknown'
  }, z.string().optional().nullable()),
  app_version: z.preprocess((val) => {
    if (val === null || val === undefined || val === '') return 'unknown'
    return String(val)
  }, z.string().optional().default('unknown')),
  last_print_at: z.string().optional().nullable(),
  last_successful_fetch: z.string().optional().nullable(),
  consecutive_fetch_failures: z.coerce.number().int().min(0).optional().nullable(),
  oldest_pending_order_minutes: z.coerce.number().int().min(0).optional().nullable(),
}).passthrough()

// ==================== Type Exports ====================

export type DeviceRegisterInput = z.infer<typeof deviceRegisterSchema>
export type DeviceLoginInput = z.infer<typeof deviceLoginSchema>
export type DeviceRefreshInput = z.infer<typeof deviceRefreshSchema>
export type OrdersListQuery = z.infer<typeof ordersListQuerySchema>
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>
export type HeartbeatInput = z.infer<typeof heartbeatSchema>
