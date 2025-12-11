# Menu.ca Admin Dashboard

## Overview
The Menu.ca Admin Dashboard is a Next.js 14 application for managing a multi-tenant restaurant ordering platform. It integrates with an existing Supabase PostgreSQL database containing live production data. The primary goal is to streamline the administration of restaurants, orders, coupons, and user accounts, thereby enhancing the operational efficiency of a large-scale food ordering service.

## User Preferences
Preferred communication style: Simple, everyday language.

## Testing & Admin Access
- **Admin test credentials**: Stored as secrets `ADMIN_TEST_EMAIL` and `ADMIN_TEST_PASSWORD`
- **Admin login path**: `/admin` (redirects to login if not authenticated)
- **Test restaurants**:
  - Econo Pizza: restaurant_id=1009 (V3 ID matches dishes)
  - Centertown Donair & Pizza: restaurant_id=131 (legacy_v1_id=255 for dishes)

## System Architecture

### Frontend
-   **Framework**: Next.js 14 (App Router, TypeScript, Server & Client Components).
-   **UI/UX**: Tailwind CSS, shadcn/ui (Radix UI), `next-themes` for dark/light mode.
-   **Authentication**: Supabase Auth (email/password), middleware-based route protection, server-side session management.
-   **State Management**: React Query for server state, React Hook Form with Zod for form management, Zustand for customer-facing shopping cart.

### Backend & Data Layer
-   **Database**: Supabase PostgreSQL.
    -   **Schemas**: `public` (Admin tables) and `menuca_v3` (ALL restaurant platform data).
    -   **Access**: All Supabase clients for restaurant data **MUST** be configured with `db: { schema: 'menuca_v3' }`.
-   **Data Operations**: Primarily SQL Functions for reads and Edge Functions for writes.
-   **Admin Users**: Custom tables for granular control with RLS bypass via service role client.

### Core Features
-   **Restaurant Management**: Status, online ordering toggle, contact, delivery area configuration.
-   **Menu Management**:
    -   **Unified Menu Builder**: Single interface for menu editing, mirroring customer-facing design.
    -   **Grid Layout**: Responsive dish cards with hover controls and image upload.
    -   **Modifier Groups Architecture**: True linking system for modifier groups, allowing global updates to propagate automatically. Global modifier groups are managed in a library and associated with categories without cloning. Dishes inherit modifiers from their category, with options to break inheritance for custom dish-specific modifiers.
    -   **Unified Modifier Manager** (`/admin/menu/modifiers/r/[restaurantId]`): Modifier-first workflow for efficient bulk management of 120+ dish catalogs. Unifies simple modifiers (`modifier_groups`) and combo modifiers (`combo_groups` hierarchy for pizzas with size-based pricing/placements) into a single catalog grid.
        -   **View Modes**: Toggle between Grid (cards) and List (compact rows) via `data-testid="button-view-grid"` and `data-testid="button-view-list"`.
        -   **Status Filtering**: Filter by All/Active/Inactive. Inactive modifiers (0 dishes linked) display in separate section with reduced opacity when viewing "All".
        -   **Options Tab**: Click a modifier group to open sheet with Overview/Options/Dishes tabs. Options tab fetches real modifier items from the database hierarchy with edit/delete controls and price badges.
    -   **ID Mapping (CRITICAL)**: `combo_groups.restaurant_id` uses V3 IDs directly, but simple modifiers link through `dishes.restaurant_id` which uses `legacy_v1_id`. API handles this automatically.
    -   **Terminology Rule**: Database tables use "template" but UI/code ALWAYS uses "modifier" or "modifier group".
    -   **Combo Modifier Hierarchy**: `combo_groups` → `combo_group_sections` → `combo_modifier_groups` → `combo_modifiers`. Note: `display_order` lives on `combo_group_sections`, NOT on `combo_groups`.
    -   **Size & Price Variants Management**: Integrated into the Edit Dish dialog for flexible pricing with size variants (e.g., Small/Medium/Large). Supports unlimited variants per dish, inline editing, drag-and-drop reordering, and multi-tenant validation.
    -   **Drag-and-Drop**: For reordering categories and dishes.
    -   **Bulk Operations**: Multi-select dishes for batch actions.
    -   **Inline Editing**: Click-to-edit prices and dish modifiers.
-   **Franchise Management**: Hierarchical system for linking restaurants, bulk updates, and analytics.
-   **Categorization System**: Cuisine and tag-based discovery.
-   **Onboarding Tracking**: 8-step process with progress tracking.
-   **Domain Verification & SSL Monitoring**: Automated health checks.

### Customer Ordering System
-   **Authentication**: Separate Supabase Auth for customers (`menuca_v3.users`), including Google OAuth for secure profile creation during checkout.
-   **Order Type Selection**: Industry-standard Delivery vs. Pickup toggle with contextual fees and pickup time scheduling (ASAP vs. Scheduled from restaurant operating hours). Integrates with `restaurant_schedules` for dynamic availability.
-   **Delivery Area Fee Calculation**: Uses `restaurant_delivery_areas` table for calculating fees in dollars based on delivery zones.
-   **Checkout Flow**: Multi-step process with Zustand-based cart, address confirmation (Google Places Autocomplete), and Stripe payment.
-   **Address Management**: CRUD for `user_delivery_addresses`.
-   **Payment Processing**: Stripe integration for secure payments, server-side payment intent creation, `stripe_customer_id` linkage, and `payment_transactions` tracking.
-   **Order Management**: Order creation post-payment, order history, status tracking.
-   **Account Pages** (`/customer/account`): Customer dashboard with tabbed interface:
    -   **Orders Tab**: View past order history with status tracking.
    -   **Addresses Tab**: Full CRUD for saved delivery addresses (add, edit, delete, set default).
    -   **Profile Tab**: Editable profile with first name, last name, phone (email read-only for security).
    -   **Navigation**: Checkout header email is clickable link to account page when logged in.
