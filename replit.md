# Menu.ca Admin Dashboard

## ⚠️ CRITICAL: DATABASE = SUPABASE (NOT REPLIT) ⚠️
**This project uses SUPABASE PostgreSQL** - Schema: `menuca_v3`  
**DO NOT use Replit database tools** - Use Supabase clients only  
**Read AI-AGENTS-START-HERE/AGENT_MEMORY_BANK.md FIRST**

## Overview
The Menu.ca Admin Dashboard is a Next.js 14 application designed for comprehensive management of a multi-tenant restaurant ordering platform. The project extends an existing Supabase PostgreSQL database with live production data. The project's core purpose is to streamline administration of restaurants, orders, coupons, and user accounts, enhancing operational efficiency for a large-scale food ordering service.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: Next.js 14 (App Router, TypeScript, Server & Client Components).
- **UI/UX**: Tailwind CSS, shadcn/ui (Radix UI), `next-themes` for dark/light mode.
- **Authentication**: Supabase Auth (email/password), middleware-based route protection, server-side session management.
- **State Management**: React Query for server state, React Hook Form with Zod for form management, Zustand for customer-facing shopping cart.

### Backend & Data Layer
- **Database**: Supabase PostgreSQL.
- **Schemas**:
    - `public`: Admin tables (`admin_users`, `admin_roles`, `admin_user_restaurants`).
    - `menuca_v3`: ALL restaurant platform data (restaurants, dishes, orders, etc.).
- **Database Access**: All Supabase clients for restaurant data **MUST** be configured with `db: { schema: 'menuca_v3' }`. Restaurant IDs are integers.
- **Data Operations**: Primarily SQL Functions (50+) for reads and Edge Functions (29) for writes.
- **Admin Users**: Custom tables for granular control with RLS bypass via service role client. Enhanced password validation.

### Core Features
- **Restaurant Management**: Status, online ordering toggle, contact, delivery area configuration (Mapbox).
- **Menu Management**:
    - **Unified Menu Builder (`/admin/menu/builder`)**: Single-page interface with split-screen editor and live customer preview.
    - **Category-Level Modifier Templates**: Create reusable modifier groups at the category level.
    - **Automatic Inheritance & Dish-Level Overrides**: Dishes inherit category templates with options to break inheritance for custom modifiers.
    - **Drag-and-Drop**: Reordering of categories, dishes, modifier groups, and individual modifiers.
    - **Bulk Operations**: Multi-select and apply actions to dishes.
    - **Real-Time Preview**: Instant visualization of menu changes.
    - **Legacy Support**: Pricing (`dish_prices`), modifiers (`modifier_groups` → `dish_modifiers`), combos, inventory management.
- **Franchise Management**: Hierarchical system for parent/child linking, bulk updates, and analytics.
- **Categorization System**: Cuisine and tag-based discovery.
- **Onboarding Tracking**: 8-step process with progress tracking.
- **Domain Verification & SSL Monitoring**: Automated health checks and on-demand verification.

### Customer Ordering System
- **Authentication**: 
  - Separate Supabase Auth for customers (`/customer/login`), linking to `menuca_v3.users`
  - **Google OAuth**: Enabled during checkout with secure profile creation via `ensureOAuthProfileForSession` helper
  - **Security Model**: Verified email requirement, conflict detection, guest account linking
  - **OAuth Flow**: Google → Supabase → `/auth/callback` → Profile creation → Checkout redirect
- **Checkout Flow**: Multi-step process with Zustand-based cart, address confirmation (Google Places Autocomplete), and Stripe payment.
- **Address Management**: CRUD for delivery addresses (`user_delivery_addresses`), fraud prevention with verified addresses.
- **Payment Processing**: Stripe integration for secure payments, server-side payment intent creation, `stripe_customer_id` linkage, and `payment_transactions` tracking (CAD).
- **Order Management**: Order creation post-payment, order history, status tracking (`order_status_history`).
- **Account Pages**: Dashboard (`/customer/account`) for orders, addresses, and profile management.
- **Security**: Server-side price and amount validation, payment replay protection, restaurant ownership validation, quantity validation, user authentication, webhook signature verification, OAuth email verification.

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
- **Mapbox GL JS**: Delivery area drawing.
- **@hello-pangea/dnd**: Drag-and-drop reordering.
- **Stripe**: Payment processing.
- **Google Places API**: Address autocomplete and verification.