# Menu.ca Admin Dashboard

## Overview
The Menu.ca Admin Dashboard is a Next.js 14 application for managing a multi-tenant restaurant ordering platform. It integrates with an existing Supabase PostgreSQL database containing live production data. The primary goal is to streamline the administration of restaurants, orders, coupons, and user accounts, thereby enhancing the operational efficiency of a large-scale food ordering service.

## User Preferences
Preferred communication style: Simple, everyday language.

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
-   **Account Pages**: Dashboard for orders, addresses, and profile management.
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