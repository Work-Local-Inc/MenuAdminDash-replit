# RestoZone Delivery Dispatch Integration

> **Last Updated:** 2026-01-22  
> **Status:** API Ready for Integration

## Overview

This integration enables 3rd-party delivery dispatch via RestoZone for 8 Quebec restaurants. When a restaurant accepts a delivery order, staff can click "Request Driver" to dispatch a driver through RestoZone.

## Configured Restaurants

| Restaurant | V3 ID | RestoZone ID | Delivery Enabled |
|------------|-------|--------------|------------------|
| Centertown Donair & Pizza | 131 | 255 | Yes |
| Champa Thai Cuisine | 87 | 203 | Yes |
| Charm Thai Cuisine | 943 | 323 | No |
| Lemongrass Thai Cuisine | 1010 | 219 | No |
| New Mee Fung Restaurant | 15 | 101 | No |
| Oh My Grill | 807 | 1051 | Yes |
| Pho Bo Ga King - Somerset | 199 | 337 | No |
| Sushiyana | 847 | 1094 | Yes |

## API Endpoints

### 1. Get Delivery Fee (Checkout)

```
GET /api/customer/restaurants/{slug}/delivery-fee
```

**Query Parameters:**
- `lat` - Customer latitude
- `lng` - Customer longitude
- `distance` - Distance in km (optional, calculated from lat/lng)

**Response (RestoZone restaurant):**
```json
{
  "deliveryAvailable": true,
  "deliveryFee": 8.00,
  "distanceKm": 6,
  "source": "restozone_api",
  "isDistanceBased": true
}
```

**Fallback behavior:**
1. First tries RestoZone `getFees()` API
2. If API fails, uses `restaurant_distance_based_delivery_fees` table
3. For non-RestoZone restaurants, uses zone-based fees

### 2. Check Dispatch Availability (Tablet)

```
GET /api/tablet/orders/{orderId}/dispatch-driver
```

**Headers:**
- `X-Device-Id` - Device ID from registration
- `X-Device-Key` - Device authentication key

**Response:**
```json
{
  "uses_restozone": true,
  "restozone_id": 255,
  "dispatch_available": true
}
```

### 3. Request Driver (Tablet)

```
POST /api/tablet/orders/{orderId}/dispatch-driver
```

**Headers:**
- `X-Device-Id` - Device ID
- `X-Device-Key` - Device authentication key

**Optional Body (overrides):**
```json
{
  "prepTime": "18:30",
  "driverEarning": 8.00,
  "distanceKm": 6,
  "postalCode": "K1R6J6"
}
```

**Response:**
```json
{
  "success": true,
  "order_id": 12345,
  "used_backup_email": false,
  "message": "Driver request sent to RestoZone"
}
```

**Fallback behavior:**
1. First tries RestoZone `send_data()` API
2. If API fails, sends backup email to:
   - Deliveryzonecanada@gmail.com
   - mattmenuottawa2@gmail.com
   - restozonedispatch@gmail.com

## Tablet Integration

### Show "Request Driver" Button

Only show the button when:
1. Order type is `delivery`
2. Order status is `confirmed`, `preparing`, or `ready`
3. Restaurant uses RestoZone (check via GET endpoint above)

### Example Tablet UI Flow

```typescript
// Check if dispatch is available
const checkDispatch = async (orderId: number) => {
  const response = await fetch(`/api/tablet/orders/${orderId}/dispatch-driver`, {
    method: 'GET',
    headers: {
      'X-Device-Id': deviceId,
      'X-Device-Key': deviceKey,
    },
  });
  return response.json();
};

// Request driver dispatch
const requestDriver = async (orderId: number) => {
  const response = await fetch(`/api/tablet/orders/${orderId}/dispatch-driver`, {
    method: 'POST',
    headers: {
      'X-Device-Id': deviceId,
      'X-Device-Key': deviceKey,
      'Content-Type': 'application/json',
    },
  });
  const result = await response.json();
  
  if (result.success) {
    if (result.used_backup_email) {
      showToast('Driver requested via backup email');
    } else {
      showToast('Driver requested successfully');
    }
  }
};
```

## RestoZone API Details

### Get Fees API
- **Endpoint:** `https://restozone.ca/deliveryzone/api/fraislivraison`
- **Method:** POST
- **Payload:** `{ idresto: number, distance: number }`
- **Response:** `{ frais: number }` (delivery fee in dollars)

### Dispatch Driver API  
- **Endpoint:** `https://restozone.ca/api3rdparty/request_delivery/65e974f303d394c72942364d06840e09`
- **Method:** POST
- **Payload:**
  ```json
  {
    "idresto": 255,
    "adresse": "422 Bronson Ave",
    "codepostal": "K1R6J6",
    "nomclient": "John Doe",
    "telclient": "6135551234",
    "emailclient": "john@example.com",
    "preptime": "18:30",
    "frais": 8.00,
    "tip": 5.00,
    "donnerlivreur": 8.00,
    "distance": 6,
    "note": "Apt 302, Buzzer 5",
    "type_paiement1": "card",
    "total": 45.99
  }
  ```
- **Response:** `{ success: true }`

## Configuration

### Adding New Restaurants

1. Edit `lib/restozone/config.ts`
2. Add entry to `RESTOZONE_RESTAURANTS` array:
   ```typescript
   { v3Id: 999, restozoneId: 1234, name: 'New Restaurant' }
   ```
3. Ensure restaurant has `distance_based_delivery_fee = true` in database
4. Link delivery companies in `restaurant_delivery_companies` table

### Environment Variables

- `RESEND_API_KEY` - For backup email delivery (already configured)

## Backup Email Content

When the RestoZone API fails, backup emails are sent with:
- Order ID and restaurant info
- Customer name, phone, email, address
- Order total, delivery fee, tip
- Distance and prep time
- Payment method
- Full API payload for debugging
