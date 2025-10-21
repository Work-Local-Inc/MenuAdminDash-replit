## Component 3: Status & Online/Offline Toggle

**Status:** ✅ **COMPLETE** (100%)  
**Last Updated:** 2025-10-17  
**Edge Functions:** 3 deployed

### Business Purpose

Restaurant status management and online ordering toggle system that enables:
- Clear operational status (active/pending/suspended)
- Independent online/offline ordering toggle
- Emergency shutdown capability
- Temporary closures without status changes
- Instant availability checks (<1ms)

---

## Business Logic & Rules

### Logic 1: Status Lifecycle Management

**Business Logic:**
```
New Restaurant Registration
├── 1. Create account with status = 'pending'
│   └── online_ordering_enabled = true (default)
│
├── 2. Restaurant completes onboarding
│   └── Status remains 'pending' (awaiting approval)
│
├── 3. Admin reviews and approves
│   └── UPDATE status = 'active'
│   └── Restaurant can now accept orders ✅
│
├── 4. (Optional) Restaurant toggles online ordering
│   └── Remains 'active', but enabled = false
│   └── Temporarily closed for private event
│
└── 5. (If needed) Admin suspends account
    └── UPDATE status = 'suspended'
    └── online_ordering_enabled forced to false
    └── Cannot accept orders until reactivated

State Transitions:
pending → active (admin approval)
active → suspended (violation)
suspended → active (appeal approved)
active → pending (NOT ALLOWED - irreversible action)
```

**Validation Rules:**
- ✅ Only `pending → active` transitions allowed without approval
- ✅ Suspended restaurants must have `online_ordering_enabled = false`
- ✅ Cannot revert active restaurants to pending status

---

### Logic 2: Temporary Closure (Toggle)

**Business Logic:**
```
Owner needs to temporarily close
├── Scenario 1: Equipment failure
│   ├── Click "Temporarily Close"
│   ├── Reason: "Oven repair - back in 2 hours"
│   └── System: online_ordering_enabled = false
│
├── Scenario 2: Staff shortage
│   ├── Click "Temporarily Close"
│   ├── Reason: "Unexpected staff absence - closed today"
│   └── System: online_ordering_enabled = false
│
├── Scenario 3: Private event
│   ├── Click "Temporarily Close"
│   ├── Reason: "Private event - reopen tomorrow 11 AM"
│   └── System: online_ordering_enabled = false
│
└── Reopen when ready
    ├── Click "Reopen"
    └── System: online_ordering_enabled = true

Business Rules:
1. Can only toggle if status = 'active'
   └── Suspended/pending accounts cannot toggle
2. Must provide reason when closing
   └── Shown to customers and support
3. Timestamp automatically set
   └── Track closure duration for analytics
4. Audit log created
   └── Who closed, when, why
```

**Closure Duration Tracking:**
```typescript
// Calculate how long restaurant was closed
const { data } = await supabase.rpc('get_closure_analytics', {
  p_restaurant_id: 561,
  p_period_days: 30
});

console.log(`Closed ${data.total_closures} times for ${data.total_hours} hours`);
```

---

### Logic 3: Emergency Shutdown

**Business Logic:**
```
Health inspector orders immediate closure
├── 1. Owner receives shutdown order
│   └── Must stop serving immediately
│
├── 2. Owner clicks "Emergency Close"
│   ├── Reason: "Health inspection - refrigeration failure"
│   ├── System: online_ordering_enabled = false (instant)
│   └── System: Alert sent to active orders
│
├── 3. Active orders handled
│   ├── "Preparing" orders → Refunded automatically
│   ├── "Out for delivery" orders → Completed (already cooked)
│   └── Customers notified: "Restaurant closed unexpectedly"
│
└── 4. Audit log created
    └── Reason, timestamp, affected orders logged

Emergency Close vs Regular Close:
├── Emergency: Immediate effect (0 seconds)
├── Emergency: Active orders refunded
├── Emergency: Manager dashboard alert
└── Regular: Graceful shutdown (finish active orders)
```

