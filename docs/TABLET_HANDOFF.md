# Tablet App Backend Handoff

**Last Updated:** January 2026

## Overview

This document covers the backend APIs available for the Menu.ca tablet app, including order management, status updates, and driver dispatch functionality.

---

## Authentication

All tablet endpoints require device authentication via bearer token:

```
Authorization: Bearer <session_token>
```

The session token comes from the login response when the tablet device authenticates.

---

## Order Management APIs

### 1. List Orders
```
GET /api/tablet/orders?status=pending&limit=50
Authorization: Bearer <session_token>
```

Query parameters:
- `status` - Filter by order status (optional)
- `limit` - Max orders to return (default: 50)

### 2. Get Single Order
```
GET /api/tablet/orders/{id}
Authorization: Bearer <session_token>
```

**Note:** Use the numeric `id` (like `123`), NOT the UUID.

### 3. Acknowledge Order
```
POST /api/tablet/orders/{id}
Authorization: Bearer <session_token>
```

Marks the order as "seen" by the tablet (sets `acknowledged_at` timestamp).

### 4. Update Order Status
```
PATCH /api/tablet/orders/{id}/status
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "status": "confirmed",
  "notes": "optional note",
  "estimated_ready_minutes": 25
}
```

**Valid status values:**
- `pending`
- `confirmed`
- `preparing`
- `ready`
- `out_for_delivery`
- `delivered`
- `completed`
- `cancelled`

**Valid status transitions:**
| From | Allowed Next Statuses |
|------|----------------------|
| pending | confirmed, preparing, cancelled |
| confirmed | preparing, cancelled |
| preparing | ready, cancelled |
| ready | out_for_delivery, completed, cancelled |
| out_for_delivery | delivered, cancelled |
| delivered | preparing, ready, cancelled (reversion allowed) |
| completed | preparing, ready, cancelled (reversion allowed) |
| cancelled | (final state) |

**Success Response (200):**
```json
{
  "success": true,
  "order": {
    "id": 123,
    "previous_status": "pending",
    "current_status": "confirmed"
  },
  "status_history": [
    {
      "status": "confirmed",
      "notes": "Status changed to confirmed by device abc123",
      "created_at": "2026-01-22T15:30:00Z"
    }
  ]
}
```

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 400 | Invalid order ID | ID is not a number |
| 400 | Validation failed | Invalid status value or body |
| 400 | Cannot transition from 'X' to 'Y' | Invalid status transition |
| 401 | Unauthorized | Missing or invalid token |
| 404 | Order not found | Order doesn't exist or wrong restaurant |
| 500 | Failed to update order status | Database error |

---

## Delivery Provider System (Database-Driven)

The delivery provider system has been upgraded to a **database-driven, extensible architecture**. This replaces the old hardcoded file-based system.

### Database Schema

**`delivery_providers` table** - Stores provider configurations:
```sql
id                    -- Primary key
code                  -- Provider identifier (e.g., 'restozone', 'tookan')
name                  -- Display name
api_base_url          -- Provider's API base URL
is_active             -- Whether provider is enabled
supports_fee_api      -- Can calculate delivery fees
supports_dispatch_api -- Can dispatch drivers
supports_tracking     -- Supports order tracking
```

**`delivery_and_pickup_configs` table** - Links restaurants to providers:
```sql
restaurant_id                 -- Restaurant ID
has_delivery_enabled          -- Delivery enabled flag
distance_based_delivery_fee   -- Uses distance-based fees
delivery_provider_id          -- FK to delivery_providers (nullable)
delivery_provider_external_id -- Restaurant's ID in provider's system
```

### Currently Supported Providers

| Provider | Code | Fee API | Dispatch API | Tracking |
|----------|------|---------|--------------|----------|
| RestoZone | `restozone` | Yes | Yes | No |

**Coming Soon:** Tookan, DoorDash Drive, Uber Direct

### Adding New Providers

The system uses an **adapter pattern**. To add a new provider:

1. Add provider record to `delivery_providers` table
2. Create adapter in `lib/delivery-providers/adapters/`
3. Register adapter in `lib/delivery-providers/factory.ts`

---

## Driver Dispatch APIs

### Check if Dispatch Available
```
GET /api/tablet/orders/{id}/dispatch-driver
Authorization: Bearer <session_token>
```

