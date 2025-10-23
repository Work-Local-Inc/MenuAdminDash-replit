# Menu.ca Admin Dashboard

## Overview
A Next.js 14 admin dashboard for managing the Menu.ca restaurant ordering platform. This multi-tenant system supports 74+ restaurants, 32,000+ users, and handles restaurant management, orders, coupons, and user administration. The application connects to an existing Supabase PostgreSQL database (`menuca_v3` schema) and adds new tables for enhanced admin functionality.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Next.js 14** with App Router, TypeScript, Server Components for data fetching, and client components for interactivity.
- Route-based organization with grouped routes for authentication and protected admin pages.

### UI & Styling
- **Tailwind CSS** with a custom design system.
- **shadcn/ui** component library (Radix UI primitives).
- Custom theme system supporting light/dark modes via `next-themes`.
- Design tokens defined in CSS variables for consistent styling.

### Authentication & Authorization
- **Supabase Auth** with email/password authentication.
- "Remember Me" feature for 7-day persistent sessions.
- Session persistence and synchronization between client/server using Supabase SSR cookie handlers.
- Middleware-based route protection and automatic session refresh.
- Server-side session management using `@supabase/ssr`.
- Automatic token refresh and a custom `useAuth` hook for client-side auth state.

### Data Layer
- **Supabase PostgreSQL** production database connected via session pooler (`SUPABASE_BRANCH_DB_URL`)
- Database connection in `lib/db/postgres.ts` using `pg` Pool for direct PostgreSQL queries
- Schema: `menuca_v3` with 961 restaurants, 32,330+ users (production data)
- All queries use schema-prefixed table names (e.g., `menuca_v3.restaurants`)
- Production schema uses: `total_amount` (not `total`), `order_status` (not `status`), `tax_amount` (not `tax`)
- Utilizes over 50 SQL Functions and 29 Edge Functions for restaurant management, with documentation in `lib/Documentation/Frontend-Guides/BRIAN_MASTER_INDEX.md`.
- React Query (`@tanstack/react-query`) for client-side caching and state synchronization.

### State Management
- **React Query** for server state, caching, and mutations.
- React Hook Form with Zod validation for form state.
- Local component state via `useState`.
- Custom hooks in `lib/hooks/` for reusable data fetching patterns.

### API Routes
- API routes are designed as thin wrappers around Santiago's Edge Functions for writes (handling audit logging, business logic, soft deletes) and direct Supabase queries for reads where appropriate.
- Zod schemas (`lib/validations/`) for request/response validation.

### Form Handling
- **React Hook Form** for form state management.
- **Zod** schemas for validation, integrated via `@hookform/resolvers/zod`.
- Reusable form components from shadcn/ui.

### Utility Functions
- `lib/utils.ts`: Core helpers for class names, currency formatting, date/time formatting, and status color mapping.
- Consistent Canadian locale formatting (CAD currency, en-CA dates).

### Restaurant Menu Page (Customer-Facing)
- Public customer-facing routes (`/r/[slug]`) for restaurant menus.
- Server components with loading and error boundaries.
- Shopping cart system using Zustand with localStorage persistence, handling item customization, quantity, and tax calculation.
- UI components include RestaurantMenu, DishCard, DishModal, and CartDrawer.
- UX features like empty menu fallback, loading skeletons, error handling, and responsive design.

### Admin Users Management
- Admin authentication/authorization middleware (`lib/auth/admin-check.ts`) verifying Supabase Auth sessions and `admin_users` table status.
- All API routes are protected with `verifyAdminAuth()`.
- RLS bypass solution implemented via API routes using a service role for `admin_users` table access.
- Security model ensures only admin users have Supabase Auth accounts and verifies against the `admin_users` table.

