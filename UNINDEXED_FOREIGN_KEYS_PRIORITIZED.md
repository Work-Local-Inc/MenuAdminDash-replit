# Unindexed Foreign Keys - Prioritized by Traffic

## 🔥 HIGH TRAFFIC (Priority 1 - Do These First!)

### Orders Tables (Customer-facing, high volume):
```sql
-- orders + all partitions (2025_10, 2025_11, 2025_12, 2026_01, 2026_02, 2026_03)
CREATE INDEX idx_orders_cancelled_by ON menuca_v3.orders(cancelled_by);
CREATE INDEX idx_orders_delivery_city_id ON menuca_v3.orders(delivery_city_id);

-- Same for partitions:
CREATE INDEX idx_orders_2025_10_cancelled_by ON menuca_v3.orders_2025_10(cancelled_by);
CREATE INDEX idx_orders_2025_10_delivery_city_id ON menuca_v3.orders_2025_10(delivery_city_id);

CREATE INDEX idx_orders_2025_11_cancelled_by ON menuca_v3.orders_2025_11(cancelled_by);
CREATE INDEX idx_orders_2025_11_delivery_city_id ON menuca_v3.orders_2025_11(delivery_city_id);

CREATE INDEX idx_orders_2025_12_cancelled_by ON menuca_v3.orders_2025_12(cancelled_by);
CREATE INDEX idx_orders_2025_12_delivery_city_id ON menuca_v3.orders_2025_12(delivery_city_id);

CREATE INDEX idx_orders_2026_01_cancelled_by ON menuca_v3.orders_2026_01(cancelled_by);
CREATE INDEX idx_orders_2026_01_delivery_city_id ON menuca_v3.orders_2026_01(delivery_city_id);

CREATE INDEX idx_orders_2026_02_cancelled_by ON menuca_v3.orders_2026_02(cancelled_by);
CREATE INDEX idx_orders_2026_02_delivery_city_id ON menuca_v3.orders_2026_02(delivery_city_id);

CREATE INDEX idx_orders_2026_03_cancelled_by ON menuca_v3.orders_2026_03(cancelled_by);
CREATE INDEX idx_orders_2026_03_delivery_city_id ON menuca_v3.orders_2026_03(delivery_city_id);
```

### Cart/Customer Flow (Customer-facing):
```sql
CREATE INDEX idx_cart_sessions_restaurant_id ON menuca_v3.cart_sessions(restaurant_id);
CREATE INDEX idx_user_delivery_addresses_city_id ON menuca_v3.user_delivery_addresses(city_id);
```

---

## ⚠️ MEDIUM TRAFFIC (Priority 2 - If You Have Time)

### Restaurant Management (Admin-facing):
```sql
CREATE INDEX idx_restaurants_created_by ON menuca_v3.restaurants(created_by);
CREATE INDEX idx_restaurants_updated_by ON menuca_v3.restaurants(updated_by);
CREATE INDEX idx_restaurants_deleted_by ON menuca_v3.restaurants(deleted_by);

CREATE INDEX idx_restaurant_locations_deleted_by ON menuca_v3.restaurant_locations(deleted_by);
CREATE INDEX idx_restaurant_contacts_deleted_by ON menuca_v3.restaurant_contacts(deleted_by);
CREATE INDEX idx_restaurant_schedules_deleted_by ON menuca_v3.restaurant_schedules(deleted_by);
CREATE INDEX idx_restaurant_service_configs_deleted_by ON menuca_v3.restaurant_service_configs(deleted_by);
CREATE INDEX idx_restaurant_domains_deleted_by ON menuca_v3.restaurant_domains(deleted_by);
```

### Delivery Zones (Admin setup):
```sql
CREATE INDEX idx_restaurant_delivery_zones_created_by ON menuca_v3.restaurant_delivery_zones(created_by);
CREATE INDEX idx_restaurant_delivery_zones_updated_by ON menuca_v3.restaurant_delivery_zones(updated_by);
CREATE INDEX idx_restaurant_delivery_zones_deleted_by ON menuca_v3.restaurant_delivery_zones(deleted_by);
```

