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