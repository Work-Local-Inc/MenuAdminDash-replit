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
- **Supabase PostgreSQL** database with auto-generated TypeScript types.
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