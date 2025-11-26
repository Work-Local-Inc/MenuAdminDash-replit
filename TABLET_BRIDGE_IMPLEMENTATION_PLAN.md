# Tablet Bridge App - Implementation Plan

**Project:** Menu.ca Tablet Order Bridge
**Purpose:** Enable Samsung tablets at restaurant locations to receive and print orders
**Date:** November 26, 2025

---

## 1. Overview

### Current State
- Orders are created via `/api/customer/orders` after Stripe payment
- Orders stored in `menuca_v3.orders` table with `restaurant_id`
- `menuca_v3.devices` table exists with `restaurant_id` linkage
- Order status tracked in `order_status_history` table

### Goal
Create a bridge system where:
1. Tablets authenticate with the API using device credentials
2. Tablets poll for new orders assigned to their restaurant
3. Orders are printed on thermal printers connected to tablets
4. Status updates flow back (Received → Preparing → Ready)

---

## 2. Architecture

```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│  Customer       │     │  Next.js API             │     │  Samsung Tablet     │
│  Places Order   │────▶│  POST /api/customer/     │     │  Bridge App         │
└─────────────────┘     │       orders             │     └─────────────────────┘
                        └──────────────────────────┘               │
                                    │                              │
                                    ▼                              ▼
                        ┌──────────────────────────┐     ┌─────────────────────┐
                        │  Supabase PostgreSQL     │◀────│  GET /api/tablet/   │
                        │  menuca_v3.orders        │     │       orders        │
                        │  menuca_v3.devices       │     │  (polls every 5s)   │
                        └──────────────────────────┘     └─────────────────────┘
                                                                   │
                                                                   ▼
                                                         ┌─────────────────────┐
                                                         │  Thermal Printer    │
                                                         │  (ESC/POS)          │
                                                         └─────────────────────┘
```

---

## 3. Database Changes

### 3.1 Devices Table Enhancement (Already Exists)
The `menuca_v3.devices` table already has the necessary structure:

```sql
-- Existing columns we'll use:
id                   INTEGER PRIMARY KEY
uuid                 VARCHAR (for public API exposure)
device_name          VARCHAR
device_key_hash      VARCHAR (for authentication)
restaurant_id        INTEGER (links to restaurants.id)
has_printing_support BOOLEAN
is_active            BOOLEAN
last_check_at        TIMESTAMP (for heartbeat)
last_boot_at         TIMESTAMP
```

### 3.2 New Table: `device_sessions` (Optional - for enhanced security)
```sql
CREATE TABLE menuca_v3.device_sessions (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES menuca_v3.devices(id),
  session_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_sessions_token ON menuca_v3.device_sessions(session_token);
CREATE INDEX idx_device_sessions_device ON menuca_v3.device_sessions(device_id);
```

### 3.3 Orders Table - Already Has What We Need
```sql
-- Existing columns:
order_status     VARCHAR  -- 'pending', 'confirmed', 'preparing', 'ready', etc.
restaurant_id    INTEGER  -- Links order to restaurant/tablet
created_at       TIMESTAMP
```

### 3.4 New Column on Orders (Optional)
```sql
-- Track which device acknowledged the order
ALTER TABLE menuca_v3.orders ADD COLUMN acknowledged_by_device_id INTEGER;
ALTER TABLE menuca_v3.orders ADD COLUMN acknowledged_at TIMESTAMP;
```

---

## 4. API Endpoints

### 4.1 Device Authentication

#### `POST /api/tablet/auth/register`
Register a new device (admin-initiated from dashboard)

```typescript
// Request
{
  device_name: string,      // "Front Counter Tablet"
  restaurant_id: number,
  has_printing_support: boolean
}

// Response
{
  device_id: number,
  device_uuid: string,
  device_key: string,       // One-time display, hashed in DB
  qr_code_data: string      // For easy tablet setup
}
```

#### `POST /api/tablet/auth/login`
Tablet authenticates to get session token

