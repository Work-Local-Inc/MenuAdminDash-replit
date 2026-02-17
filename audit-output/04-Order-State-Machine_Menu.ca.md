# Menu.ca — Order Lifecycle State Machine
**Generated:** February 2026  
**Source:** `app/api/tablet/orders/[id]/status/route.ts`, `app/api/customer/orders/route.ts`, `lib/twilio/order-fallback.ts`

---

## Order State Machine

### States

| State | Description | DB Field |
|---|---|---|
| `pending` | Order created, payment confirmed (or cash). Awaiting restaurant acknowledgment. | `orders.order_status` |
| `confirmed` | Restaurant has acknowledged the order via tablet or phone fallback. | `orders.order_status` |
| `preparing` | Kitchen is actively preparing the order. | `orders.order_status` |
| `ready` | Order is ready for pickup or driver dispatch. | `orders.order_status` |
| `out_for_delivery` | Driver has picked up the order (delivery only). | `orders.order_status` |
| `delivered` | Order delivered to customer (delivery only). | `orders.order_status` |
| `completed` | Order completed (pickup collected or delivery confirmed). | `orders.order_status` |
| `cancelled` | Order cancelled at any stage. Terminal state. | `orders.order_status` |

### Valid Transitions

```
Source: app/api/tablet/orders/[id]/status/route.ts (lines 75-84)

pending       → confirmed, preparing, cancelled
confirmed     → preparing, cancelled
preparing     → ready, cancelled
ready         → out_for_delivery, completed, cancelled
out_for_delivery → delivered, cancelled
delivered     → preparing, ready, cancelled   (reversion for corrections)
completed     → preparing, ready, cancelled   (reversion for corrections)
cancelled     → (terminal — no transitions)
```

**Special Notes:**
- `pending → preparing` is allowed directly for auto-print flow (skips `confirmed`)
- `ready → completed` is allowed for pickup orders
- `delivered/completed → preparing/ready` reversions allowed for order corrections
- `cancelled` is a terminal state with no outbound transitions

### Visual State Diagram

```
                                    ┌──────────┐
                        ┌──────────→│ cancelled │←─────────────────────────┐
                        │           └──────────┘                          │
                        │               ↑  ↑  ↑  ↑                       │
                        │               │  │  │  │                       │
┌─────────┐    ┌────────┴──┐    ┌───────┴──┐    ┌───────┐    ┌──────────────────┐
│ pending  │───→│ confirmed │───→│preparing │───→│ ready │───→│out_for_delivery │
└─────────┘    └───────────┘    └──────────┘    └───────┘    └──────────────────┘
     │              │                ↑  ↑           │                 │
     │              │                │  │           │                 │
     └──────────────┘                │  │           ↓                 ↓
     (auto-print skip)               │  │      ┌──────────┐    ┌───────────┐
                                     │  └──────│completed │    │ delivered │
                                     │         └──────────┘    └───────────┘
                                     └─────────────┘ (reversion)
```

### Transition Triggers

| Transition | Trigger | Actor | Code Location |
|---|---|---|---|
| (new) → `pending` | Customer places order + payment confirmed | Customer | `app/api/customer/orders/route.ts` |
| `pending` → `confirmed` | Tablet fetches orders (auto-acknowledge) | Tablet device | `app/api/tablet/orders/route.ts` (line ~109-121) |
| `pending` → `confirmed` | Phone fallback: restaurant presses 2 | Twilio voice | `lib/twilio/order-fallback.ts` → `markOrderAcknowledgedByPhone()` |
| `pending` → `preparing` | Auto-print flow (skip confirmed) | Tablet device | `app/api/tablet/orders/[id]/status/route.ts` |
| Any → `cancelled` | Admin or restaurant cancels | Admin/Tablet | `app/api/tablet/orders/[id]/status/route.ts` |
| `ready` → `out_for_delivery` | Driver dispatched | Tablet (via RestoZone) | `app/api/tablet/orders/[id]/dispatch-driver/route.ts` |
| `ready` → `completed` | Pickup collected | Tablet device | `app/api/tablet/orders/[id]/status/route.ts` |

