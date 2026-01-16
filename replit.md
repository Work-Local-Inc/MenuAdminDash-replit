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
-   **Per-Restaurant Commission System**: Configurable commission fee per restaurant (percentage-based, gross or net), calculated server-side and added to order total for internal reporting, hidden from customers.

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

### Per-Restaurant Commission System (Jan 2026)
**Status:** COMPLETE
**Feature:** Configurable commission fee per restaurant, calculated server-side and added to order total.

**Database Schema (menuca_v3):**
- `delivery_and_pickup_configs.commission_enabled` (boolean) - Toggle to enable/disable commission
- `delivery_and_pickup_configs.commission_rate` (numeric) - Percentage rate (e.g., 8 for 8%)
- `delivery_and_pickup_configs.commission_base` (text) - 'gross' or 'net' calculation base
- `orders.commission_amount` (numeric) - Commission charged on each order (for reporting)

**Commission Calculation:**
- **Gross**: Commission on total (subtotal + delivery fee + tax)
- **Net**: Commission on subtotal only (excludes delivery fee and tax)
- Commission is calculated server-side to prevent client manipulation
- Commission is hidden from customers (not displayed in cart, checkout, receipts, or emails)
- Commission is stored on each order for internal reporting

**Key Files:**
- `components/restaurant/tabs/service-config.tsx` - Admin UI (toggle, percentage input, gross/net radio)
- `app/api/restaurants/[id]/service-config/route.ts` - Admin GET API
- `app/api/restaurants/[id]/service-config/[configId]/route.ts` - Admin PATCH API (requires admin auth)
- `app/api/customer/create-payment-intent/route.ts` - Card payments: adds commission to Stripe charge
- `app/api/customer/orders/route.ts` - Card orders: extracts commission from payment intent metadata
- `app/api/customer/orders/cash/route.ts` - Cash orders: calculates commission server-side

**Security:**
- Commission calculated server-side (percentage of validated totals)
- Admin auth required to modify commission settings
- Commission amount stored in Stripe payment intent metadata for audit trail
- Card payments: Subtotal is validated (must be positive, not exceed total) before use in 'net' calculation
- If invalid subtotal detected, falls back to 'gross' calculation (charges on total amount)

**Display Integration:**
- Checkout page fetches commission config from restaurant API
- Commission is calculated client-side using same formula as server
- Commission is included in displayed Total (no separate line item)
- Payment intent sends baseTotal; server adds commission to prevent double-counting

**Known Limitations:**
- Card payment 'net' commission relies on client-supplied subtotal (validated but not server-recomputed)
- Recommendation: Use 'gross' mode for most accurate commission until full server-side cart validation is added to payment intent API
- Cash orders have fully server-side commission calculation with no client trust

**Future Enhancement:** Add server-side cart validation in create-payment-intent API to eliminate client subtotal reliance