```typescript
// Request (from tablet app)
{
  device_uuid: string,
  device_key: string
}

// Response
{
  session_token: string,    // JWT or secure random token
  expires_at: string,       // ISO timestamp
  restaurant_id: number,
  device_name: string
}
```

#### `POST /api/tablet/auth/refresh`
Refresh expiring session

```typescript
// Request
{
  session_token: string
}

// Response
{
  session_token: string,    // New token
  expires_at: string
}
```

### 4.2 Order Management

#### `GET /api/tablet/orders`
Fetch orders for tablet's restaurant

```typescript
// Headers
Authorization: Bearer {session_token}

// Query params
?status=pending           // Filter by status
?since=2025-11-26T10:00:00Z  // Orders after timestamp
?limit=50

// Response
{
  orders: [
    {
      id: number,
      order_number: string,
      order_type: 'delivery' | 'pickup',
      order_status: string,
      created_at: string,
      customer: {
        name: string,
        phone: string,
        email: string       // Masked for privacy
      },
      delivery_address: {
        street: string,
        city: string,
        postal_code: string,
        instructions: string
      } | null,
      items: [
        {
          name: string,
          size: string,
          quantity: number,
          unit_price: number,
          modifiers: [{ name: string, price: number }],
          subtotal: number,
          special_instructions: string
        }
      ],
      subtotal: number,
      delivery_fee: number,
      tax_amount: number,
      total_amount: number,
      payment_status: string,
      service_time: {
        type: 'asap' | 'scheduled',
        scheduledTime?: string
      }
    }
  ],
  next_poll_at: string,     // Suggested next poll time
  server_time: string       // For time sync
}
```

#### `PATCH /api/tablet/orders/{id}/status`
Update order status

```typescript
// Headers
Authorization: Bearer {session_token}

// Request
{
  status: 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled',
  notes?: string,
  estimated_ready_minutes?: number  // For "preparing" status
}

// Response
{
  success: true,
  order: { ... },
  status_history: [...]
}
```

#### `POST /api/tablet/orders/{id}/acknowledge`
Mark order as received by tablet (for tracking)

```typescript
// Headers
Authorization: Bearer {session_token}

// Response
{
  success: true,
  acknowledged_at: string
}
```

### 4.3 Device Health

#### `POST /api/tablet/heartbeat`
Regular health check from device

```typescript
// Headers
Authorization: Bearer {session_token}

// Request
{
  battery_level?: number,
  printer_status?: 'online' | 'offline' | 'paper_low' | 'error',
  app_version: string,
  last_print_at?: string
}

// Response
{
  success: true,
  server_time: string,
  config_update?: {         // Push config changes
    poll_interval_ms: number,
    auto_print: boolean,
    sound_enabled: boolean
  }
}
```

---

## 5. Security Implementation

### 5.1 Device Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Admin      │     │  Next.js    │     │  Supabase   │
│  Dashboard  │     │  API        │     │  DB         │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Create Device  │                   │
       │──────────────────▶│                   │
       │                   │ 2. Generate key   │
       │                   │──────────────────▶│
       │                   │   Store hash      │
       │                   │                   │
       │ 3. Display key    │                   │
       │◀──────────────────│                   │
       │   (one-time)      │                   │
       │                   │                   │
```

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Tablet     │     │  Next.js    │     │  Supabase   │
│  App        │     │  API        │     │  DB         │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Login with     │                   │
       │    uuid + key     │                   │
       │──────────────────▶│                   │
       │                   │ 2. Verify hash    │
       │                   │──────────────────▶│
       │                   │                   │
       │                   │ 3. Create session │
       │                   │──────────────────▶│
       │                   │                   │
       │ 4. Session token  │                   │
       │◀──────────────────│                   │
       │                   │                   │
       │ 5. Poll orders    │                   │
       │   (with token)    │                   │
       │──────────────────▶│                   │
       │                   │ 6. Validate       │
       │                   │──────────────────▶│
       │                   │                   │
       │ 7. Return orders  │                   │
       │◀──────────────────│                   │
```