### Payment States (Separate from Order Status)

| Payment Status | Description | DB Field |
|---|---|---|
| `pending` | Payment intent created, not yet confirmed | `orders.payment_status` |
| `paid` | Payment confirmed via Stripe webhook | `orders.payment_status` |
| `failed` | Payment failed | `orders.payment_status` |
| `refunded` | Full refund processed | `orders.payment_status` |
| `partially_refunded` | Partial refund processed | `orders.payment_status` |
| `cash` | Cash payment (no Stripe) | `orders.payment_status` |

### Acknowledgment Flow (Twilio Fallback)

```
Order created (payment_status = 'paid', acknowledged_at = NULL)
    │
    ├── Tablet online → Tablet fetches orders → auto-sets acknowledged_at
    │
    └── Tablet offline / not fetching
            │
            ├── 3 minutes pass → Cron job detects unacked order
            │       │
            │       ├── twilio_call = true for restaurant?
            │       │       │
            │       │       ├── YES → attemptFallbackCall()
            │       │       │       │
            │       │       │       ├── < 3 attempts → Twilio outbound call
            │       │       │       │       │
            │       │       │       │       ├── Press 1 → Repeat message
            │       │       │       │       └── Press 2 → markOrderAcknowledgedByPhone()
            │       │       │       │                     → sets acknowledged_at
            │       │       │       │
            │       │       │       └── >= 3 attempts → forceAcknowledgeAfterMaxCalls()
            │       │       │                           → auto-sets acknowledged_at
            │       │       │                           → writes [TWILIO_FALLBACK_MAX_REACHED]
            │       │       │
            │       │       └── NO → Skip (no fallback configured)
            │       │
            │       └── In-memory processedOrderIds prevents re-calling same order in single cron run
```

### Idempotency Rules

| Operation | Idempotency Mechanism | Code Reference |
|---|---|---|
| Stripe webhook processing | `stripe_webhook_events.stripe_event_id` dedup check | `app/api/customer/stripe-webhook/route.ts` (line 48-56) |
| Order acknowledgment | `acknowledged_at` field — once set, order drops out of cron query | `lib/twilio/order-fallback.ts` |
| Fallback call attempts | `[TWILIO_FALLBACK_CALL]` markers in `orders.special_instructions` | `lib/twilio/order-fallback.ts` |
| Cron duplicate prevention | In-memory `processedOrderIds` Set per cron run | `app/api/cron/order-fallback/route.ts` |
| Status transitions | `validTransitions` map — rejects invalid state changes | `app/api/tablet/orders/[id]/status/route.ts` |

### Status History Audit Trail

Every status change is recorded in the `order_status_history` table:
- `order_id` — FK to `orders.id`
- `order_created_at` — denormalized for partitioning
- `status` — new status value
- `notes` — human-readable change description
- `changed_by_device_id` — which tablet made the change (nullable)
- `created_at` — timestamp

**Source:** `app/api/tablet/orders/[id]/status/route.ts` (lines 140-161)

### Retry/Timeout Behavior

| Mechanism | Timeout | Behavior on Failure |
|---|---|---|
| Fallback call (unacked order) | 3 minutes (`ORDER_FALLBACK_ACK_TIMEOUT_SECONDS`) | Cron triggers Twilio call |
| Fallback retry spacing | 3 minutes (`RETRY_INTERVAL_MS`) | Must wait 3 min between call attempts |
| Max fallback calls | 3 total (placed + failed) | `forceAcknowledgeAfterMaxCalls()` auto-acknowledges |
| Tablet offline threshold | 3 minutes (`ORDER_FALLBACK_DEVICE_OFFLINE_SECONDS`) | Cron considers tablet offline |
| Online grace period | 3 minutes (`ORDER_FALLBACK_ONLINE_GRACE_SECONDS`) | Extra time before calling if tablet appears online |
