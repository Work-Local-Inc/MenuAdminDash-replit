# Menu.ca Admin Dashboard

## Overview
The Menu.ca Admin Dashboard is a Next.js 14 application designed to provide comprehensive management for a multi-tenant restaurant ordering platform. It serves 961 restaurants and over 32,330 users, enabling streamlined administration of restaurants, orders, coupons, and user accounts. The project's core purpose is to enhance operational efficiency and administrative capabilities for a large-scale food ordering service by extending an existing Supabase PostgreSQL database.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: Next.js 14 (App Router, TypeScript, Server & Client Components).
- **UI/UX**: Tailwind CSS with a custom design system, shadcn/ui (Radix UI primitives), `next-themes` for dark/light mode.
- **Authentication**: Supabase Auth (email/password, "Remember Me"), middleware-based route protection, server-side session management (`@supabase/ssr`), custom `useAuth` hook.
- **State Management**: React Query for server state, React Hook Form with Zod for form management and validation, local component state.
- **API Routes**: Thin wrappers around Supabase Edge Functions for writes, direct Supabase queries for reads, Zod validation.
- **Form Handling**: React Hook Form with Zod schemas and shadcn/ui components.
- **Utility Functions**: `lib/utils.ts` for helpers, Canadian locale formatting.
- **Customer-Facing Menu**: Public routes (`/r/[slug]`) using Server Components, Zustand for shopping cart with localStorage persistence. **Menu Display Fix (Nov 2025)**: Fixed critical blocking issue where menus showed "Menu Coming Soon" despite having active dishes. Created optimized `get_restaurant_menu()` SQL function aligned with actual menuca_v3 schema structure (verified dishes, dish_prices, modifier_groups tables). Performance: <500ms for 28-dish restaurants. See `lib/Documentation/MENU_DISPLAY_FIX.md` for details.

### Backend & Data Layer
- **Database**: Supabase PostgreSQL (ONLY database - no Neon).
- **⚠️ CRITICAL SCHEMA INFO**: 
  - **TWO SCHEMAS**:
    - **`public` schema**: Admin tables ONLY (`admin_users`, `admin_roles`, `admin_user_restaurants`)
    - **`menuca_v3` schema**: ALL restaurant platform data (961 restaurants, 32,330+ users, dishes, orders, etc.)
  - **ALL Supabase clients MUST be configured with `db: { schema: 'menuca_v3' }`** to access restaurant data
  - **Restaurant IDs are INTEGERS, not UUIDs**
  - **Santiago spent 4 weeks migrating ALL data to Supabase's menuca_v3 schema**
  - **See `SUPABASE_CONFIG.md` for complete reference - CHECK THIS FILE BEFORE ANY SUPABASE WORK**
- **Database Connection**: Uses `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` for admin operations.
- **Direct PostgreSQL Queries**: Use `SUPABASE_BRANCH_DB_URL` for direct connections (not DATABASE_URL).
- **Data Operations**: Primarily uses SQL Functions (50+) for reads and Edge Functions (29) for writes.
- **Admin Users Management**: Custom tables (`admin_users`, `admin_roles`, `admin_user_restaurants`) for granular control, with RLS bypass via service role client. **Enhanced password validation** (Oct 2025): Minimum 8 chars, requires uppercase/lowercase/number/special char, blocks 30+ common passwords, no sequential/repeated chars.

### Core Features & Implementations
- **Restaurant Management**: Status, online ordering toggle, contact, delivery area configuration (Mapbox).
- **Menu Management** (✅ Fully Refactored - Enterprise Schema):
    - **Categories & Dishes**: Full CRUD, restaurant-scoped, drag-drop reordering, search/filtering, active/featured toggles.
    - **Advanced Features**: Modifier groups & modifiers (drag-drop, validation), "Quick Create Size," inventory tracking ("Sold Out" badges, availability toggles), bulk operations (multi-select, activate/deactivate, feature, mark in/out of stock, delete).
    - **Navigation**: `/admin/menu/categories`, `/admin/menu/dishes`, `/admin/menu/dishes/[id]/modifiers`.
    - **Refactored Database Schema** (Oct 2025):
        - **Pricing**: `dish_prices` relational table (replaced JSONB)
        - **Modifiers**: `modifier_groups` → `dish_modifiers` (direct name+price, no ingredient FK)
        - **Combos**: `combo_steps` + `combo_items` hierarchical system
        - **Inventory**: `dish_inventory` table for stock tracking
        - **Enterprise Tables**: `dish_size_options`, `dish_allergens`, `dish_dietary_tags`, `dish_ingredients`
        - **SQL Functions**: 50+ optimized functions (`get_restaurant_menu`, `validate_dish_customization`, `calculate_dish_price`)
        - **API Integration**: All routes updated to use refactored schema with full backwards compatibility
    - **Documentation**: Complete refactoring guide in `lib/Documentation/Frontend-Guides/Menu-refatoring/`
