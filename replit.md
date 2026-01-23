# Menu.ca Admin Dashboard

## Overview
The Menu.ca Admin Dashboard is a Next.js 14 application for managing a multi-tenant restaurant ordering platform, integrated with a Supabase PostgreSQL database. Its primary purpose is to streamline the administration of restaurants, orders, coupons, and user accounts, thereby enhancing operational efficiency. Key capabilities include comprehensive restaurant and menu management, franchise oversight, and customer ordering system configuration. The business vision is to provide a robust, scalable, and intuitive platform, positioning Menu.ca as a leading solution in the online food ordering market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: Next.js 14 (App Router, TypeScript, Server & Client Components).
-   **UI/UX**: Tailwind CSS, shadcn/ui (Radix UI), `next-themes` for dark/light mode, responsive design.
-   **Authentication**: Supabase Auth (email/password) with middleware-based route protection.
-   **State Management**: React Query for server state, React Hook Form with Zod for forms, Zustand for customer-facing shopping cart.

### Backend & Data Layer
-   **Database**: Supabase PostgreSQL (`public` and `menuca_v3` schemas). The `menuca_v3` schema is critical for restaurant platform data and requires specific Supabase client configuration.
-   **Data Operations**: Primarily SQL Functions for reads and Edge Functions for writes.
-   **Admin Users**: Custom tables with RLS bypass for granular control.

### Core Features
-   **Restaurant Management**: Comprehensive tools for status, online ordering toggle, contact, and delivery area configuration.
-   **Menu Management**:
    -   **Unified Menu Builder**: Single interface for menu editing with grid layout, image uploads, inline editing, drag-and-drop reordering, and bulk operations.
    -   **Advanced Modifier System**: True linking system for global modifier groups with inheritance, automatic propagation, and a modifier-first workflow for bulk management of simple and combo modifiers.
    -   **Size & Price Variants**: Integrated management within dish editing.
    -   **Dish Availability**: Allows dishes to be visible only on specific days.
    -   **Combo Group Dish Selections**: `get_restaurant_menu` RPC returns `dish_selections` array within combo groups, enabling customers to choose dishes from a menu within a combo.
-   **Franchise Management**: Hierarchical system for linking restaurants and performing bulk updates.
-   **Categorization System**: Cuisine and tag-based discovery for restaurants.
-   **Customer Ordering System**:
    -   **Authentication**: Separate Supabase Auth for customers, including Google OAuth.
    -   **Order Types**: Delivery vs. Pickup with contextual fees, zone-based delivery area fee calculation, and scheduling options with finer time granularity and reduced advance booking.
    -   **Checkout Flow**: Multi-step process with Zustand cart, Google Places Autocomplete, and Stripe payment integration.
    -   **Account Pages**: Customer dashboard for order history and address management.
    -   **Security**: Server-side validation for prices, quantities, payments, and user authentication.
    -   **Branding**: Default branding system for consistent restaurant appearance.
    -   **Enhanced Order Customization**: Per-item special instructions, modifier quantity steppers, combo modifier free items, and consolidation of duplicate modifiers.
-   **Subdomain Routing**: Supports branded subdomain URLs (e.g., `restaurant.menu.ca`).
-   **Payment Mode Toggle**: Allows per-restaurant switching between test and live Stripe payments for controlled rollout.
-   **Provincial Tax System**: Dynamic provincial tax calculation with per-restaurant rates, replacing hardcoded values. Stores itemized tax lines per order.

### Technical Implementations
-   **ID Mapping**: Handles `combo_groups.restaurant_id` (V3 IDs) vs. `dishes.restaurant_id` (legacy_v1_id) via API.
-   **Terminology**: "Template" in the database translates to "modifier" or "modifier group" in the UI/code.
-   **Contact Information Storage (Jan 2026)**: The `restaurant_contacts` table no longer exists. Contact info is now split:
    -   `admin_users` + `admin_user_restaurants` → Owner/manager private contact for internal system communication
    -   `restaurant_locations` → Public contact (phone, email) for customer-facing purposes
-   **Multilingual Database Architecture**: Dish names are stored in bilingual columns (`name_en`, `name_fr`), with the `get_restaurant_menu` RPC function using COALESCE for localization. Order validation APIs must use this RPC for dish metadata.
-   **Performance Optimization**: Parallel data fetching for critical pages like checkout. Menu caching implemented for 250x faster loads, with auto-invalidation and manual rebuild options.
-   **Modifier Table Schema**: Critical distinction between legacy/empty tables (`dish_modifiers`, `dish_modifier_prices`) and active tables (`modifiers`, `modifier_prices`, `modifier_groups`). `modifier_groups` has NO `dish_id` column; the relationship is handled by the `get_restaurant_menu` RPC.