**Response:**
```json
{
  "dispatch_available": true,
  "provider": {
    "code": "restozone",
    "name": "RestoZone",
    "external_id": "12345"
  }
}
```

If restaurant doesn't have a provider configured:
```json
{
  "dispatch_available": false,
  "provider": null
}
```

### Request Driver Dispatch
```
POST /api/tablet/orders/{id}/dispatch-driver
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "prepTime": "14:30",
  "driverEarning": 5,
  "distanceKm": 3.5,
  "postalCode": "K1A0B1"
}
```

All fields are optional - the API will calculate defaults from order data.

**Success Response:**
```json
{
  "success": true,
  "order_id": 123,
  "provider": "restozone",
  "used_backup_email": false,
  "message": "Driver request sent to RestoZone"
}
```

**Backup Email Fallback:**
If the provider API fails, the system automatically sends a backup email to dispatch manually. The response indicates this:
```json
{
  "success": true,
  "order_id": 123,
  "provider": "restozone",
  "used_backup_email": true,
  "message": "Driver request sent via backup email (RestoZone API unavailable)"
}
```

**Requirements for Dispatch:**
- Order must be `delivery` type
- Order status must be: `confirmed`, `preparing`, or `ready`
- Restaurant must have a delivery provider configured with:
  - Active provider (`is_active = true`)
  - Dispatch support (`supports_dispatch_api = true`)
  - External ID set (`delivery_provider_external_id` not null)

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 400 | Restaurant not configured for external driver dispatch | No provider or missing external ID |
| 400 | Driver dispatch only available for delivery orders | Order is pickup type |
| 400 | Cannot dispatch driver for order in 'X' status | Invalid order status |
| 404 | Order not found | Order doesn't exist or wrong restaurant |
| 500 | No adapter available for provider: X | Provider code not implemented |

---

## RestoZone-Specific Details

For restaurants using RestoZone (`code: 'restozone'`):

**Fee Calculation:**
- API: `POST https://restozone.ca/deliveryzone/api/fraislivraison`
- Payload: `{ idresto: <external_id>, distance: <km> }`
- Returns: `{ frais: <fee_amount> }`

**Driver Dispatch:**
- API: `POST https://restozone.ca/api3rdparty/request_delivery/...`
- Payload includes: customer info, address, postal code, prep time, fees, distance, payment method, total

**Payment Method Mapping:**
| Order Payment | RestoZone Value |
|---------------|-----------------|
| card, credit_card | card |
| debit | debit |
| cash | cash |
| interac | interac |

**Backup Email Recipients:**
When API fails, emails are sent to RestoZone dispatch team.

---

## Configuring a Restaurant for Driver Dispatch

To enable driver dispatch for a restaurant:

1. **Ensure provider exists** in `delivery_providers` table
2. **Update restaurant config** in `delivery_and_pickup_configs`:
   ```sql
   UPDATE menuca_v3.delivery_and_pickup_configs
   SET 
     delivery_provider_id = <provider_id>,
     delivery_provider_external_id = '<restaurant_id_in_provider_system>'
   WHERE restaurant_id = <restaurant_id>;
   ```

The tablet app will then show the "Request Driver" option for delivery orders.

---

## Debugging Tips

1. **Check server logs** - Look for prefixes:
   - `[Tablet Order Status]` - Order status updates
   - `[Tablet Order Acknowledge]` - Order acknowledgments
   - `[Tablet Dispatch Driver]` - Driver dispatch requests
   - `[RestoZone getFee]` - Fee calculations
   - `[RestoZone dispatch]` - Driver dispatch calls

2. **Verify numeric ID** - Order IDs must be numbers, not UUIDs

3. **Check status transition** - Response includes `allowed_transitions` if invalid

4. **Verify auth token** - 401 means token expired or missing

5. **Check provider config** - Use GET dispatch-driver endpoint to verify setup

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/delivery-providers/types.ts` | Type definitions for provider system |
| `lib/delivery-providers/factory.ts` | Adapter factory (register new providers here) |
| `lib/delivery-providers/get-provider.ts` | Database queries for provider config |
| `lib/delivery-providers/adapters/restozone.ts` | RestoZone adapter implementation |
| `app/api/tablet/orders/[id]/status/route.ts` | Order status update endpoint |
| `app/api/tablet/orders/[id]/dispatch-driver/route.ts` | Driver dispatch endpoint |

---

## Contact

Backend issues? Check server logs for the prefixes listed above, or contact the development team.