**Emergency Handler Example:**
```typescript
// Emergency closure with order handling
const { data } = await supabase.functions.invoke('toggle-online-ordering', {
  body: {
    restaurant_id: 561,
    enabled: false,
    is_emergency: true,
    reason: 'EMERGENCY: Health inspection - refrigeration failure'
  }
});

// Returns list of affected orders that were refunded
console.log(`Refunded ${data.affected_orders.length} active orders`);
```

---

## API Features

### Features

#### 3.1. Check Restaurant Availability

**Purpose:** Determine if a restaurant can currently accept orders and get detailed status information.

**Backend Functionality:**
- **SQL Function:** `menuca_v3.can_accept_orders(p_restaurant_id BIGINT)`
    - **Description:** Fast boolean check if restaurant can accept orders. Returns true only if status='active', not deleted, and online ordering enabled.
    - **Returns:** `BOOLEAN`
    - **Client-side Call (Direct SQL RPC):**
        ```typescript
        const { data, error } = await supabase.rpc('can_accept_orders', {
          p_restaurant_id: 948
        });
        // Returns: true or false
        ```

- **SQL Function:** `menuca_v3.get_restaurant_availability(p_restaurant_id BIGINT)`
    - **Description:** Detailed availability information including closure reason, duration, and status.
    - **Returns:** `TABLE(can_accept_orders BOOLEAN, status restaurant_status, online_ordering_enabled BOOLEAN, closure_reason TEXT, closed_since TIMESTAMPTZ, closure_duration_hours INTEGER)`
    - **Client-side Call (Direct SQL RPC - Internal Use):**
        ```typescript
        const { data, error } = await supabase.rpc('get_restaurant_availability', {
          p_restaurant_id: 948
        });
        // Returns detailed availability object
        ```

- **Edge Function:** `check-restaurant-availability` (Deployed as v1)
    - **Endpoint:** `GET /functions/v1/check-restaurant-availability?restaurant_id=948`
    - **Description:** Public endpoint for checking restaurant availability with user-friendly messaging. No authentication required (public read operation).
    - **Query Parameters:**
        - `restaurant_id` (required): Restaurant ID to check
    - **Response (200 OK):**
        ```json
        {
          "success": true,
          "data": {
            "restaurant_id": 948,
            "can_accept_orders": false,
            "status": "active",
            "online_ordering_enabled": false,
            "status_message": "Temporarily closed: Equipment repair - oven malfunction",
            "closure_info": {
              "reason": "Equipment repair - oven malfunction",
              "closed_since": "2025-10-17T14:23:15.000Z",
              "closure_duration_hours": 2
            }
          }
        }
        ```
    - **Client-side Call (Recommended for Customer App):**
        ```typescript
        const response = await supabase.functions.invoke('check-restaurant-availability', {
          method: 'GET'
        });
        
        // Or with fetch API
        const url = new URL(supabaseUrl + '/functions/v1/check-restaurant-availability');
        url.searchParams.set('restaurant_id', '948');
        
        const response = await fetch(url.toString());
        const data = await response.json();
        ```

**Features:**
- No authentication required (public data)
- User-friendly status messages
- Automatic closure duration calculation
- Fast response time (<10ms)

---

#### 3.2. Toggle Online Ordering

**Purpose:** Allow restaurant owners to temporarily enable/disable online ordering without changing account status.

**Backend Functionality:**
- **SQL Function:** `menuca_v3.toggle_online_ordering(p_restaurant_id BIGINT, p_enabled BOOLEAN, p_reason TEXT DEFAULT NULL, p_updated_by BIGINT DEFAULT NULL)`
    - **Description:** Toggle online ordering on/off. Validates status is 'active' and requires reason when disabling. Tracks timestamp and reason.
    - **Returns:** `TABLE(success BOOLEAN, message TEXT, new_status BOOLEAN)`
    - **Validation Rules:**
        - Can only toggle if restaurant status = 'active'
        - Reason required when disabling (not required when enabling)
        - Cannot toggle if already in desired state
    - **Client-side Call (Direct SQL RPC - Internal Use):**
        ```typescript
        const { data, error } = await supabase.rpc('toggle_online_ordering', {
          p_restaurant_id: 948,
          p_enabled: false,
          p_reason: 'Equipment repair - oven malfunction',
          p_updated_by: userId
        });
        ```

