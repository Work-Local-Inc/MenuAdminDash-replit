# Menu.ca Admin Dashboard

## Overview
A Next.js 14 admin dashboard for Menu.ca, a multi-tenant restaurant ordering platform. It supports 961 restaurants and 32,330+ users, enabling comprehensive management of restaurants, orders, coupons, and user administration. The system extends an existing Supabase PostgreSQL database (`menuca_v3` schema) to provide enhanced admin functionalities. The project's ambition is to streamline restaurant operations and improve administrative efficiency for a large-scale food ordering service.

## Recent Changes
**October 28, 2025:**
- **Users & Access Management Implemented**: Complete admin and customer user management system following Santiago's documentation
  - **Admin Users**: List/search/filter by role/status, create workflow with manual Supabase setup instructions, role-based access control
  - **Customer Users**: List/search customer accounts, view delivery addresses and favorite restaurants
  - **API Routes**: 8 new endpoints using Santiago's SQL functions (assign_restaurants_to_admin, create_admin_user_request, get_my_admin_info)
  - **React Hooks**: useAdminUsers, useCustomerUsers with comprehensive CRUD operations
  - **Pages**: `/admin/users/admin-users`, `/admin/users/admin-users/create`, `/admin/users/customers`, `/admin/users/customers/[id]`

**October 27, 2025:**
- **API Routing Standards Updated**: All documentation now follows Santiago's REST conventions from `API-ROUTE-IMPLEMENTAITON.md`
- **Restaurant Locations Bug Fixed**: Removed duplicate `.schema('menuca_v3')` calls causing "NA, NA" display
- **Database Query Strategy**: Switched to direct PostgreSQL queries for reliability with complex JOINs

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Next.js 14**: Utilizing App Router, TypeScript, Server Components for data fetching, and Client Components for interactivity.
- **UI & Styling**: Tailwind CSS with a custom design system, shadcn/ui component library (Radix UI primitives), and `next-themes` for light/dark mode.
- **Authentication & Authorization**: Supabase Auth for email/password, "Remember Me" functionality, middleware-based route protection, server-side session management (`@supabase/ssr`), and a custom `useAuth` hook.
- **State Management**: React Query for server state and caching, React Hook Form with Zod for form management and validation, and local component state.
- **API Routes**: Thin wrappers around Supabase Edge Functions for write operations and direct Supabase queries for reads, with Zod validation.
- **Form Handling**: React Hook Form with Zod schemas for validation and shadcn/ui components.
- **Utility Functions**: `lib/utils.ts` for helpers, consistent Canadian locale formatting (CAD, en-CA dates).
- **Customer-Facing Menu Page**: Public routes (`/r/[slug]`) using Server Components, Zustand for shopping cart state with localStorage persistence, and comprehensive UI components for menu display and ordering.

### Backend & Data Layer
- **Supabase PostgreSQL**: Production database (`menuca_v3` schema) connected via session pooler.
- **Direct PostgreSQL Queries**: Handled by `lib/db/postgres.ts` using `pg` Pool.
- **Schema Management**: Uses `menuca_v3` schema with schema-prefixed table names and specific production field names (e.g., `total_amount`).
- **Data Operations**: Relies heavily on over 50 SQL Functions for READ operations and 29 Edge Functions for WRITE operations as defined in `lib/Documentation/Frontend-Guides/BRIAN_MASTER_INDEX.md`.
- **Admin Users Management**: Custom tables (`admin_users`, `admin_roles`, `admin_user_restaurants`) within `menuca_v3` for granular admin control. RLS bypass for `admin_users` via service role client (`createAdminClient()`).

### Core Features & Implementations
- **Restaurant Management**: Includes status management (`update-restaurant-status`), online ordering toggle (`toggle-online-ordering`), contact management, and delivery area configuration (custom polygons via Mapbox).
- **Franchise Management**: Comprehensive hierarchy system using specific SQL and Edge Functions for parent creation, child linking, and bulk feature updates. Includes analytics.
- **Categorization System**: Cuisine and tag-based discovery using dedicated SQL and Edge Functions, supporting 36 cuisine types and 12 tags.
- **Onboarding Status Tracking**: An 8-step process with progress tracking, analytics, and interactive checklists, utilizing specific SQL and Edge Functions.
- **Domain Verification & SSL Monitoring**: Automated health checks for restaurant domains, including SSL verification and DNS health, with on-demand verification and cron jobs.

## External Dependencies

### Backend Services
- **Supabase**: PostgreSQL database, authentication, and real-time subscriptions.

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
- **jsPDF/Puppeteer**: Planned for PDF generation.