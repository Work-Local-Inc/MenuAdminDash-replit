# Menu.ca Admin Dashboard

## Overview

A Next.js 14 admin dashboard for managing the Menu.ca restaurant ordering platform. This multi-tenant system supports 74+ restaurants, 32,000+ users, and handles restaurant management, orders, coupons, and user administration.

The application connects to an existing Supabase PostgreSQL database (`menuca_v3` schema) with 74 existing tables and adds 15 new tables for enhanced admin functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## Test Credentials

**Admin Login:**
- Email: `brian+1@worklocal.ca`
- Password: `WL!2w3e4r5t`

## System Architecture

### Frontend Framework
- **Next.js 14** with App Router and TypeScript
- Server Components for data fetching with client components for interactivity
- Route-based organization under `/app` directory with grouped routes: `(auth)` for login, `(master-admin)` for protected admin pages

### UI & Styling
- **Tailwind CSS** with custom design system based on Linear/Vercel aesthetics
- **shadcn/ui** component library (28 components) with Radix UI primitives
- Custom theme system supporting light/dark modes via `next-themes`
- Design tokens defined in CSS variables (`globals.css`) for consistent colors, spacing, and borders

### Authentication & Authorization
- **Supabase Auth** with email/password authentication
- **Remember Me feature** - 7-day persistent sessions with email localStorage caching
- **Session Persistence** - Cookies properly sync between client/server using Supabase SSR cookie handlers
- Browser password autofill support via HTML5 autocomplete attributes
- Middleware-based route protection (`middleware.ts`) with automatic session refresh
  - `/admin/*` without session → redirect to `/login`
  - `/login` with valid session → redirect to `/admin/dashboard`
- Server-side session management using `@supabase/ssr` for secure cookie handling
- Automatic token refresh (access token: 1 hour, refresh token: 7 days)
- Custom `useAuth` hook for client-side auth state

### Data Layer
- **Supabase PostgreSQL** database with auto-generated TypeScript types (`types/supabase-database.ts`)
- Server-side data fetching via `lib/supabase/server.ts` for SSR/API routes
- Client-side queries via `lib/supabase/client.ts` for interactive components
- React Query (`@tanstack/react-query`) for client-side caching and state synchronization

### State Management
- **React Query** for server state (API data, caching, mutations)
- React Hook Form with Zod validation for form state
- Local component state via `useState` for UI interactions
- Custom hooks in `lib/hooks/` for reusable data fetching patterns

### API Routes
- Next.js Route Handlers under `/app/api/` for backend logic
- RESTful endpoints: `/api/restaurants`, `/api/orders`, `/api/coupons`, `/api/users`
- Zod schemas (`lib/validations/`) for request/response validation
- Server-side Supabase client for database queries in API routes

### Form Handling
- **React Hook Form** for form state management
- **Zod** schemas for validation (`lib/validations/`)
- `@hookform/resolvers/zod` for seamless integration
- Reusable form components from shadcn/ui

### Utility Functions
- `lib/utils.ts`: Core helpers for class names (`cn`), currency formatting, date/time formatting, status color mapping
- Consistent Canadian locale formatting (CAD currency, en-CA dates)

## External Dependencies

### Backend Services
- **Supabase**: PostgreSQL database, authentication, and real-time subscriptions
  - Connection via environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Schema: `menuca_v3` with 74 existing tables + 15 new tables (pending migration)

### UI Libraries
- **Radix UI**: Headless component primitives (dialogs, dropdowns, popovers, etc.)
- **Lucide React**: Icon library for consistent iconography
- **Recharts**: Charting library for dashboard visualizations

### Development Tools
- **TypeScript**: Full type safety across application
- **Tailwind CSS**: Utility-first styling
- **class-variance-authority**: Type-safe component variants
- **clsx** + **tailwind-merge**: Class name composition

### Fonts
- **Inter**: Primary sans-serif font via Google Fonts
- **JetBrains Mono**: Monospace font for code/IDs

### Integrations
- **Mapbox GL JS**: Fully integrated for delivery area polygon drawing with MapboxDraw controls
- **jsPDF/Puppeteer**: For PDF generation (statements, reports) - planned