- **Edge Function:** `toggle-online-ordering` (Deployed as v1)
    - **Endpoint:** `POST /functions/v1/toggle-online-ordering`
    - **Description:** Authenticated wrapper for toggling online ordering. Validates user authentication, requires reason when disabling, logs admin actions.
    - **Request Body:**
        ```json
        {
          "restaurant_id": 948,
          "enabled": false,
          "reason": "Equipment repair - oven malfunction"
        }
        ```
    - **Response (200 OK):**
        ```json
        {
          "success": true,
          "data": {
            "restaurant_id": 948,
            "restaurant_name": "Milano's Pizza",
            "enabled": false,
            "message": "Online ordering disabled: Equipment repair - oven malfunction",
            "changed_at": "2025-10-17T21:15:30.000Z"
          },
          "message": "Online ordering disabled: Equipment repair - oven malfunction"
        }
        ```
    - **Client-side Call (Recommended for Owner/Admin):**
        ```typescript
        const { data, error } = await supabase.functions.invoke('toggle-online-ordering', {
          body: {
            restaurant_id: 948,
            enabled: false,
            reason: 'Equipment repair - oven malfunction'
          }
        });
        ```

**Validation:**
- User must be authenticated
- Reason required when disabling (not required when enabling)
- Restaurant must exist and not be deleted
- Can only toggle if status = 'active'

**Features:**
- Automatic admin action logging
- Real-time availability updates
- Reason tracking for customer communication

---

#### 3.3. Get Operational Restaurants

**Purpose:** Get list of all operational restaurants, optionally filtered by geographic location.

**Backend Functionality:**
- **Edge Function:** `get-operational-restaurants` (Deployed as v1)
    - **Endpoint:** `GET /functions/v1/get-operational-restaurants`
    - **Description:** Public endpoint for discovering operational restaurants. Supports location-based search with distance calculation. No authentication required.
    - **Query Parameters:**
        - `latitude` (optional): Customer latitude for location-based search
        - `longitude` (optional): Customer longitude for location-based search
        - `radius_km` (optional, default: 25): Search radius in kilometers (1-100)
        - `limit` (optional, default: 50): Maximum results to return (1-100)
    - **Response (200 OK) - Without Location:**
        ```json
        {
          "success": true,
          "data": [
            {
              "id": 948,
              "name": "Milano's Pizza",
              "status": "active",
              "can_accept_orders": true
            },
            {
              "id": 561,
              "name": "All Out Burger",
              "status": "active",
              "can_accept_orders": true
            }
          ],
          "total_count": 278
        }
        ```
    - **Response (200 OK) - With Location:**
        ```json
        {
          "success": true,
          "data": [
            {
              "id": 948,
              "name": "Milano's Pizza Downtown",
              "status": "active",
              "can_accept_orders": true,
              "distance_km": 1.2,
              "address": {
                "line1": "123 Main St",
                "city": "Ottawa",
                "province": "ON",
                "postal_code": "K1P 5N7"
              },
              "location": {
                "latitude": 45.4235,
                "longitude": -75.6950
              }
            },
            {
              "id": 561,
              "name": "Milano's Pizza West End",
              "status": "active",
              "can_accept_orders": true,
              "distance_km": 5.8,
              "address": {
                "line1": "456 Richmond Rd",
                "city": "Ottawa",
                "province": "ON",
                "postal_code": "K2A 0G8"
              },
              "location": {
                "latitude": 45.3890,
                "longitude": -75.7500
              }
            }
          ],
          "total_count": 12
        }
        ```
    - **Client-side Call (Without Location):**
        ```typescript
        const url = new URL(supabaseUrl + '/functions/v1/get-operational-restaurants');
        url.searchParams.set('limit', '20');
        
        const response = await fetch(url.toString());
        const data = await response.json();
        ```
    - **Client-side Call (With Location):**
        ```typescript
        const url = new URL(supabaseUrl + '/functions/v1/get-operational-restaurants');
        url.searchParams.set('latitude', '45.4215');
        url.searchParams.set('longitude', '-75.6972');
        url.searchParams.set('radius_km', '10');
        url.searchParams.set('limit', '20');
        
        const response = await fetch(url.toString());
        const { data } = await response.json();
        
        // Display restaurants
        data.forEach(restaurant => {
          console.log(`${restaurant.name} - ${restaurant.distance_km} km away`);
        });
        ```