### Restaurant Management Integration with Santiago's Backend
- **Status Management**: Uses Santiago's `update-restaurant-status` Edge Function for proper soft deletes/status changes
- **Online Ordering**: Uses Santiago's `toggle-online-ordering` Edge Function with audit logging
- **Contacts Management**: Uses Santiago's 3 Edge Functions (`add-restaurant-contact`, `update-restaurant-contact`, `delete-restaurant-contact`) for hierarchy-aware contact management
- **Delivery Areas**: Uses `menuca_v3.restaurant_delivery_zones` table with custom polygon support (extension to Santiago's circular zones)
  - API routes handle dollar/cents conversion for fees and minimum orders
  - Soft delete pattern with 30-day recovery window
  - Correctly handles $0 minimum order zones (explicit null checks, not truthiness)
  - Custom polygon drawing via Mapbox (more flexible than Santiago's center+radius approach)
- **Franchise Management**: Complete franchise chain hierarchy system using Santiago's 13 SQL functions + 3 Edge Functions
  - Create franchise parents using `create-franchise-parent` Edge Function
  - Link children using `convert-restaurant-to-franchise` Edge Function (supports single/batch)
  - Bulk feature updates using `bulk-update-franchise-feature` Edge Function
  - Franchise analytics dashboard with performance metrics, location rankings, and menu standardization
  - Proper React Query cache invalidation for chains/details/analytics after mutations
  - UI components: grid view of chains, create parent dialog, franchise details modal with Overview/Analytics tabs
- **Categorization System**: Cuisine and tag-based restaurant discovery using Santiago's 2 SQL functions + 2 Edge Functions
  - Add/remove cuisines with automatic primary/secondary logic using `add-restaurant-cuisine` Edge Function
  - Add/remove tags for feature-based discovery using `add-restaurant-tag` Edge Function
  - Support for 36 cuisine types (Pizza, Italian, Chinese, Lebanese, etc.)
  - Support for 12 restaurant tags across 5 categories (dietary, service, atmosphere, feature, payment)
  - UI components: cuisine management with primary indicator, tag management grouped by category
  - Filters out already-assigned cuisines/tags in dropdown selectors
- **Onboarding Status Tracking**: 8-step onboarding process tracking using Santiago's 9 SQL functions + 4 Edge Functions
  - Get restaurant onboarding status using `get-restaurant-onboarding` Edge Function
  - Update step completion using `update-onboarding-step` Edge Function
  - Dashboard analytics via SQL functions (`get_onboarding_summary`, `v_incomplete_onboarding_restaurants`, `v_onboarding_progress_stats`)
  - 8 steps tracked: Basic Info, Location, Contact, Schedule, Menu, Payment, Delivery, Testing
  - Auto-calculated completion percentage and days in onboarding
  - Dashboard shows overview stats, step bottlenecks, and at-risk restaurants sorted by priority
  - Individual restaurant tab with interactive checklist to toggle step completion
  - Proper cache invalidation after mutations
- **Domain Verification & SSL Monitoring**: Automated SSL and DNS health monitoring using Santiago's 2 SQL views + 2 Edge Functions
  - Dashboard at `/admin/domains` shows verification status for all restaurant domains
  - Summary statistics: total domains, SSL verified %, expiring soon count, expired count
  - Priority-sorted list of domains needing attention with urgency badges
  - On-demand verification trigger using `verify-single-domain` Edge Function
  - Automated daily verification via `verify-domains-cron` (background cron job)
  - 30-day SSL expiration warnings to prevent downtime
  - DNS health checks to detect configuration issues
  - Real-time status updates via React Query with proper cache invalidation

## External Dependencies

### Backend Services
- **Supabase**: PostgreSQL database, authentication, and real-time subscriptions.
  - Schema: `menuca_v3` with 74 existing tables + 15 new tables.

### UI Libraries
- **Radix UI**: Headless component primitives.
- **Lucide React**: Icon library.
- **Recharts**: Charting library for dashboard visualizations.

### Development Tools
- **TypeScript**: For type safety.
- **Tailwind CSS**: Utility-first styling.
- **class-variance-authority**: Type-safe component variants.
- **clsx** + **tailwind-merge**: Class name composition.

### Fonts
- **Inter**: Primary sans-serif font.
- **JetBrains Mono**: Monospace font.

### Integrations
- **Mapbox GL JS**: For delivery area polygon drawing.
- **jsPDF/Puppeteer**: Planned for PDF generation.