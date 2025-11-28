# Tablet Order App Integration Guide

**Created:** November 27, 2025  
**For:** Developers building the TabletOrderApp (React Native/Expo)  
**Backend Status:** ✅ COMPLETE - All API endpoints working

---

## 🚨 CRITICAL SECURITY FIX REQUIRED

**The current TabletOrderApp has a FATAL security flaw:**

The app has the **Supabase service-role key hardcoded** in the client. This key has FULL DATABASE ACCESS and must be:

1. **REMOVED from the app immediately**
2. **REVOKED in Supabase dashboard** after proper auth is working

**Why this is dangerous:**
- Anyone can extract the key from the APK
- Anyone can intercept network traffic and get the key
- With this key, attackers can DELETE ALL DATA, read all customer info, etc.

---

## ✅ What's Already Built (Backend API)

The MenuAdminDash backend has a complete, secure tablet API:

### API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/tablet/auth/login` | POST | None | Device authentication |
| `/api/tablet/auth/refresh` | POST | Bearer | Refresh session token |
| `/api/tablet/orders` | GET | Bearer | Fetch orders for restaurant |
| `/api/tablet/orders/[id]` | GET | Bearer | Get single order details |
| `/api/tablet/orders/[id]/status` | PATCH | Bearer | Update order status |
| `/api/tablet/heartbeat` | POST | Bearer | Device health check |

### API Base URL

**Production (Replit):** Check your Replit deployment URL  
**Local Development:** `http://localhost:5000`

---

## 📱 Correct Authentication Flow

### Step 1: Device Login

```typescript
// POST /api/tablet/auth/login
// No Authorization header needed

const response = await fetch(`${API_BASE_URL}/api/tablet/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    device_uuid: '006fe8aa-eec7-465c-bb8d-9180d3a2c910',
    device_key: 'aU2065zyc6zJrOwhQajVXToYLs4TNsOPlCgzKPVbyDE',
  }),
});

const data = await response.json();
// Returns:
// {
//   session_token: "QE_3U1oP-eHfKH7...",
//   expires_at: "2025-11-28T17:08:26.654Z",
//   device: {
//     id: 983,
//     uuid: "006fe8aa-eec7-465c-bb8d-9180d3a2c910",
//     name: "A19 test tabby01",
//     restaurant_id: 1009,
//     restaurant_name: "Econo Pizza"
//   },
//   config: {
//     poll_interval_ms: 5000,
//     auto_print: true,
//     sound_enabled: true,
//     ...
//   }
// }

// STORE session_token securely (AsyncStorage, SecureStore, etc.)
// STORE expires_at for refresh logic
```

### Step 2: Poll Orders

```typescript
// GET /api/tablet/orders
// Authorization: Bearer {session_token}

const response = await fetch(`${API_BASE_URL}/api/tablet/orders?status=pending`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
// Returns:
// {
//   orders: [
//     {
//       id: 50,
//       order_number: "ORD-1764264252992-MTQN1E",
//       order_type: "takeout",
//       order_status: "pending",
//       created_at: "2025-11-27T17:24:13.043Z",
//       customer: {
//         name: "John Smith",
//         phone: "***-***-1234",  // Masked for privacy
//         email: "jo***@example.com"
//       },
//       delivery_address: null,  // or { street, city, province, postal_code, instructions }
//       items: [
//         {
//           dish_id: 123,
//           name: "Large Pepperoni Pizza",
//           size: "Large",
//           quantity: 2,
//           unit_price: 15.99,
//           subtotal: 31.98,
//           modifiers: [
//             { id: 456, name: "Extra Cheese", price: 2.00 }
//           ],
//           special_instructions: "Well done please"
//         }
//       ],
//       subtotal: 33.98,
//       delivery_fee: 0,
//       tax_amount: 4.42,
//       tip_amount: 0,
//       total_amount: 38.40,
//       payment_status: "paid",
//       service_time: { type: "asap" },
//       acknowledged_at: null
//     }
//   ],
//   total_count: 1,
//   next_poll_at: "2025-11-27T18:00:05.000Z",
//   server_time: "2025-11-27T18:00:00.000Z"
// }
```

### Step 3: Update Order Status

```typescript
// PATCH /api/tablet/orders/{id}/status
// Authorization: Bearer {session_token}

const response = await fetch(`${API_BASE_URL}/api/tablet/orders/50/status`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: 'confirmed',  // or 'preparing', 'ready', 'completed', 'cancelled'
    notes: 'Order received by kitchen',
    estimated_ready_minutes: 25,  // optional
  }),
});

