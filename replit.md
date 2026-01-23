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
-   **Restaurant Management**: Tools for status, online ordering toggle, contact, and delivery area configuration.
-   **Menu Management**: Unified Menu Builder, Advanced Modifier System, Size & Price Variants, Dish Availability, Combo Group Dish Selections.
-   **Franchise Management**: Hierarchical system for linking restaurants and performing bulk updates.
-   **Categorization System**: Cuisine and tag-based discovery for restaurants.
-   **Customer Ordering System**: Separate Supabase Auth (including Google OAuth), Delivery vs. Pickup order types with contextual fees and scheduling, Multi-step Checkout Flow, Account Pages for order history and addresses, Server-side validation for security, Default branding system, Enhanced order customization (special instructions, modifier quantity steppers, combo modifier free items).
-   **Subdomain Routing**: Supports branded subdomain URLs (e.g., `restaurant.menu.ca`) with dynamic mapping and caching.
-   **Payment Mode Toggle**: Allows per-restaurant switching between test and live Stripe payments.
-   **Provincial Tax System**: Dynamic provincial tax calculation with per-restaurant rates and itemized tax lines.
-   **Delivery Providers System**: Extensible third-party integration system for delivery providers (e.g., RestoZone) for fee calculation and driver dispatch.
-   **Bilingual Translations**: Support for French translations for promotional deals and coupons with English fallback.

### Technical Implementations
-   **ID Mapping**: Handles `combo_groups.restaurant_id` (V3 IDs) vs. `dishes.restaurant_id` (legacy_v1_id) via API.
-   **Terminology**: "Template" in DB translates to "modifier" or "modifier group" in UI/code.
-   **Contact Information Storage**: Split across `admin_users`, `admin_user_restaurants` (private), and `restaurant_locations` (public).
-   **Multilingual Database Architecture**: Dish names stored in bilingual columns (`name_en`, `name_fr`), localized via RPC.
-   **Performance Optimization**: Parallel data fetching, menu caching with auto-invalidation.
-   **Modifier Table Schema**: Distinction between legacy and active modifier tables (`modifiers`, `modifier_prices`, `modifier_groups`), with `modifier_groups` relationship managed by RPC.
-   **API Routing for Subdomains**: `getApiBaseUrl()` helper ensures API calls from branded subdomains route correctly to the main domain.
-   **Stripe Key Management**: Critical handling to ensure Stripe publishable and secret keys match the active payment mode (test/live) to prevent errors.
-   **Coupon Validation**: Server-side validation of coupon codes at payment intent creation. Coupon codes are re-validated and discounts recalculated server-side (using `promotional_coupons` and `promotional_deals` tables). Note: Cart subtotals are client-computed; full server-side cart validation would require architectural changes.

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
-   **RestoZone**: Third-party delivery provider.

## Recent Changes

### January 2026
-   **Coupon Validation at Checkout (Completed)**: Added CouponInput component to cart drawer with full validation flow. Server-side validation in create-payment-intent endpoint. Orders API stores coupon data (promo_id, discount_amount, promo_code) with automatic usage logging to coupon_usage_log table (for promo_type === 'coupon' only). Includes NaN guarding for discount parsing.
-   **CartDrawer Component Update**: Now requires `restaurantSlug` prop for coupon validation API calls. The slug is computed via useMemo in RestaurantMenu and RestaurantMenuPublic components.
-   **Bilingual Translations for Marketing Hub (Completed)**: Added French translation support for promotional deals and coupons with English fallback.