## External Dependencies

### Backend Services
-   **Supabase**: PostgreSQL database, authentication, real-time subscriptions.

### UI Libraries
-   **Radix UI**: Headless component primitives.
-   **Lucide React**: Icon library.
-   **Recharts**: Charting library.

### Integrations
-   **Mapbox GL JS**: Delivery area drawing.
-   **@hello-pangea/dnd**: Drag-and-drop reordering.
-   **Stripe**: Payment processing.
-   **Google Places API**: Address autocomplete and verification.

## Recent Implementations

### Commission System Rollback (Jan 2026)
**Status:** COMPLETE
**Change:** Removed incorrectly-implemented commission system from customer checkout flow.

Commission was incorrectly added to charge customers at checkout. The correct commission system (built by Santiago) is backend/admin-only:
- `restaurant_commission_configs` table for per-restaurant commission settings
- `platform_commission_reports` table for weekly/monthly billing reports
- Used in admin dashboard and restaurant owner portal only
- Commission is what Menu.ca charges restaurants, NOT what customers pay

**Removed from frontend:**
- Commission display from cart/checkout
- Commission calculations from payment intent API
- Commission calculations from cash order API
- Commission fields from admin service-config UI

**Database columns to be dropped by Brian:**
- `delivery_and_pickup_configs.commission_enabled`
- `delivery_and_pickup_configs.commission_rate`
- `delivery_and_pickup_configs.commission_base`
- `orders.commission_amount`

**Correct Commission System (Backend-Only):**
The proper commission system uses these database objects (built by Santiago):
- `restaurant_commission_configs` table - per-restaurant settings (rate, type, base)
- `platform_commission_reports` table - weekly/monthly billing reports
- `calculate_platform_commission()` RPC - calculates commission for a date range
- `generate_platform_commission_report()` RPC - generates billing reports

Commission is calculated AFTER orders are completed, aggregating completed order totals for billing restaurants.

### Subdomain Routing System (Jan 2026)
**Status:** LIVE
**Table:** `menuca_v3.restaurant_subdomains`

Dynamic subdomain-to-restaurant mapping system enables branded URLs like `centertowndonair.menu.ca`.

**Database Structure:**
- `restaurant_subdomains` table with columns: `restaurant_id`, `subdomain`, `slug`, `name`, `is_active`, `updated_at`
- `get_subdomain_mapping(subdomain)` RPC - Returns single mapping for middleware lookup
- `get_all_subdomain_mappings()` RPC - Returns all active mappings for cache warmup
- Trigger: `update_restaurant_subdomains_timestamp` - auto-updates `updated_at`

**Frontend Implementation (`lib/subdomain-mapping.ts`):**
- Database-first lookup via RPC with 5-minute in-memory caching
- Static fallback array for when database is unavailable
- Middleware (`middleware.ts`) uses async lookup to resolve subdomains

**Current Mappings:**
| restaurant_id | subdomain | slug | name |
|---|---|---|---|
| 131 | centertowndonair | centertown-donair-pizza-131 | Centertown Donair & Pizza |
| 245 | orchidsushiottawa | orchid-sushi-245 | Orchid Sushi |

**To add new subdomain (no code changes required):**
```sql
INSERT INTO menuca_v3.restaurant_subdomains (restaurant_id, subdomain, slug, name)
VALUES (999, 'newrestaurant', 'new-restaurant-999', 'New Restaurant');
```

### Stripe Payment Mode Toggle - Critical Implementation Notes (Jan 2026)
**Status:** LIVE

Per-restaurant switching between test and live Stripe payments.

**CRITICAL: Stripe Key Mismatch Prevention**
When switching payment modes (test ↔ live), the Stripe publishable key and secret key MUST match. A payment intent created with `sk_live_*` will NOT work with Stripe Elements initialized with `pk_test_*` and vice versa.

**Implementation:**
1. **payment-config API** (`/api/customer/restaurants/[slug]/payment-config`):
   - Returns `publishableKey` and `paymentMode` based on DB config
   - MUST have no-cache headers to prevent stale data
   - Test mode: uses `NEXT_PUBLIC_TESTING_VITE_STRIPE_PUBLIC_KEY`
   - Live mode: uses `VITE_STRIPE_PUBLIC_KEY`

2. **create-payment-intent API** (`/api/customer/create-payment-intent`):
   - Reads payment mode from DB and uses corresponding secret key
   - Test mode: uses `TESTING_STRIPE_SECRET_KEY`
   - Live mode: uses `STRIPE_SECRET_KEY`
   - Handles customer ID mismatch: test customers don't exist in live mode (creates new)

