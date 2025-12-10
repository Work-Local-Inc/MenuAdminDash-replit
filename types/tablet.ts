/**
 * TypeScript types for Tablet Bridge API
 * Used for device authentication, order polling, and status updates
 */

// ==================== Device Types ====================

export interface Device {
  id: number
  uuid: string
  device_name: string
  restaurant_id: number | null
  has_printing_support: boolean
  is_active: boolean
  last_check_at: string | null
  last_boot_at: string | null
  firmware_version: number
  software_version: number
  created_at: string
  updated_at: string
}

export interface DeviceSession {
  id: number
  device_id: number
  session_token: string
  expires_at: string
  created_at: string
  last_activity_at: string
}

export interface DeviceConfig {
  poll_interval_ms: number
  auto_print: boolean
  sound_enabled: boolean
  notification_tone: string
  print_customer_copy: boolean
  print_kitchen_copy: boolean
}

// ==================== Auth Types ====================

export interface DeviceRegisterRequest {
  device_name: string
  restaurant_id: number
  has_printing_support?: boolean
}

export interface DeviceRegisterResponse {
  device_id: number
  device_uuid: string
  device_key: string // One-time display, store securely!
  qr_code_data: string
  message: string
}

export interface DeviceLoginRequest {
  device_uuid: string
  device_key: string
}

export interface DeviceLoginResponse {
  session_token: string
  expires_at: string
  device: {
    id: number
    uuid: string
    name: string
    restaurant_id: number
    restaurant_name: string
  }
  config: DeviceConfig
}

export interface DeviceRefreshRequest {
  session_token: string
}

export interface DeviceRefreshResponse {
  session_token: string
  expires_at: string
}

// ==================== Order Types ====================

export interface TabletOrderItem {
  dish_id: number
  name: string
  size: string
  quantity: number
  unit_price: number
  subtotal: number
  modifiers: Array<{
    id: number
    name: string
    price: number
    placement: 'whole' | 'left' | 'right' | null
  }>
  special_instructions?: string
}

export interface TabletOrderCustomer {
  name: string
  phone: string
  email: string // Partially masked for privacy
}

export interface TabletOrderAddress {
  street: string
  city: string
  province: string
  postal_code: string
  instructions?: string
}

export interface TabletOrder {
  id: number
  order_number: string
  order_type: 'delivery' | 'pickup'
  order_status: OrderStatus
  created_at: string

  customer: TabletOrderCustomer
  delivery_address: TabletOrderAddress | null

  items: TabletOrderItem[]

  subtotal: number
  delivery_fee: number
  tax_amount: number
  tip_amount: number
  total_amount: number

  payment_status: string

  service_time: {
    type: 'asap' | 'scheduled'
    scheduledTime?: string
  }

  acknowledged_at?: string
  acknowledged_by_device_id?: number
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export interface OrdersListRequest {
  status?: OrderStatus
  since?: string // ISO timestamp
  limit?: number
}

export interface OrdersListResponse {
  orders: TabletOrder[]
  total_count: number
  next_poll_at: string
  server_time: string
}

export interface OrderStatusUpdateRequest {
  status: OrderStatus
  notes?: string
  estimated_ready_minutes?: number
}

export interface OrderStatusUpdateResponse {
  success: boolean
  order: TabletOrder
  status_history: Array<{
    status: string
    notes: string | null
    created_at: string
  }>
}

export interface OrderAcknowledgeResponse {
  success: boolean
  acknowledged_at: string
}

// ==================== Heartbeat Types ====================

export interface HeartbeatRequest {
  battery_level?: number
  printer_status?: 'online' | 'offline' | 'paper_low' | 'error'
  app_version: string
  last_print_at?: string
}

export interface HeartbeatResponse {
  success: boolean
  server_time: string
  config_update?: Partial<DeviceConfig>
}

// ==================== Verified Device Context ====================

/**
 * Context passed to tablet API routes after device verification
 */
export interface VerifiedDeviceContext {
  device_id: number
  device_uuid: string
  restaurant_id: number
  session_id: number
}

// ==================== Print Receipt Types ====================

export interface PrintReceiptData {
  restaurant_name: string
  restaurant_phone?: string
  restaurant_address?: string

  order_number: string
  order_type: 'DELIVERY' | 'PICKUP'
  order_time: string

  customer_name: string
  customer_phone: string

  delivery_address?: {
    street: string
    city: string
    postal_code: string
    instructions?: string
  }

  items: Array<{
    quantity: number
    name: string
    size?: string
    modifiers: string[]
    price: number
    special_instructions?: string
  }>

  subtotal: number
  delivery_fee: number
  tax: number
  tip?: number
  total: number

  estimated_time?: string
  payment_status: string
  payment_method?: string
}