---

## 🔵 LOW TRAFFIC (Priority 3 - Optional)

### Admin/User Management (Low frequency):
```sql
CREATE INDEX idx_admin_users_role_id ON menuca_v3.admin_users(role_id);
CREATE INDEX idx_admin_users_deleted_by ON menuca_v3.admin_users(deleted_by);
CREATE INDEX idx_users_deleted_by ON menuca_v3.users(deleted_by);
```

### Promotions/Coupons (Infrequent):
```sql
CREATE INDEX idx_promotional_coupons_deleted_by ON menuca_v3.promotional_coupons(deleted_by);
```

### Vendors (Low volume):
```sql
CREATE INDEX idx_vendors_created_by ON menuca_v3.vendors(created_by);
CREATE INDEX idx_vendors_updated_by ON menuca_v3.vendors(updated_by);
CREATE INDEX idx_vendors_disabled_by ON menuca_v3.vendors(disabled_by);

CREATE INDEX idx_vendor_restaurants_created_by ON menuca_v3.vendor_restaurants(created_by);
CREATE INDEX idx_vendor_restaurants_updated_by ON menuca_v3.vendor_restaurants(updated_by);

CREATE INDEX idx_vendor_commission_reports_generated_by ON menuca_v3.vendor_commission_reports(report_generated_by);
```

### Combo System (Low usage):
```sql
CREATE INDEX idx_combo_group_translations_created_by ON menuca_v3.combo_group_translations(created_by);
CREATE INDEX idx_combo_group_translations_updated_by ON menuca_v3.combo_group_translations(updated_by);
```

### Dish Inventory (Admin only):
```sql
CREATE INDEX idx_dish_inventory_marked_unavailable_by ON menuca_v3.dish_inventory(marked_unavailable_by);
```

### Payment Transactions (Already has main indexes):
```sql
CREATE INDEX idx_payment_transactions_restaurant_id ON menuca_v3.payment_transactions(restaurant_id);
```

### Restaurant Status History (Audit trail):
```sql
CREATE INDEX idx_restaurant_status_history_changed_by ON menuca_v3.restaurant_status_history(changed_by);
```

---

## 🎯 Santiago's Recommendation:

**"Only PK-FK relations with high traffic"**

### Do These (High Traffic Only):
1. ✅ orders tables (all partitions) - `cancelled_by`, `delivery_city_id`
2. ✅ cart_sessions - `restaurant_id`
3. ✅ user_delivery_addresses - `city_id`

**Skip These (Low Traffic):**
- Admin user foreign keys (only used on login/admin pages)
- Vendor foreign keys (small dataset)
- Audit/history foreign keys (write-only, rarely queried by FK)

---

## 💡 Why Wrapping auth.uid() Makes It Faster

**Current (SLOW):**
```sql
-- Query: SELECT * FROM orders WHERE user_id = auth.uid();
-- What Postgres does:
Row 1: Call auth.uid() → "abc-123", compare → match
Row 2: Call auth.uid() → "abc-123", compare → match
Row 3: Call auth.uid() → "abc-123", compare → match
... calls auth.uid() 1000 times for 1000 rows!
```

**Fixed (FAST):**
```sql
-- Query: SELECT * FROM orders WHERE user_id = (SELECT auth.uid());
-- What Postgres does:
Call auth.uid() ONCE → "abc-123", store in variable
Row 1: Compare to "abc-123" → match
Row 2: Compare to "abc-123" → match
Row 3: Compare to "abc-123" → match
... calls auth.uid() ONCE for 1000 rows!
```

**Impact:** 1000x fewer function calls = 5-10x faster queries on large datasets

---

## 🍕 Takeout vs Delivery

**No, they're different:**
- **Delivery** = Restaurant brings food to customer's address (charges delivery fee)
- **Takeout/Pickup** = Customer comes to restaurant to pick up (no delivery fee)

In your `orders` table:
- `order_type`: "delivery" or "pickup"

---

Want me to create the Priority 1 fixes (RLS + high traffic indexes)? 🚀