3. **Checkout page** (`app/(public)/checkout/page.tsx`):
   - Re-fetches payment-config RIGHT BEFORE creating payment intent
   - Ensures Stripe instance matches current payment mode
   - Uses `stripeCache` to avoid reloading same Stripe instance

**Common Bug: "Loading..." stuck on payment**
- Cause: Stripe Elements initialized with test key, payment intent created with live key
- Fix: Always refresh payment config before creating payment intent

**Database:**
- `delivery_and_pickup_configs.payment_mode` column: 'test' (default) or 'live'
- Stored Stripe customer IDs may not work across modes (test customer ≠ live customer)

### Subdomain API Routing Fix (Jan 2026)
**Status:** LIVE
**File:** `lib/api-utils.ts`

Branded subdomains (e.g., `centertowndonair.menu.ca`) need to route API calls to the main domain (`orders.menu.ca`) because the subdomain doesn't directly serve API routes.

**Problem:**
When on `centertowndonair.menu.ca`, relative API calls like `fetch('/api/customer/...')` go to `centertowndonair.menu.ca/api/...` which returns 404.

**Solution:**
Created `getApiBaseUrl()` helper in `lib/api-utils.ts`:
- On branded subdomains → returns `https://orders.menu.ca`
- On main domain or dev → returns empty string (relative URLs work)

**Files Updated:**
All customer-facing components with API calls now use `getApiBaseUrl()`:
- `app/(public)/checkout/page.tsx`
- `app/(public)/customer/login/page.tsx`
- `components/customer/checkout-address-form.tsx`
- `components/customer/checkout-payment-form.tsx`
- `components/customer/checkout-signin-modal.tsx`
- `components/customer/post-order-signup-modal.tsx`
- `components/customer/profile-tab.tsx`
- `components/customer/promo-banner.tsx`
- `components/customer/restaurant-menu-public.tsx`

**Usage:**
```typescript
import { getApiBaseUrl } from '@/lib/api-utils'

// Before (broken on subdomains):
fetch('/api/customer/orders', {...})

// After (works everywhere):
fetch(`${getApiBaseUrl()}/api/customer/orders`, {...})
```

### Delivery Providers System (Jan 2026)
**Status:** LIVE
**Documentation:** `docs/RESTOZONE_INTEGRATION.md`, `docs/DELIVERY_PROVIDERS_HANDOFF.md`

Extensible third-party delivery provider integration system supporting RestoZone (and future providers like Tookan, DoorDash Drive, Uber Direct).

**Database Schema:**
- `menuca_v3.delivery_providers` - Master list of provider companies (code, name, API URL, capabilities)
- `menuca_v3.delivery_and_pickup_configs` columns:
  - `delivery_provider_id` - FK to delivery_providers
  - `delivery_provider_external_id` - Restaurant's ID in provider's system

**Architecture:**
```
lib/delivery-providers/
├── types.ts           # Interfaces for providers, adapters, requests/responses
├── factory.ts         # Returns adapter based on provider code
├── get-provider.ts    # Database lookup for restaurant's provider config
├── index.ts           # Public exports
└── adapters/
    └── restozone.ts   # RestoZone-specific implementation
```

**How It Works:**
1. **At Checkout** - API queries database for restaurant's provider, calls provider's fee API, falls back to distance tiers
2. **On Tablet** - API queries database, routes to appropriate adapter for driver dispatch
3. **Backup Email** - Provider adapters send backup emails on API failure

**API Endpoints:**
- `GET /api/customer/restaurants/{slug}/delivery-fee` - Get delivery fee (uses provider API)
- `GET /api/tablet/orders/{id}/dispatch-driver` - Check if dispatch available
- `POST /api/tablet/orders/{id}/dispatch-driver` - Request driver dispatch

**Current Provider: RestoZone**
- Code: `restozone`
- Supports: Fee API, Dispatch API
- Backup emails: Deliveryzonecanada@gmail.com, mattmenuottawa2@gmail.com, restozonedispatch@gmail.com

**To Add New Restaurant to Existing Provider:**
```sql
UPDATE menuca_v3.delivery_and_pickup_configs
SET delivery_provider_id = (SELECT id FROM menuca_v3.delivery_providers WHERE code = 'restozone'),
    delivery_provider_external_id = '123'  -- Provider's restaurant ID
WHERE restaurant_id = 456;
```

**To Add New Provider:**
1. Insert into `menuca_v3.delivery_providers`
2. Create adapter in `lib/delivery-providers/adapters/`
3. Register in `lib/delivery-providers/factory.ts`