## Project Progress

**Overall Status:** 5/11 Major Phases Complete (45% complete)

See **PROGRESS.md** and **NEXT_STEPS_TASK_LIST.md** for detailed roadmap and remaining work.

## Pending Database Migrations

**⚠️ RBAC System - Database Schema Update Required:**

The following SQL must be run on the production Supabase database to enable the RBAC system:

```sql
-- Add role_id column to admin_users table
ALTER TABLE menuca_v3.admin_users 
ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES menuca_v3.admin_roles(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_role_id 
ON menuca_v3.admin_users(role_id);

-- Optionally: Assign all existing admin users to Super Admin role (ID: 1)
UPDATE menuca_v3.admin_users 
SET role_id = 1 
WHERE role_id IS NULL AND deleted_at IS NULL;
```

**Status:** RBAC system is fully implemented in code but requires this database migration to function. Once the migration is applied, the system will allow:
- Role management (create/edit/delete roles with granular permissions)
- Role assignment when creating admin users
- Permission-based access control for API routes

## Recent Changes

### Phase 1: Authentication & Layout ✅ (Completed - Oct 2025)
- Supabase Auth integration with email/password
- Login page with MENU.CA brand logo
- Protected routes with middleware
- Admin sidebar navigation with theme toggle
- User dropdown with logout functionality

### Phase 2: Restaurant Management ✅ (Completed - Oct 2025)
- Complete restaurant CRUD with 15 management tabs
- Mapbox integration for delivery areas
- Image management with Supabase Storage
- Full API layer with validation

### Phase 3: Dashboard & Analytics ✅ (Completed - Oct 16, 2025)
- Real-time statistics (revenue, orders, restaurants, users)
- Revenue charts with Recharts (Daily/Weekly/Monthly)
- Recent orders widget (auto-refresh every 10s)
- Top restaurants by order count

### Phase 4: Admin Users Management ✅ (Completed - Oct 16, 2025)

**✅ Security Implementation:**
- Admin authentication/authorization middleware (`lib/auth/admin-check.ts`)
  - Verifies Supabase Auth session (anon key)
  - Checks admin_users table with service role key (bypasses RLS)
  - Rejects deleted admins (deleted_at != null)
  - Returns 401 for unauthenticated, 403 for non-admins
- All API routes protected with `verifyAdminAuth()`:
  - GET /api/admin-users (list, search, pagination)
  - POST /api/admin-users (server-side bcrypt hashing)
  - GET /api/admin-users/[id] (single user)
  - PATCH /api/admin-users/[id] (server-side bcrypt hashing)
  - DELETE /api/admin-users/[id] (soft delete, transactional)

**✅ RLS Bypass Solution:**
- List page (app/admin/users/page.tsx) fetches from API route with auth cookies
- No direct Supabase queries from frontend
- Service role used only in API routes for admin_users access
- Query cache invalidation + router refresh after user creation

**✅ Security Model (Documented in code):**
- Only admin users have Supabase Auth accounts
- Customers use separate authentication system
- Any authenticated Supabase user is verified against admin_users table
- Future-proof: If customers ever use Supabase Auth, add supabase_user_id column

**✅ E2E Testing:**
- Unauthenticated access → 401 redirect to login
- Admin login → full access to dashboard
- User creation → appears in list with MFA badge
- Unauthorized API access → 401 error
- First admin: brian+1@worklocal.ca (ID 919)

### Phase 5: Customer Ordering Database ✅ (Completed - Oct 16, 2025)
- Created 8 new customer ordering tables in production Supabase:
  - cart_sessions, user_delivery_addresses, user_payment_methods
  - payment_transactions, order_status_history, stripe_webhook_events
  - user_favorite_dishes, restaurant_reviews
- Updated existing tables (users.stripe_customer_id, orders payment fields)
- All tables created in menuca_v3 schema with proper foreign keys

### Phase 6: Restaurant Menu Page ✅ (Completed - Oct 16, 2025)