### 5.2 Token Security
- Device keys: 32-byte random, bcrypt hashed
- Session tokens: JWT with 24-hour expiry, includes device_id and restaurant_id
- Automatic refresh before expiry
- Rate limiting: 60 requests/minute per device

### 5.3 Data Security
- Tablets only see orders for their restaurant_id
- Customer emails partially masked
- No access to payment details beyond status
- Audit logging for all status changes

---

## 6. Polling vs Realtime

### Option A: Polling (Recommended for Phase 1)
**Pros:**
- Simpler implementation
- Works with any network
- No websocket complexity
- Offline resilience

**Implementation:**
```typescript
// Tablet polls every 5 seconds
const POLL_INTERVAL = 5000

async function pollOrders() {
  const response = await fetch('/api/tablet/orders?since=' + lastPollTime)
  // Process new orders
  // Print if auto_print enabled
  // Update UI
}

setInterval(pollOrders, POLL_INTERVAL)
```

### Option B: Supabase Realtime (Phase 2)
**Pros:**
- Instant order notifications
- Lower server load
- Better UX

**Implementation:**
```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

supabase
  .channel('orders')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'menuca_v3',
    table: 'orders',
    filter: `restaurant_id=eq.${restaurantId}`
  }, handleNewOrder)
  .subscribe()
```

**Recommendation:** Start with polling, add Realtime as enhancement.

---

## 7. Print Receipt Formatting

### 7.1 ESC/POS Format for Thermal Printers

```typescript
interface PrintReceipt {
  // Header
  restaurantName: string
  orderNumber: string
  orderType: 'DELIVERY' | 'PICKUP'
  orderTime: string

  // Customer
  customerName: string
  customerPhone: string

  // Address (delivery only)
  address?: {
    street: string
    city: string
    postalCode: string
    instructions?: string
  }

  // Items
  items: Array<{
    quantity: number
    name: string
    size?: string
    modifiers: string[]
    price: number
    specialInstructions?: string
  }>

  // Totals
  subtotal: number
  deliveryFee: number
  tax: number
  total: number

  // Footer
  estimatedTime?: string
  paymentStatus: string
}
```

### 7.2 Sample Receipt Output

```
================================
        RESTAURANT NAME
================================
Order #: ORD-1234567890-ABC123
Type: DELIVERY
Time: Nov 26, 2025 2:30 PM
--------------------------------

CUSTOMER: John Smith
PHONE: (555) 123-4567

DELIVER TO:
123 Main Street
Toronto, ON M5V 1A1
Instructions: Ring doorbell twice

================================
         ORDER ITEMS
================================

2x  Large Pepperoni Pizza   $35.98
    - Extra Cheese (+$2.00)
    - Mushrooms (+$1.50)

1x  Garden Salad            $8.99
    - Ranch Dressing

1x  2L Coca-Cola            $3.99
    ** No ice please **

--------------------------------
Subtotal:              $48.96
Delivery Fee:           $4.99
HST (13%):              $7.01
================================
TOTAL:                 $60.96
================================
PAID - Visa ****4242

Estimated: 45-60 minutes

================================
      THANK YOU!
================================
```

### 7.3 Print Library

For the tablet app, use a library like:
- **react-native-thermal-receipt-printer** (React Native)
- **escpos** (Node.js if using Electron)
- **Web Bluetooth API** (PWA option)

---

## 8. Implementation Phases

### Phase 1: Core API (This Project) - 2-3 days
1. Create `/api/tablet/` route directory
2. Implement device authentication endpoints
3. Implement order polling endpoint
4. Implement status update endpoint
5. Add heartbeat endpoint
6. Create Zod validation schemas
7. Add device auth middleware
8. Unit tests for API endpoints

