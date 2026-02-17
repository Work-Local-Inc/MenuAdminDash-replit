# Menu.ca — V3 Rollout Scorecard Definitions
**Generated:** February 2026  
**Source:** Codebase analysis + operational requirements

---

## Section F — V3 Rollout Scorecard

### F1) Platform-Level Scorecard

| Metric | Definition | Data Source | Baseline | 2-Week Target | Query/Measurement |
|---|---|---|---|---|---|
| **Adoption: Restaurants live** | Count of restaurants with `status='active'` AND `is_online_ordering_active=true` | `restaurants` + `delivery_and_pickup_configs` | Unknown — run: `SELECT COUNT(*) FROM restaurants r JOIN delivery_and_pickup_configs d ON r.id=d.restaurant_id WHERE r.status='active' AND d.is_online_ordering_active=true` | Baseline + 2 | Direct DB query |
| **Reliability: Order completion rate** | `COUNT(completed/delivered) / COUNT(paid orders)` | `orders` table | Unknown — run query for last 30 days | > 95% | `SELECT COUNT(*) FILTER (WHERE order_status IN ('completed','delivered')) * 100.0 / NULLIF(COUNT(*) FILTER (WHERE payment_status='paid'),0) FROM orders WHERE created_at > NOW()-INTERVAL '30 days'` |
| **Revenue: GMV (Gross Merchandise Value)** | `SUM(total_amount)` for paid orders | `orders` table | Unknown — run for last 30 days | Growth vs. previous period | `SELECT SUM(total_amount) FROM orders WHERE payment_status='paid' AND created_at > NOW()-INTERVAL '30 days'` |
| **Revenue: AOV (Avg Order Value)** | `AVG(total_amount)` for paid orders | `orders` table | Unknown | Stable or growing | `SELECT AVG(total_amount) FROM orders WHERE payment_status='paid' AND created_at > NOW()-INTERVAL '30 days'` |
| **Conversion: Checkout completion** | Orders created / checkout sessions started | GA4 `begin_checkout` → `purchase` events | Unknown — check GA4 | > 70% | GA4 funnel report (if `begin_checkout` and `purchase` events are firing) |
| **Support load: Incidents per restaurant** | Count of P1/P2 incidents per restaurant per week | Manual incident log | Unknown — start tracking now | < 1 per restaurant per week | Manual tracking or future alert system |
| **TTD (Time to detect)** | Time from incident start to detection | Incident log | Unknown | < 5 minutes for P1 | Requires alerting system |
| **TTR (Time to recover)** | Time from detection to resolution | Incident log | Unknown | < 30 minutes for P1 | Requires incident tracking |

### Establishing Baselines

**Priority queries to run ASAP against production database:**

```sql
-- 1. Active restaurants count
SELECT COUNT(DISTINCT r.id) as active_restaurants
FROM menuca_v3.restaurants r
JOIN menuca_v3.delivery_and_pickup_configs d ON r.id = d.restaurant_id
WHERE r.status = 'active';

-- 2. Order volume last 30 days
SELECT 
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_orders,
  COUNT(*) FILTER (WHERE order_status IN ('completed','delivered')) as completed_orders,
  SUM(total_amount) FILTER (WHERE payment_status = 'paid') as gmv,
  AVG(total_amount) FILTER (WHERE payment_status = 'paid') as aov
FROM menuca_v3.orders
WHERE created_at > NOW() - INTERVAL '30 days';

-- 3. Orders per restaurant (top 10)
SELECT 
  r.name,
  COUNT(o.id) as order_count,
  SUM(o.total_amount) as revenue
FROM menuca_v3.orders o
JOIN menuca_v3.restaurants r ON o.restaurant_id = r.id
WHERE o.created_at > NOW() - INTERVAL '30 days'
  AND o.payment_status = 'paid'
GROUP BY r.id, r.name
ORDER BY order_count DESC
LIMIT 10;

-- 4. Payment failure rate
SELECT 
  payment_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as pct
FROM menuca_v3.orders
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY payment_status;

-- 5. Refund rate
SELECT 
  COUNT(*) FILTER (WHERE payment_status IN ('refunded','partially_refunded')) as refunded,
  COUNT(*) FILTER (WHERE payment_status = 'paid') as paid,
  ROUND(
    COUNT(*) FILTER (WHERE payment_status IN ('refunded','partially_refunded')) * 100.0 
    / NULLIF(COUNT(*) FILTER (WHERE payment_status = 'paid'), 0)
  , 2) as refund_rate_pct
FROM menuca_v3.orders
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

### F2) Canary / Gradual Rollout Strategy

#### Current State
- V3 is rolling out restaurant-by-restaurant
- Each restaurant is activated individually via admin dashboard
- No formal canary process exists

#### Proposed Canary Controls

| Control | Implementation | Status |
|---|---|---|
| **Canary restaurant selection** | Choose 1-2 low-volume restaurants for new feature testing | Manual |
| **Per-restaurant ordering toggle** | `is_online_ordering_active` flag — can disable instantly | EXISTS |
| **Per-restaurant payment mode** | `payment_mode` in `delivery_and_pickup_configs` — test vs. live | EXISTS |
| **Per-restaurant Twilio toggle** | `twilio_call` flag | EXISTS |

#### 48-Hour Monitoring Checklist (Before Expanding)

After activating a new restaurant on V3:

| Check | When | How |
|---|---|---|
| First order goes through | Within 2 hours | Monitor `orders` table for new restaurant_id |
| Payment confirmed | Same | Verify `payment_status='paid'` |
| Tablet receives order | Same | Check `acknowledged_at` is set |
| Order completed | Within 4 hours | Check `order_status='completed'` |
| No 5xx errors on restaurant pages | 24 hours | Check application logs |
| Restaurant menu loads correctly | Immediately | Visit restaurant URL manually |
| Delivery fee calculates correctly | Immediately | Test with delivery address |
| Tip processing works | First order | Verify tip amount in order |
| Refund works | Within 48 hours | Process a test refund |
| Fallback call works (if enabled) | Test manually | Create test order, wait for ack timeout |

#### Rollback Criteria (Clear Thresholds)

| Condition | Action |
|---|---|
| > 3 payment failures in 1 hour for the restaurant | Disable ordering for that restaurant |
| Customer complaint about double charge | Immediately investigate; disable if pattern |
| Restaurant cannot receive any orders on tablet | Send recovery command; if persistent, disable ordering |
| Menu showing wrong items/prices | Disable ordering; investigate menu sync |
| Checkout flow throwing 500 errors | Rollback to previous checkpoint |

---

### Weekly V3 Health Report Template

```markdown
## V3 Weekly Report — Week of [DATE]

### Platform Summary
- Restaurants live: X (change: +/- Y)
- Total orders (7d): X
- GMV (7d): $X
- AOV: $X
- Payment success rate: X%
- Order completion rate: X%

### Per-Restaurant Highlights
| Restaurant | Orders | GMV | Issues |
|---|---|---|---|
| [Name] | X | $X | None / [description] |

### Incidents
| Date | Severity | Description | Resolution | Duration |
|---|---|---|---|---|

### Action Items
- [ ] Item 1
- [ ] Item 2
```
