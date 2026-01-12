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