### Phase 2: Admin Dashboard Integration - 1-2 days
1. Device management UI in admin dashboard
2. Register new devices
3. View device status (online/offline)
4. Deactivate/reactivate devices
5. View device activity logs

### Phase 3: Tablet App (Separate Repo) - 5-7 days
1. Choose framework (React Native recommended for Samsung tablets)
2. Device registration/login flow
3. Order list UI with real-time updates
4. Order detail view
5. Status update buttons
6. Thermal printer integration
7. Sound notifications
8. Offline queue for status updates

### Phase 4: Enhancements - Ongoing
1. Supabase Realtime integration
2. Push notifications via Firebase
3. Order history and analytics
4. Multi-printer support
5. Kitchen display system (KDS) mode

---

## 9. File Structure (API Additions)

```
app/api/tablet/
├── auth/
│   ├── register/
│   │   └── route.ts       # POST - Create new device (admin)
│   ├── login/
│   │   └── route.ts       # POST - Device login
│   └── refresh/
│       └── route.ts       # POST - Refresh session
├── orders/
│   ├── route.ts           # GET - List orders for device's restaurant
│   └── [id]/
│       ├── route.ts       # GET - Single order details
│       ├── status/
│       │   └── route.ts   # PATCH - Update order status
│       └── acknowledge/
│           └── route.ts   # POST - Mark as received
├── heartbeat/
│   └── route.ts           # POST - Device health check
└── config/
    └── route.ts           # GET - Device configuration

lib/
├── tablet/
│   ├── auth.ts            # Device auth helpers
│   ├── verify-device.ts   # Middleware for tablet endpoints
│   └── receipt-format.ts  # Receipt formatting utilities
└── validations/
    └── tablet.ts          # Zod schemas for tablet API

types/
└── tablet.ts              # TypeScript interfaces for tablet API
```

---

## 10. Testing Strategy

### 10.1 API Testing
```bash
# Test device registration
curl -X POST http://localhost:3000/api/tablet/auth/register \
  -H "Content-Type: application/json" \
  -d '{"device_name": "Test Tablet", "restaurant_id": 73}'

# Test device login
curl -X POST http://localhost:3000/api/tablet/auth/login \
  -H "Content-Type: application/json" \
  -d '{"device_uuid": "xxx", "device_key": "yyy"}'

# Test order polling
curl http://localhost:3000/api/tablet/orders \
  -H "Authorization: Bearer {token}"
```

### 10.2 Integration Testing
- Mock Supabase for unit tests
- Test with real database for integration tests
- Simulate multiple devices polling simultaneously
- Test session expiry and refresh

---

## 11. Questions to Clarify

Before starting implementation:

1. **Device Registration:** Should devices be registered through the admin dashboard, or should tablets self-register with a setup code?

2. **Legacy Device IDs:** The `devices` table has `legacy_v1_id` and `legacy_v2_id` columns. Are there existing devices in production that need to be migrated?

3. **Auto-Print:** Should orders auto-print when received, or require manual "Print" action?

4. **Multiple Printers:** Will tablets support multiple printers (e.g., kitchen + customer receipt)?

5. **Sound Notifications:** What sound/alert for new orders?

6. **Offline Handling:** What should happen if the tablet loses internet while orders are pending?

7. **Tablet App Framework:** Preference between React Native, Flutter, or PWA?

---

## 12. Success Metrics

- **Latency:** New orders visible on tablet within 10 seconds
- **Reliability:** 99.9% uptime for tablet API
- **Print Success:** 99%+ print success rate
- **Status Sync:** Status updates reflected within 5 seconds

---

## 13. Next Steps

1. ✅ Review and approve this plan
2. Create database migration for `device_sessions` table
3. Implement Phase 1 API endpoints
4. Test with Postman/curl
5. Begin tablet app development (separate repo)

---

**Plan Author:** Claude (AI Agent)
**Review Status:** Awaiting Approval
**Last Updated:** November 26, 2025
