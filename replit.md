# Menu.ca Admin Dashboard

## Overview
The Menu.ca Admin Dashboard is a Next.js 14 application for managing a multi-tenant restaurant ordering platform, integrated with a Supabase PostgreSQL database. Its purpose is to streamline the administration of restaurants, orders, coupons, and user accounts, enhancing operational efficiency. Key capabilities include comprehensive restaurant and menu management, franchise oversight, and customer ordering system configuration. The business vision is to provide a robust, scalable, and intuitive platform, positioning Menu.ca as a leading solution in the online food ordering market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: Next.js 14 (App Router, TypeScript, Server & Client Components).
-   **UI/UX**: Tailwind CSS, shadcn/ui (Radix UI), `next-themes` for dark/light mode.
-   **Authentication**: Supabase Auth (email/password), middleware-based route protection.
-   **State Management**: React Query for server state, React Hook Form with Zod for forms, Zustand for customer-facing shopping cart.

### Backend & Data Layer
-   **Database**: Supabase PostgreSQL (`public` and `menuca_v3` schemas). `menuca_v3` is critical for restaurant platform data, requiring specific Supabase client configuration.
-   **Data Operations**: Primarily SQL Functions for reads and Edge Functions for writes.
-   **Admin Users**: Custom tables with RLS bypass for granular control.

### Core Features
-   **Restaurant Management**: Status, online ordering toggle, contact, delivery area configuration.
-   **Menu Management**:
    -   **Unified Menu Builder**: Single interface for menu editing with grid layout, image uploads, and inline editing.
    -   **Modifier Groups Architecture**: True linking system for global modifier groups, allowing inheritance and automatic propagation of updates.
    -   **Unified Modifier Manager**: Modifier-first workflow for bulk management of simple and combo modifiers.
    -   **Size & Price Variants**: Integrated management within dish editing.
    -   **Drag-and-Drop**: For reordering categories and dishes.
    -   **Bulk Operations**: Multi-select dishes for batch actions.
-   **Franchise Management**: Hierarchical system for linking restaurants and bulk updates.
-   **Categorization System**: Cuisine and tag-based discovery.
-   **Customer Ordering System**:
    -   **Authentication**: Separate Supabase Auth for customers, including Google OAuth.
    -   **Order Types**: Delivery vs. Pickup with contextual fees and scheduling.
    -   **Delivery Area Fee Calculation**: Zone-based fees.
    -   **Checkout Flow**: Multi-step process with Zustand cart, Google Places Autocomplete, and Stripe payment.
    -   **Account Pages**: Customer dashboard for order history, address management.
    -   **Security**: Server-side validation for prices, quantities, payments, and user authentication.
    -   **Default Branding System**: Consistent branding for restaurants without custom configurations.
    -   **Per-Item Special Instructions**: Stores notes at the item level for allergy safety, displayed prominently on receipts.
    -   **Modifier Quantity Steppers**: Allows selection of multiple units of a modifier.
    -   **Combo Modifier Free Items**: Supports free items within combo sections.
    -   **Duplicate Modifier Consolidation**: Consolidates duplicate modifiers for clearer display and kitchen receipts.
    -   **Special Combo Selections**: Allows customers to choose full dishes as part of a combo.

### UI/UX Decisions
-   **Color Schemes**: Dark/light mode support via `next-themes`.
-   **Templates**: Utilizes shadcn/ui components for a consistent design.
-   **Design Approaches**: Responsive design with Tailwind CSS.

### Technical Implementations
-   **ID Mapping**: Handles `combo_groups.restaurant_id` (V3 IDs) vs. `dishes.restaurant_id` (legacy_v1_id) via API.
-   **Terminology**: "Template" in database translates to "modifier" or "modifier group" in UI/code.
-   **Combo Modifier Hierarchy**: `combo_groups` → `combo_group_sections` → `combo_modifier_groups` → `combo_modifiers`.

## External Dependencies

### Backend Services
-   **Supabase**: PostgreSQL database, authentication, real-time subscriptions.

### UI Libraries
-   **Radix UI**: Headless component primitives.
-   **Lucide React**: Icon library.
-   **Recharts**: Charting library.

### Development Tools
-   **TypeScript**: Type safety.
-   **Tailwind CSS**: Utility-first styling.
-   **class-variance-authority**: Type-safe component variants.
-   **clsx** + **tailwind-merge**: Class name composition.

### Fonts
-   **Inter**: Primary sans-serif font.
-   **JetBrains Mono**: Monospace font.

### Integrations
-   **Mapbox GL JS**: Delivery area drawing.
-   **@hello-pangea/dnd**: Drag-and-drop reordering.
-   **Stripe**: Payment processing.
-   **Google Places API**: Address autocomplete and verification.

## Recent Changes

