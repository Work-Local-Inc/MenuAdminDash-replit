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
- Middleware-based route protection (`middleware.ts`) redirecting unauthenticated users from `/admin/*` routes
- Server-side session management using `@supabase/ssr` for secure cookie handling
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

## Recent Changes

### Phase 3: Dashboard & Analytics (Completed - Oct 16, 2025)
NOTE: Supabase service role key doesn't have access to menuca_v3 schema. Using regular server client (anon key) which works fine - RLS is either disabled or policies allow access.

### Phase 4: Admin Users Management (Completed - Oct 16, 2025)

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