const data = await response.json();
// Returns updated order with status_history
```

### Step 4: Heartbeat (Every 30-60 seconds)

```typescript
// POST /api/tablet/heartbeat
// Authorization: Bearer {session_token}

const response = await fetch(`${API_BASE_URL}/api/tablet/heartbeat`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    app_version: '1.0.0',
    battery_level: 85,
    printer_status: 'online',  // or 'offline', 'paper_low', 'error'
    last_print_at: new Date().toISOString(),
  }),
});

const data = await response.json();
// Returns:
// {
//   success: true,
//   server_time: "2025-11-27T18:00:00.000Z",
//   config_update: { ... }  // Optional config changes pushed from admin
// }
```

### Step 5: Token Refresh (Before expiry)

```typescript
// POST /api/tablet/auth/refresh
// Authorization: Bearer {session_token}

const response = await fetch(`${API_BASE_URL}/api/tablet/auth/refresh`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
// Returns:
// {
//   session_token: "NEW_TOKEN_HERE...",
//   expires_at: "2025-11-29T17:08:26.654Z"
// }
```

---

## 🔄 Order Status Flow

```
pending → confirmed → preparing → ready → completed
                                      └→ out_for_delivery → delivered
Any state → cancelled
```

---

## 📋 Query Parameters for Orders

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (pending, confirmed, preparing, etc.) |
| `since` | ISO timestamp | Get orders after this time (for incremental polling) |
| `limit` | number | Max orders to return (default: 50) |

**Example:** `/api/tablet/orders?status=pending&limit=20`

---

## 🛡️ Security Features

1. **Device Keys:** bcrypt hashed, shown only once during registration
2. **Session Tokens:** 48-byte random, 24-hour expiry
3. **Data Masking:** Customer emails and phones are partially masked
4. **Rate Limiting:** 60 requests/minute per device
5. **Restaurant Isolation:** Devices only see orders for their assigned restaurant

---

## 🧪 Test Credentials

For development/testing:

```
API Base URL: [Your Replit URL]
Device UUID: 006fe8aa-eec7-465c-bb8d-9180d3a2c910
Device Key: aU2065zyc6zJrOwhQajVXToYLs4TNsOPlCgzKPVbyDE
Restaurant ID: 1009 (Econo Pizza)
```

Test orders exist in database for restaurant 1009.

---

## 🏗️ Recommended App Architecture

```
TabletOrderApp/
├── src/
│   ├── api/
│   │   └── tabletApi.ts       # All API calls (NO Supabase!)
│   ├── auth/
│   │   └── authStore.ts       # Token storage & refresh logic
│   ├── screens/
│   │   ├── LoginScreen.tsx    # UUID/Key entry (or QR scan)
│   │   ├── OrderListScreen.tsx
│   │   └── OrderDetailScreen.tsx
│   ├── services/
│   │   ├── pollService.ts     # Order polling logic
│   │   └── printService.ts    # ESC/POS printing
│   └── hooks/
│       └── useOrders.ts       # React Query or SWR for orders
```

---

## ❌ DO NOT DO THIS

```typescript
// ❌ WRONG - Direct Supabase with service key
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://xxx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // SERVICE ROLE KEY - DANGER!
)
const { data } = await supabase.from('orders').select('*')

// ❌ WRONG - Using anon key directly (can't access menuca_v3 schema)
const supabase = createClient(url, ANON_KEY)
```

## ✅ DO THIS INSTEAD

```typescript
// ✅ CORRECT - Use the secure API
const API_URL = 'https://your-replit-app.replit.app'

async function getOrders(sessionToken: string) {
  const response = await fetch(`${API_URL}/api/tablet/orders`, {
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  })
  return response.json()
}
```

---

## 🚀 Next Steps for TabletOrderApp

1. **Remove all Supabase client code** from the app
2. **Create `tabletApi.ts`** with fetch calls to our API
3. **Implement token storage** with SecureStore or AsyncStorage
4. **Add token refresh logic** (refresh when < 1 hour until expiry)
5. **Implement polling** with the config interval (default 5s)
6. **Add error handling** for 401 (re-login) and 429 (rate limit)
7. **Test with real orders** (create orders via checkout on web)

---

## 📞 Support

- **Backend Issues:** Create issue in MenuAdminDash-replit repo
- **Test Data:** Orders can be created via the customer checkout at `/r/econo-pizza-1009`

---

**Document Author:** Claude (AI Agent)  
**Last Updated:** November 27, 2025

