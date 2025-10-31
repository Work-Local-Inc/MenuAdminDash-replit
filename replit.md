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
- **Customer-Facing Menu**: Public routes (`/r/[slug]`) using Server Components, Zustand for shopping cart with localStorage persistence.

### Backend & Data Layer
- **Database**: Supabase PostgreSQL (`menuca_v3` schema).
- **Database Connection**: Uses `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` for admin operations.
- **Direct PostgreSQL Queries**: Handled by `lib/db/postgres.ts` using `pg` Pool.
- **Schema Management**: Strict adherence to `menuca_v3` schema.
- **Data Operations**: Primarily uses SQL Functions (50+) for reads and Edge Functions (29) for writes.
- **Admin Users Management**: Custom tables (`admin_users`, `admin_roles`, `admin_user_restaurants`) within `menuca_v3` for granular control, with RLS bypass via service role client. **Enhanced password validation** (Oct 2025): Minimum 8 chars, requires uppercase/lowercase/number/special char, blocks 30+ common passwords, no sequential/repeated chars.

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