-   **Security**: Server-side price, amount, and quantity validation; payment replay protection; restaurant ownership validation; user authentication; webhook signature verification; OAuth email verification.
-   **Default Branding System**: Restaurants without custom configuration get polished defaults:
    -   Default primary color: `#DC2626` (Menu.ca red) applied to banners, buttons, icons, and navigation throughout the entire ordering experience.
    -   Default banner: Red gradient header with decorative circular elements when no custom banner image is set.
    -   Default icon: Styled rounded square container with UtensilsCrossed icon when no custom logo is set.
    -   Order Online badge: Always displayed on all restaurant pages (both custom and default banners).
    -   Cart/basket button: Uses plain HTML button with inline styles to ensure brand color takes precedence over CSS framework defaults.
    -   Consistent application: Default color flows through to cart button, checkout buttons, confirmation page, and all interactive elements.

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

## Troubleshooting & Debugging Notes

### Stripe Key Mismatch (CRITICAL - Nov 2025)
**Problem:** Payment intents created with TEST key but retrieved with LIVE key = "No such payment_intent" error.

**Lesson Learned:** When debugging Stripe issues, ALWAYS do a full codebase audit FIRST:
```bash
grep -r "new Stripe\|STRIPE_SECRET_KEY" app/api --include="*.ts"
```

**All Stripe endpoints must use the same key priority:**
- `app/api/customer/create-payment-intent/route.ts`
- `app/api/customer/orders/route.ts`
- `app/api/customer/signup/route.ts`
- `app/api/customer/stripe-webhook/route.ts`

**Current configuration (TEST mode):**
```typescript
const stripeSecretKey = process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY
```

**Frontend key (next.config.mjs):**
```javascript
NEXT_PUBLIC_STRIPE_PUBLIC_KEY: process.env.TESTING_VITE_STRIPE_PUBLIC_KEY || process.env.VITE_STRIPE_PUBLIC_KEY
```

**Never fix one endpoint at a time - audit ALL Stripe files before deploying.**

### Table & Column Renames (Dec 2025)

**Tables Renamed:**
- `restaurant_service_configs` → `delivery_and_pickup_configs`
- `restaurant_delivery_fees` → `restaurant_distance_based_delivery_fees`

**Columns Renamed:**
- `min_order_value` → `delivery_min_order` (in `restaurant_delivery_areas`)
- `tier_value` → `distance_in_km` (in `restaurant_distance_based_delivery_fees`)

**Files Updated:**
- `types/supabase-database.ts` - Type definitions
- `app/api/restaurants/[id]/service-config/route.ts` - API routes
- `app/api/restaurants/[id]/delivery-areas/route.ts` - Delivery areas API
- `app/api/customer/restaurants/[slug]/route.ts` - Customer API
- `app/api/customer/validate-delivery/route.ts` - Delivery validation
- `components/customer/restaurant-menu.tsx` - Menu component
- `components/customer/restaurant-menu-public.tsx` - Public menu component

Reference: `AI-AGENTS-START-HERE/DELIVERY_ZONES_HANDOFF.md` for complete delivery zones documentation.

### Dual Modifier Validation (Dec 2025)

**Problem:** Order APIs were rejecting combo modifiers (pizza toppings) because they only validated against the `dish_modifiers` table (simple modifiers).

**Solution:** Order validation now supports BOTH modifier types:

1. **Simple Modifiers** (`dish_modifiers` table)
   - Validated via: `modifier_group.dish_id === item.dishId`
   - Price lookup: `dish_modifiers.price` (size-specific prices from `modifier_prices` table)

2. **Combo Modifiers** (`combo_modifiers` table)
   - Validated via: `dish_combo_groups` junction table
   - Hierarchy: `combo_modifiers` → `combo_modifier_groups` → `combo_group_sections` → `combo_groups` → `dish_combo_groups`
   - Price lookup: `combo_modifiers.price` field

**Files Updated:**
- `app/api/customer/orders/route.ts` - Stripe payment order creation
- `app/api/customer/orders/cash/route.ts` - Cash payment order creation

**Validation Flow:**
```typescript
// 1. Try simple modifier first
const simpleModifier = simpleModifierMap.get(mod.id)
if (simpleModifier) {
  // Validate: simpleModifier.modifier_group.dish_id === item.dishId
}

// 2. If not found, check combo modifiers
const comboModifier = comboModifierMap.get(mod.id)
if (comboModifier) {
  // Validate: comboGroupId is in dishComboGroupLinks.get(item.dishId)
}
```

**Key Tables:**
- `dish_modifiers` - Simple modifiers (sauces, add-ons)
- `combo_modifiers` - Combo modifiers (pizza toppings with placements)
- `dish_combo_groups` - Links dishes to combo groups