**✅ Public Customer-Facing Routes:**
- `/r/[slug]` - Restaurant menu page with slug format: `{name}-{id}` (e.g., "joes-pizza-123")
- Server components with loading.tsx (skeleton) and error.tsx (error boundary)
- SSR-safe implementation with proper hydration handling

**✅ Customer API Routes (3 endpoints):**
- GET /api/customer/restaurants/[slug] - Fetch restaurant by ID extracted from slug
- GET /api/customer/restaurants/[slug]/menu - Fetch courses with nested dishes
- GET /api/customer/dishes/[id]/modifiers - Fetch dish modifiers

**✅ Shopping Cart System:**
- Zustand store with localStorage persistence (`menu-ca-cart` key)
- CartItem interface: dishId, dishName, size, sizePrice, quantity, modifiers, specialInstructions, subtotal
- SSR-safe restaurant switching with client-only confirmation dialog
- Tax calculation: 13% HST on (subtotal + delivery fee)
- Prevents cross-restaurant mixing with confirmation dialog

**✅ UI Components (4 components):**
- RestaurantMenu - Header, category nav, dish grid, floating cart button
- DishCard - Responsive 2-col desktop/1-col mobile grid with quick add
- DishModal - Full customization (sizes, modifiers, special instructions, quantity)
- CartDrawer - Side sheet with items, calculations, checkout button

**✅ UX Features:**
- Empty menu fallback: "Menu Coming Soon" for restaurants without dishes
- Loading skeleton screens during data fetch
- Error boundaries with retry functionality
- Touch-friendly UI (44px min touch targets)
- Responsive grid layout

**✅ Technical Implementation:**
- Slug utility: `lib/utils/slugify.ts` (slugify, extractIdFromSlug, createRestaurantSlug)
- SSR guards: `typeof window !== 'undefined'` checks prevent hydration errors
- Error handling: Throws errors to Next.js error boundary instead of notFound()
- All prices in cents for precision (base_price: 1299 = $12.99)

**✅ E2E Testing Complete:**
- **Test Restaurant**: Cathay Restaurants (ID: 72) with 30 courses, 233 dishes
- **Verified Functionality**:
  - Page loads successfully at `/r/cathay-restaurants-72`
  - Dishes display in responsive grid layout
  - Dish modal opens with customization options
  - Add to cart functionality works correctly
  - Cart drawer shows items with accurate calculations
  - Multiple item support (tested with Almond/Cookies + Egg Roll)
  - Price calculations: Subtotal + Delivery ($5.00) + 13% HST = Total ✅
- **Bug Fixes Applied**:
  - Changed `restaurant_locations!inner` to `restaurant_locations` (LEFT JOIN)
  - Removed non-existent `delivery_fee_cents` column from queries
  - SSR cart clearing prevention (early return on server)
  - Fixed is_active NULL handling for legacy courses/dishes
  - Removed restaurant status filter on customer pages
- **Production Ready**: Full ordering flow validated end-to-end

### Phase 7: Remember Me & Session Persistence ✅ (Completed - Oct 17, 2025)

**✅ Enhanced Login Experience:**
- **Remember Me checkbox** on login page
  - 7-day persistent sessions vs default 1-hour
  - Stores email in localStorage for convenience
  - Label: "Remember me (stay signed in for 7 days)"
- **Browser password autofill support**
  - `autoComplete="email"` and `autoComplete="current-password"` attributes
  - `name` attributes on form fields for password manager compatibility
  - Works with Chrome, Firefox, Safari built-in password managers
- **Session cookie synchronization** (Fixed Oct 17, 2025)
  - Supabase SSR cookie handlers properly sync client/server sessions
  - Middleware reads session cookies and auto-refreshes tokens
  - SSR-safe guards prevent `document is not defined` errors
  - Cookies: `sb-*-auth-token` and `menu-ca-admin-session`
  - Sessions persist across browser restarts

**✅ E2E Testing:**
- Remember Me checkbox displays correctly
- Email pre-fills on subsequent logins
- Session persists across browser tabs and page refreshes
- 7-day session duration verified
- Browser password manager integration confirmed
- Middleware auto-redirect: `/login` → `/admin/dashboard` when logged in