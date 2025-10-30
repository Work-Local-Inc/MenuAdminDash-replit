# Menu.ca Admin Dashboard

## Overview
A Next.js 14 admin dashboard for Menu.ca, a multi-tenant restaurant ordering platform. It supports 961 restaurants and 32,330+ users, enabling comprehensive management of restaurants, orders, coupons, and user administration. The system extends an existing Supabase PostgreSQL database (`menuca_v3` schema) to provide enhanced admin functionalities. The project's ambition is to streamline restaurant operations and improve administrative efficiency for a large-scale food ordering service.

## CRITICAL: Database & Schema Rules
**⚠️ NEVER USE LOCAL REPLIT DATABASE - ALWAYS USE PRODUCTION SUPABASE**

### Database Architecture
- **Production Database**: Supabase PostgreSQL (nthpbtdjhhnwfxqsxbvy.supabase.co)
- **Connection**: Use `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` for admin operations
- **Execute SQL**: Use `psql` with `$SUPABASE_DB_URL` OR Node.js with `@supabase/supabase-js` client

### Schema Rules
1. **Admin/Auth Tables**: Use `menuca_v3` schema
   - `menuca_v3.admin_users`
   - `menuca_v3.admin_roles`
   - `menuca_v3.admin_user_restaurants`
2. **Auth Users**: Use `auth.users` schema (Supabase Auth)
3. **Restaurant Data**: Use `menuca_v3` schema (all existing restaurant/order/menu tables)

### Supabase Client Configuration
```typescript
// ALWAYS specify schema for admin operations
const supabase = createClient(...)
await supabase.schema('menuca_v3').from('admin_users')...
```

## Recent Changes
**October 30, 2025:**
- **✅ Menu Management Phase 1 (Core CRUD) Implemented & Production-Ready**: Complete menu categories and dishes management system
  - **Backend API Routes**: 5 route files with full CRUD operations
    - Courses: GET/POST `/api/menu/courses`, PATCH/DELETE `/api/menu/courses/[id]`, POST `/api/menu/courses/reorder`
    - Dishes: GET/POST `/api/menu/dishes`, PATCH/DELETE `/api/menu/dishes/[id]`
  - **React Query Hooks**: `lib/hooks/use-menu.ts` with 11 comprehensive hooks (useMenuCourses, useCreateCourse, useUpdateCourse, useDeleteCourse, useReorderCourses, useMenuDishes, useCreateDish, useUpdateDish, useDeleteDish, useToggleDishActive, useToggleDishFeatured)
  - **Admin UI Pages**:
    - `/admin/menu/categories`: Restaurant selector, drag-drop reordering (@hello-pangea/dnd), create/edit dialogs, toggle active status
    - `/admin/menu/dishes`: Multiple view modes (Grid/List/By Category), search & filters (course, active status), create/edit forms, toggle active/featured
  - **Critical Bug Fix**: Implemented predicate-based cache invalidation for all dish mutations to handle filtered queries (restaurant_id + course_id + is_active combinations)
  - **Architect Approval**: Production-ready with comprehensive cache invalidation, no security concerns
  - **Phase 1 Scope**: Core CRUD only - modifiers, sizes, inventory, and advanced features deferred to Phase 2+
  - **Navigation**: Added Menu Management section to sidebar with Categories and Dishes links

**October 29, 2025:**
- **🎉 Restaurant Management Hooks Layer Complete**: Created 6 comprehensive React Query hook files (1,600+ lines)
  - **NEW FILES**: use-restaurants.ts (1,200+ lines), use-franchises.ts, use-onboarding.ts, use-cuisines.ts, use-tags.ts, use-domains.ts
  - **Coverage**: 75+ hooks connecting to 50+ backend API routes (queries + mutations)
  - **Status**: Functional and working, matches existing project patterns
  - **⚠️ CRITICAL REFACTORING REQUIRED**: Architect identified project-wide issues (affects ALL 8 hook files including existing ones)
    - Issue 1: Using raw fetch() instead of apiRequest helper
    - Issue 2: Incomplete cache invalidation for hierarchical keys
    - Issue 3: Missing TypeScript types (using `any`)
  - **Decision**: Continue features first (Option C), defer hooks refactoring to post-Component 11.4
  - **Documentation**: Full refactoring requirements in `lib/Documentation/Audit-Reports/HOOKS_REFACTORING_REQUIRED.md`
  - **Estimated Effort**: 9-11 hours to refactor all 8 files project-wide
- **Restaurant Management Audit Completed**: Comprehensive audit of all 11 components (50+ SQL functions, 29 Edge Functions)
  - **Backend API: A+ Grade** - 50+ routes implemented, 95% correctly use Santiago's Edge Functions, excellent architecture
  - **Frontend Hooks: B Grade (40%)** - Jumpstarted from 0% to 40% with 6 major hook files, needs refactoring
  - **Admin UI: F Grade (5%)** - MAJOR GAP - Only stub pages, no forms or interactive features
  - **Key Deviation**: Delivery Areas POST uses direct INSERT instead of Edge Function (low impact, should fix)
  - **Documentation**: Full audit checklist and executive summary in `lib/Documentation/Audit-Reports/Restaurant-Management/`
- **Dual-Track Admin Creation System Implemented**: Automated Restaurant Owner creation + Manual Super Admin flow
  - **Automated Flow** (Restaurant Owner role_id=5): Uses Supabase Admin API to create auth user, admin_users record, and assign restaurants in one transaction with rollback on failure. Returns temporary password.
  - **Manual Flow** (Super Admin/Manager/Support/Staff roles 1,2,3,6): Creates pending admin_users record, displays 3-step Supabase Dashboard instructions with SQL commands for auth creation and role assignment.
  - **Fixed Production Issues**: Replaced broken `get_my_admin_info()` and `create_admin_user_request()` RPC functions with direct Supabase queries due to type mismatches (varchar vs text, ambiguous status column).
  - **admin_users Table Schema**: No `phone` column exists - only stores: id, email, first_name, last_name, auth_user_id, role_id, status, created_at, updated_at, and other admin-specific fields.

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

## Test Credentials
**Admin Account for Testing:**
- Email: brian+1@worklocal.ca
- Password: WL!2w3e4r5t

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
- **Menu Management**: Full CRUD for menu categories (courses) and dishes with restaurant-scoped operations, drag-drop reordering, search/filtering, and status toggles (active/featured).
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
- **@hello-pangea/dnd**: For drag-and-drop reordering (menu categories, and future features).
- **jsPDF/Puppeteer**: Planned for PDF generation.