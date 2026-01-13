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

### Technical Implementations
-   **ID Mapping**: Handles `combo_groups.restaurant_id` (V3 IDs) vs. `dishes.restaurant_id` (legacy_v1_id) via API.
-   **Terminology**: "Template" in the database translates to "modifier" or "modifier group" in the UI/code.
-   **Multilingual Database Architecture**: Dish names are stored in bilingual columns (`name_en`, `name_fr`), with the `get_restaurant_menu` RPC function using COALESCE for localization. Order validation APIs must use this RPC for dish metadata.
-   **Performance Optimization**: Parallel data fetching for critical pages like checkout.

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

## Recent Changes

### Stripe Payment Flow Stability (Jan 2026)
**Status:** FIXED
**Issues Fixed:**
1. **Double Payment Intent Creation** - React Strict Mode caused duplicate payment intent creation
2. **Modifier Loading 500 Error** - Orders API tried to use non-existent FK relationship
3. **Size Variant Mismatch** - Frontend "Regular" not matching database `null` for base prices
4. **Combo Modifier Loading Error** - Made combo modifier loading fault-tolerant

**Fixes:**
1. **Payment Intent Guard** (`components/customer/checkout-payment-form.tsx`):
   - Added `paymentIntentCreatedRef` guard to prevent duplicate creation
   - Keyed `<Elements>` component by `clientSecret` to prevent Stripe warnings

2. **Simple Modifier Two-Step Query** (`app/api/customer/orders/route.ts`):
   - Changed from FK join syntax (`modifier_groups!inner`) to two-step query
   - First query: `dish_modifiers` with `modifier_group_id`
   - Second query: `modifier_groups` to get `dish_id` for validation

3. **Size Variant Normalization** (`app/api/customer/orders/route.ts`):
   - Frontend sends "Regular" for base-priced items
   - Database stores `null` for base prices
   - Added normalization: `"Regular"` → `null` before price lookup

4. **Fault-Tolerant Combo Modifiers** (`app/api/customer/orders/route.ts`):
   - Combo modifier loading errors are now non-fatal
   - Sets `comboModifierLoadingFailed` flag when query fails
   - Validation becomes lenient - uses cart-submitted data as fallback

**Critical Pattern for Future Changes:**
- Guard ref for payment intent creation (prevents React Strict Mode duplicates)
- Keyed Elements by clientSecret (prevents Stripe prop warnings)
- Two-step queries for tables without FK relationships in PostgREST cache
- Fault-tolerant modifier validation with graceful fallbacks

### Menu Caching Implementation (Jan 2026)
**Status:** COMPLETE
**Performance Improvement:** 250x faster menu loads (~500ms → ~2ms)

**Changes:**
1. Created shared utility `lib/supabase/menu.ts` for all menu fetching
2. All customer-facing routes now use `get_restaurant_menu_cached()` instead of `get_restaurant_menu()`
3. Language validation ensures only 'en' or 'fr' are passed (prevents exceptions)
4. New `p_active_items_only` parameter filters inactive dishes/modifiers

**Updated Files:**
- `lib/supabase/menu.ts` - New shared menu fetch utility
- `app/(public)/r/[slug]/page.tsx` - Customer restaurant page
- `app/api/customer/restaurants/[slug]/menu/route.ts` - Customer menu API
- `app/api/customer/orders/route.ts` - Card payment validation
- `app/api/customer/orders/cash/route.ts` - Cash payment validation

**Usage:**
```typescript
import { fetchMenuForCustomer, fetchMenuForAdmin } from '@/lib/supabase/menu'

// Customer-facing (cached, active items only)
const { data, error } = await fetchMenuForCustomer(supabase, restaurantId, 'en')

// Admin (uncached, includes inactive items)
const { data, error } = await fetchMenuForAdmin(supabase, restaurantId, 'en')
```

**Cache Details:**
- Auto-invalidated when menu-related tables change (courses, dishes, modifiers, etc.)
- Manual rebuild: `SELECT menuca_v3.rebuild_menu_cache(restaurant_id::bigint)`
- Bilingual size variants: English uses "Small", "Standard", French uses "Petite", "Standard"

### Modifier Table Schema Fix (Jan 2026)
**Status:** FIXED
**Issue:** Multiple APIs were querying empty legacy tables (`dish_modifiers`, `dish_modifier_prices`) instead of the correct tables with actual data.

**CRITICAL Schema Info - Do NOT Use These Tables:**
| Table | Status | Notes |
|-------|--------|-------|
| `dish_modifiers` | **EMPTY/LEGACY** | Do NOT use - no data |
| `dish_modifier_prices` | **EMPTY/LEGACY** | Do NOT use - no data |

**Use These Tables Instead:**
| Table | Records | Columns |
|-------|---------|---------|
| `modifiers` | 68,881+ | `id`, `modifier_group_id`, `name_en`, `name_fr`, `is_active`, `display_order` |
| `modifier_prices` | Has data | `id`, `modifier_id`, `price`, `modifier_size_variant_id` |
| `modifier_groups` | 2,871+ | `id`, `restaurant_id`, `name_en`, `name_fr`, `category` - **NO dish_id column!** |

**CRITICAL: modifier_groups has NO dish_id column!**
- The relationship between dishes and modifier_groups is handled by the `get_restaurant_menu` RPC function
- To get dish-to-modifier-group mapping, use the menu data (dishes have modifier_groups nested inside)
- DO NOT query `modifier_groups.dish_id` - it doesn't exist and will cause 500 errors

**Files Fixed:**
- `app/api/menu/modifier-groups/route.ts` - Admin modifier groups library
- `app/api/customer/orders/route.ts` - Customer card payments (uses menu data for modifier validation)
- `app/api/customer/orders/cash/route.ts` - Customer cash payments
- `app/api/customer/dishes/[id]/modifiers/route.ts` - Customer dish modifiers endpoint

**Key Pattern:**
- Simple modifiers: `modifiers` table → `modifier_prices` table (keyed by `modifier_id`)
- Combo modifiers: `combo_modifiers` table → `combo_modifier_prices` table (separate system)
- Dish-to-modifier-group mapping: Use menu RPC data, NOT direct table queries