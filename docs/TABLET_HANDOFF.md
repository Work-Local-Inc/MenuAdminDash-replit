# Tablet App Backend Handoff

## Answers to Your Questions

### 1. What is the correct endpoint for updating order status?

**Endpoint:** `PATCH /api/tablet/orders/{order_id}/status`

Yes, this is correct.

---

### 2. What ID should be in the URL?

**Use the numeric `id`** (like `123`), NOT the UUID.

The API parses the ID as an integer:
```typescript
const orderIdNum = parseInt(orderId, 10)
if (isNaN(orderIdNum)) {
  return { error: "Invalid order ID" }  // 400
}
```

---

### 3. What should the request body look like?

**Use `status`** (not `order_status`):

```json
{
  "status": "confirmed"
}
```

Optional fields:
```json
{
  "status": "preparing",
  "notes": "Customer called to add extra item",
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

**Notes:**
- `ready → completed` is allowed for pickup orders
- Reversions from `completed`/`delivered` back to `preparing`/`ready` are allowed for order corrections

---

### 4. What HTTP method?

**PATCH** - This is correct.

---

### 5. Authentication

All tablet endpoints require device authentication via bearer token:

```
Authorization: Bearer <session_token>
```

The session token comes from the login response.

---

## API Reference

### Update Order Status
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

### Acknowledge Order (Separate Endpoint)
```
POST /api/tablet/orders/{id}
Authorization: Bearer <session_token>
```

This marks the order as "seen" by the tablet (sets `acknowledged_at` timestamp).

---

### Get Single Order
```
GET /api/tablet/orders/{id}
Authorization: Bearer <session_token>
```

---

### List Orders
```
GET /api/tablet/orders?status=pending&limit=50
Authorization: Bearer <session_token>
```

---

## RestoZone Driver Dispatch (8 Restaurants Only)

For restaurants using RestoZone 3rd-party delivery:

### Check if Dispatch Available
```
GET /api/tablet/orders/{id}/dispatch-driver
Authorization: Bearer <session_token>
```

### Request Driver
```
POST /api/tablet/orders/{id}/dispatch-driver
Authorization: Bearer <session_token>
```

See `docs/RESTOZONE_INTEGRATION.md` for full details.

---

## Debugging Tips

1. **Check server logs** - Look for `[Tablet Order Status]` prefix
2. **Verify numeric ID** - Must be a number, not UUID
3. **Check status transition** - Response includes `allowed_transitions` if invalid
4. **Verify auth token** - 401 means token expired or missing

---

## Contact

Backend issues? Check server logs for `[Tablet Order Status]` or `[Tablet Order Acknowledge]` prefixes.
