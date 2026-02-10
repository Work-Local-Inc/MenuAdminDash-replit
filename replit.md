# Menu.ca Admin Dashboard

## Overview
The Menu.ca Admin Dashboard is a Next.js 14 application for managing a multi-tenant restaurant ordering platform, integrated with a Supabase PostgreSQL database. Its primary purpose is to streamline the administration of restaurants, orders, coupons, and user accounts, thereby enhancing operational efficiency. The business vision is to provide a robust, scalable, and intuitive platform, positioning Menu.ca as a leading solution in the online food ordering market.

## User Preferences
Preferred communication style: Simple, everyday language.
CRITICAL: NEVER add postgresql-16 to .replit modules. This project uses external Supabase PostgreSQL, NOT the Replit built-in database. Adding postgresql-16 causes a database migration step during publishing that blocks deployment.

## System Architecture

### Frontend
-   **Framework**: Next.js 14 (App Router, TypeScript, Server & Client Components).
-   **UI/UX**: Tailwind CSS, shadcn/ui (Radix UI), `next-themes` for dark/light mode, responsive design.
-   **Authentication**: Supabase Auth (email/password) with middleware-based route protection.
-   **State Management**: React Query for server state, React Hook Form with Zod for forms, Zustand for customer-facing shopping cart.

### Backend & Data Layer
-   **Database**: Supabase PostgreSQL (`public` and `menuca_v3` schemas), with specific Supabase client configuration for `menuca_v3`.
-   **Data Operations**: Primarily SQL Functions for reads and Edge Functions for writes.
-   **Admin Users**: Custom tables with RLS bypass and a 2-role schema (Super Admin, Restaurant Admin).

### Core Features
-   **Restaurant Management**: Tools for status, online ordering toggle, contact, and delivery area configuration.
-   **Menu Management**: Unified Menu Builder, Advanced Modifier System, Size & Price Variants, Dish Availability, Combo Group Dish Selections, item targeting for deals and coupons.
-   **Franchise Management**: Hierarchical system for linking restaurants and performing bulk updates.
-   **Categorization System**: Cuisine and tag-based discovery for restaurants.
-   **Customer Ordering System**: Separate Supabase Auth (including Google OAuth), Delivery vs. Pickup order types with contextual fees and scheduling, Multi-step Checkout Flow, Account Pages for order history and addresses, Server-side validation, Default branding, Enhanced order customization, dynamic prep times.
-   **Promotions**: Comprehensive coupon and deal management including item targeting, tiered discounts, and usage limits.
-   **Subdomain Routing**: Supports branded subdomain URLs (e.g., `restaurant.menu.ca`) with dynamic mapping and caching.
-   **Payment Mode Toggle**: Allows per-restaurant switching between test and live Stripe payments.
-   **Provincial Tax System**: Dynamic provincial tax calculation with per-restaurant rates and itemized tax lines.
-   **Delivery Providers System**: Extensible third-party integration system for delivery providers (e.g., RestoZone) for fee calculation and driver dispatch.
-   **Bilingual Translations**: Support for French translations for promotional deals and coupons with English fallback, and bilingual dish names.
-   **Twilio Order Fallback System**: Automated phone call notifications to restaurants when tablet orders aren't acknowledged within 3 minutes, using Polly.Joanna voice and DTMF input.
-   **Accounting & Reporting**: Full accounting system for restaurant statements, commission reports with carry-over balances, vendor commission tracking, batch processing, and automated invoicing. This system uses custom database tables and specific HST calculation rules.
-   **Performance Optimization**: Parallel data fetching, menu caching with auto-invalidation.
-   **RBAC Security Hardening**: Comprehensive role-based access control with `verifyAdminAuth` and `verifyRestaurantAccess()` functions.

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
-   **Twilio**: Voice calls for order fallback notifications.