- **Franchise Management**: Hierarchical system for parent/child linking and bulk updates, analytics.
- **Categorization System**: Cuisine and tag-based discovery (36 cuisines, 12 tags).
- **Onboarding Tracking**: 8-step process with progress, analytics, and interactive checklists.
- **Domain Verification & SSL Monitoring**: Automated health checks, SSL verification, DNS health, on-demand verification, cron jobs.

## External Dependencies

### Backend Services
- **Supabase**: PostgreSQL database, authentication, real-time subscriptions.

### UI Libraries
- **Radix UI**: Headless component primitives.
- **Lucide React**: Icon library.
- **Recharts**: Charting library.

### Development Tools
- **TypeScript**: Type safety.
- **Tailwind CSS**: Utility-first styling.
- **class-variance-authority**: Type-safe component variants.
- **clsx** + **tailwind-merge**: Class name composition.

### Fonts
- **Inter**: Primary sans-serif font.
- **JetBrains Mono**: Monospace font.

### Integrations
- **Mapbox GL JS**: For delivery area polygon drawing.
- **@hello-pangea/dnd**: For drag-and-drop reordering.
- **Stripe**: Payment processing for customer orders (Nov 2025).

## Customer Ordering System (Nov 2025)

### Customer Authentication
- Separate authentication system from admin using Supabase Auth
- Sign up/login pages at `/customer/login`
- Customer user records stored in `menuca_v3.users` table
- Supports email/password authentication with automatic user profile creation

### Checkout Flow
- **Cart**: Zustand-based shopping cart with localStorage persistence
- **Checkout**: Multi-step checkout process at `/checkout`
  - Step 1: Address confirmation (select saved address or add new)
  - Step 2: Payment (Stripe Elements integration)
- **Address Management**: CRUD operations for delivery addresses (`user_delivery_addresses` table)
  - Saved addresses with labels (Home, Work, etc.)
  - Default address selection
  - Delivery instructions support
  - Toronto (city_id: 1) as default city

### Payment Processing
- **Stripe Integration**: Secure payment processing with Stripe Elements
- **Payment Intent**: Created server-side with amount and metadata
- **Stripe Customer**: Automatically created and linked to user record (`stripe_customer_id`)
- **Payment Transactions**: Tracked in `payment_transactions` table
- **Currency**: CAD (Canadian Dollar)

### Order Management
- **Order Creation**: Orders created after successful payment
- **Order History**: Accessible at `/customer/account` (Orders tab)
- **Order Status**: Tracked in `order_status_history` table
- **Order Details**: Include restaurant info, delivery address, payment status

### Customer Account Pages
- **Account Dashboard**: `/customer/account` with three tabs:
  - **Orders**: View order history, track status, view details
  - **Addresses**: Manage saved delivery addresses
  - **Profile**: View account information (email, name, phone)
- **Protected Routes**: Redirects to login if not authenticated

### Database Tables Used
- `users`: Customer profiles with Stripe customer ID
- `user_delivery_addresses`: Saved delivery addresses
- `user_payment_methods`: Saved payment methods (Stripe)
- `payment_transactions`: Payment history and tracking
- `orders`: Order records with delivery info and payment status
- `order_status_history`: Order status changes over time
- `stripe_webhook_events`: Webhook event tracking for idempotency

### API Endpoints
- `POST /api/customer/create-payment-intent`: Create Stripe payment intent
- `POST /api/customer/orders`: Create order after payment (with server-side validation)
- `GET /api/customer/orders`: Fetch user's order history
- `POST /api/customer/stripe-webhook`: Handle Stripe webhook events

### Security Features
- **Server-side price validation**: All dish and modifier prices fetched from database
- **Payment amount verification**: Server recalculates and verifies totals match payment amount
- **Payment replay protection**: UNIQUE constraints on stripe_payment_intent_id (see migrations/004_add_payment_intent_uniqueness.sql)
- **Restaurant ownership validation**: Verifies dishes and modifiers belong to correct restaurant
- **Quantity validation**: Enforces positive integer quantities only
- **User authentication**: All endpoints verify user authentication
- **Webhook signature verification**: Stripe webhook events verified with signature

### Database Migration Required
**IMPORTANT**: Before using the checkout system in production, run the migration:
- `migrations/004_add_payment_intent_uniqueness.sql` in Supabase SQL Editor
- This adds UNIQUE constraints to prevent duplicate orders from the same payment intent