### Per-Restaurant Payment Mode Toggle (Jan 2026)
**Status:** IMPLEMENTED
**Purpose:** Enable gradual production rollout by allowing each restaurant to independently switch between test and live Stripe payments.
**Key Features:**
- Payment mode toggle in admin Payment Methods tab with clear test/live indicators
- Visual warnings when switching to live mode
- Fallback mechanism in orders API to try both test and live keys if needed
- Payment mode stored in `payment_mode` field of `delivery_and_pickup_configs` table
**How it works:**
1. Admin sets payment mode via toggle in restaurant settings
2. `create-payment-intent` API uses restaurant's configured mode
3. `orders` API retrieves payment intents using configured mode, with fallback to alternate mode
4. Payment mode is stored in payment intent metadata for reference
**Files:** `components/restaurant/tabs/payment-methods.tsx`, `app/api/customer/create-payment-intent/route.ts`, `app/api/customer/orders/route.ts`, `app/api/restaurants/[id]/service-config/route.ts`
**Database Migration:** `docs/payment-mode-migration.sql`
**Default:** All restaurants default to test mode for safety
**Security:** Stripe API keys stored only in Replit secrets, never in database

### Subdomain Routing for Branded URLs (Jan 2026)
**Status:** IMPLEMENTED
**Purpose:** Support branded subdomain URLs like `orchidsushiottawa.menu.ca` in addition to path-based `/r/orchid-sushi-245`.
**How it works:**
- Middleware extracts subdomain from Host header
- Looks up mapping in `lib/subdomain-mapping.ts` (database-backed with cache)
- Rewrites to `/r/[slug]` while preserving branded URL
**Files:** `middleware.ts`, `lib/subdomain-mapping.ts`
**Setup docs:** `docs/subdomain-setup.md`
**Database Migration:** `docs/subdomain-database-migration.sql`
**Adding New Subdomains (No Code Changes):**
```sql
INSERT INTO menuca_v3.restaurant_subdomains (restaurant_id, subdomain, slug, name)
VALUES (999, 'newrestaurant', 'new-restaurant-999', 'New Restaurant');
```
**DNS Flow:**
1. Add subdomain to database (or `STATIC_SUBDOMAIN_MAPPINGS` as fallback)
2. Add custom domain in Replit deployment settings
3. Update A record in 1984.is to point to Replit IP
4. SSL auto-provisions

### Dish Availability Feature (Jan 2026)
**Status:** IMPLEMENTED
**Purpose:** Some dishes only show on specific days (e.g., "Monday Special" only visible on Mondays).
**Customer-side:** Dishes with `hidden_days` array are filtered using `isDishVisible()` in `restaurant-menu-public.tsx`.
**Admin-side:** New `DishAvailabilityEditor` component in dish dialog (menu builder) with:
- Day checkboxes (Sun-Sat)
- Quick actions: "All Days", "Weekdays Only", "Weekends Only"
- Auto-save with error recovery
**Backend:** Uses Supabase RPC: `get_dish_availability`, `update_dish_availability`
**Reference:** `attached_assets/dish-availability_1767885527094.md`

### Modifier Size Pricing Fix (Jan 2026)
**Status:** FIXED
**Issue:** Frontend used string matching (`size_variant === "Medium"`) for modifier prices, while backend uses `modifier_size_variant_id` (integer). This caused potential price mismatches.
**Fix:** Updated `getModifierPrice()` and `getComboModifierPrice()` in `dish-modal.tsx` to match by `modifier_size_variant_id` with fallback order:
1. Exact match on `modifier_size_variant_id`
2. Fallback to Standard (id: 1)
3. Ultimate fallback: first price
**Location:** `components/customer/dish-modal.tsx` lines 225-272
**Reference:** `attached_assets/sizing-logic_1767880263087.md`

### Combo Section Ordering Fix (Jan 2026)
**Status:** FIXED
**Issue:** Combo group sections (crust type, toppings, dips) displayed in arbitrary order instead of following `display_order` from database.
**Fix:** 
- Combo groups sorted by minimum section `display_order` with stable fallbacks (group display_order, then ID)
- Sections within each combo group sorted by `display_order`
- Transformation preserves null values instead of defaulting to 0
**Location:** `components/customer/dish-modal.tsx` lines 999-1019 (group sort) and 1117 (section sort)
**Note:** The database RPC (`get_restaurant_menu`) returns correct `display_order` values - the frontend now properly uses them for ordering.

### Checkout Performance Optimization (Jan 2026)
**Status:** FIXED
**Issue:** Checkout page took 10+ seconds to load due to sequential API calls.
**Fix:** Changed to parallel data fetching using Promise.all in `app/(public)/checkout/page.tsx`, reducing load time to ~2-3 seconds.

### Cash Order Confirmation Fix (Jan 2026)
**Status:** FIXED
**Issue:** Guest cash orders showed "order not found" on confirmation page.
**Fix:** 
- API now returns security token in `app/api/customer/orders/cash/route.ts`
- Checkout redirects to confirmation page with token parameter

## Test Scripts
- `scripts/test-v3-modifier-order.ts` - Verify modifier ordering for any restaurant
- `scripts/check-v2-modifier-source.ts` - Check data source tables for V2 restaurants