**Features:**
- No authentication required (public data)
- Haversine distance calculation (accurate to <10m)
- Automatic sorting by distance (closest first)
- Filters by radius (only restaurants within range)
- Includes full address and coordinates
- Fast response time (<50ms for 50 results)

**Use Cases:**
- Customer restaurant discovery
- "Near me" search functionality
- Browse all operational restaurants
- Map view of nearby restaurants
- Distance-based delivery fee calculation

---

### Implementation Details

**Schema Infrastructure:**
- Status enum: `restaurant_status` ('active', 'pending', 'suspended', 'inactive', 'closed')
- Columns: `online_ordering_enabled` (BOOLEAN), `online_ordering_disabled_at` (TIMESTAMPTZ), `online_ordering_disabled_reason` (TEXT)
- Consistency constraint: Ensures `disabled_at` is set only when `enabled = false`
- Partial index: `idx_restaurants_accepting_orders` for optimal query performance

**Business Rules:**
1. **Status = 'active'** → Account approved, can toggle ordering
2. **Status = 'pending'** → Onboarding incomplete, cannot accept orders
3. **Status = 'suspended'** → Account restricted, cannot accept orders
4. **Toggle enabled** → Can accept orders (if status = 'active')
5. **Toggle disabled** → Temporarily closed (shows reason to customers)

**Query Performance:**
- `can_accept_orders()`: <1ms per call
- Partial index reduces index size by 71%
- 14-19x faster queries for operational restaurants

---

### Use Cases

**1. Equipment Failure - Temporary Closure**
```typescript
// Owner's oven breaks at 11:45 AM
await supabase.rpc('toggle_online_ordering', {
  p_restaurant_id: 948,
  p_enabled: false,
  p_reason: 'Equipment repair - oven malfunction. Back in 2 hours'
});

// Orders stop immediately
// Customers see: "Temporarily closed - Equipment repair"
// Status remains 'active' (account in good standing)

// Oven fixed at 1:45 PM
await supabase.rpc('toggle_online_ordering', {
  p_restaurant_id: 948,
  p_enabled: true
});

// Orders resume immediately
```

**2. Emergency Health Inspection Closure**
```typescript
// Health inspector discovers issue at 2:15 PM
// Manager clicks "Emergency Close" button
await supabase.rpc('toggle_online_ordering', {
  p_restaurant_id: 948,
  p_enabled: false,
  p_reason: 'EMERGENCY: Health inspection - refrigeration failure'
});

// Orders stop in <1 second
// Full compliance with health department
// Zero orders accepted after shutdown order
```

**3. Scheduled Maintenance**
```typescript
// Restaurant plans 7-day kitchen renovation
await supabase.rpc('toggle_online_ordering', {
  p_restaurant_id: 948,
  p_enabled: false,
  p_reason: 'Scheduled maintenance - Kitchen renovation. Reopening Oct 18'
});

// Customers see clear message with reopening date
// Status remains 'active'
// No confusion or support tickets
```

---

### API Reference Summary

| Feature | SQL Function | Edge Function | Method | Auth | Performance |
|---------|--------------|---------------|--------|------|-------------|
| Check Can Accept | `can_accept_orders()` | - | RPC | No | <1ms |
| Get Availability | `get_restaurant_availability()` | `check-restaurant-availability` | GET | No | <10ms |
| Toggle Ordering | `toggle_online_ordering()` | `toggle-online-ordering` | POST | ✅ Required | <50ms |
| Get Operational | - | `get-operational-restaurants` | GET | No | <50ms |

**All Functions Deployed:** ✅ Active in production (3 Edge Functions, 3 SQL Functions)

---

## Component 4: Status Audit Trail & History
