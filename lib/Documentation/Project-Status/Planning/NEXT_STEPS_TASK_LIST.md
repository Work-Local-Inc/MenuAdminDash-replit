# 🎯 MENU.CA V3 - NEXT STEPS TASK LIST
**Organized from highest to lowest priority**

---

## ✅ COMPLETED WORK (Phases 1-4)

### ✅ Phase 1: Authentication & Layout (COMPLETED)
- [x] Supabase client setup (browser & server)
- [x] Login page with MENU.CA brand logo
- [x] Auth middleware for route protection (`/admin/*`)
- [x] Admin layout with sidebar navigation
- [x] Theme toggle (light/dark mode)
- [x] User dropdown with logout
- [x] Breadcrumb navigation
- [x] Protected routes

**Files Created:** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `app/(auth)/login/page.tsx`, `components/app-sidebar.tsx`, `components/theme-toggle.tsx`, `components/user-dropdown.tsx`, `middleware.ts`

---

### ✅ Phase 2: Restaurant Management (COMPLETED)
**15 Management Tabs - Fully Functional:**
- [x] 1. Basic Info (name, description, logo, images) → [📖 SEO Guide](lib/Documentation/Frontend-Guides/Restaurant%20Management/07-SEO-Full-Text-Search.md)
- [x] 2. Contact Info (phone, email, fax) → [📖 Contact Management](lib/Documentation/Frontend-Guides/Restaurant%20Management/05-Contact-Management.md)
- [x] 3. Locations (multiple addresses, primary location)
- [x] 4. Delivery Areas (Mapbox GL JS polygon drawing) → [📖 PostGIS Delivery Zones](lib/Documentation/Frontend-Guides/Restaurant%20Management/06-PostGIS-Delivery-Zones.md)
- [x] 5. Hours & Schedules (operating hours, holidays)
- [x] 6. Payment Methods (credit cards, cash, etc.)
- [x] 7. Service Config (delivery, pickup, dine-in)
- [x] 8. SEO Settings (meta tags, descriptions) → [📖 SEO Guide](lib/Documentation/Frontend-Guides/Restaurant%20Management/07-SEO-Full-Text-Search.md)
- [x] 9. Menu Categories (organize menu structure) → [📖 Categorization System](lib/Documentation/Frontend-Guides/Restaurant%20Management/08-Categorization-System.md)
- [x] 10. Custom Domains (custom URLs) → [📖 Domain Verification](lib/Documentation/Frontend-Guides/Restaurant%20Management/11-Domain-Verification-SSL.md)
- [x] 11. Custom CSS (branding/styling)
- [x] 12. Integrations (POS systems, third-party)
- [x] 13. Images (logo, banner, gallery with drag-drop reorder)
- [x] 14. Feedback (reviews, ratings management)
- [x] 15. Contacts (owner, manager details) → [📖 Contact Management](lib/Documentation/Frontend-Guides/Restaurant%20Management/05-Contact-Management.md)

**Backend Documentation:**
- **Master Index:** [lib/Documentation/Frontend-Guides/BRIAN_MASTER_INDEX.md](lib/Documentation/Frontend-Guides/BRIAN_MASTER_INDEX.md)
- **Restaurant Management Guide:** [lib/Documentation/Frontend-Guides/01-Restaurant-Management-Frontend-Guide.md](lib/Documentation/Frontend-Guides/01-Restaurant-Management-Frontend-Guide.md)
- **Documentation Mapping:** [DOCUMENTATION_MAPPING.md](DOCUMENTATION_MAPPING.md) - Quick reference for all 11 components

**Key Features:**
- Full CRUD operations for all restaurant data
- Mapbox GL JS integration for delivery area polygon drawing
- Image upload with Supabase Storage
- Drag-and-drop image reordering
- Real-time validation with Zod schemas
- Server-side API routes for all operations
- **50+ SQL Functions** and **29 Edge Functions** available from Santiago's backend work

**Files Created:** `app/admin/restaurants/page.tsx`, `app/admin/restaurants/[id]/page.tsx`, 15+ API routes under `app/api/restaurants/*`, restaurant components, validation schemas

---

## 🛒 NEW: CUSTOMER ORDERING SYSTEM (PHASES 5-9)

**GOAL:** Add customer-facing ordering system to the same Next.js app
- **Admin Dashboard:** Stays at `/admin/*`
- **Customer App:** Root `/` and `/r/[restaurant-slug]`
- **Database:** Same `menuca_v3` schema (existing + 8 new tables)
- **Reference:** `/CUSTOMER_ORDERING_APP_BUILD_PLAN.md`

---

### PHASE 5: Database Setup for Customer Ordering ⏳
**Priority:** CRITICAL  
**Estimated Time:** 3 hours  
**Dependencies:** None  
**Current Status:** ⏳ STARTING NOW

#### New Tables to Create:
- [ ] 5.1 - `cart_sessions` table (temporary cart storage)
- [ ] 5.2 - `user_delivery_addresses` table (saved addresses)
- [ ] 5.3 - `user_payment_methods` table (Stripe payment methods)
- [ ] 5.4 - `payment_transactions` table (payment tracking)
- [ ] 5.5 - `order_status_history` table (order tracking)
- [ ] 5.6 - `stripe_webhook_events` table (webhook idempotency)
- [ ] 5.7 - `user_favorite_dishes` table (customer favorites)
- [ ] 5.8 - `restaurant_reviews` table (ratings/reviews)

#### Update Existing Tables:
- [ ] 5.9 - Add `stripe_customer_id` to `users` table
- [ ] 5.10 - Add payment fields to `orders` table (stripe_payment_intent_id, payment_status, delivery_address)

**Acceptance Criteria:**
- All 8 new tables created successfully
- Existing tables updated with new columns
- Indexes and foreign keys properly configured

---

### PHASE 6: Restaurant Menu Page `/r/[slug]` ⏳
**Priority:** CRITICAL  
**Estimated Time:** 2 days  
**Dependencies:** Phase 5 (database setup)  
**Current Status:** ⏳ IN PROGRESS

#### Subtasks:
- [ ] 6.1 - Create `/r/[slug]` route with nested Supabase queries (restaurant + locations + schedules + courses + dishes + prices + modifiers)
- [ ] 6.2 - Build restaurant header component (logo, name, address, hours, delivery fee, min order)
- [ ] 6.3 - Implement sticky category navigation sidebar (appetizers, mains, desserts)
- [ ] 6.4 - Create dish card component - 2 columns desktop, 1 mobile (image, name, price, "+" button)
- [ ] 6.5 - Build dish detail modal (size radio buttons, modifier checkboxes, special instructions textarea, quantity +/-)
- [ ] 6.6 - Implement Zustand cart store with CartItem interface (dishId, size, modifiers, specialInstructions, subtotal)
- [ ] 6.7 - Create floating cart button (bottom right, shows item count)
- [ ] 6.8 - Build cart drawer/sheet (slides from right, full width mobile, sidebar desktop)
- [ ] 6.9 - Add cart calculations: Subtotal + Delivery Fee + Tax (13% HST Ontario) = Total
- [ ] 6.10 - Implement cart persistence (localStorage) + restaurant switch validation ("Clear cart?" dialog)
- [ ] 6.11 - Add restaurant hours validation (closed/open status, schedule display)
- [ ] 6.12 - Ensure touch-friendly UI (min 44px tap targets for mobile)
- [ ] 6.13 - Test menu browsing, customization, and cart operations

**API Endpoints to Build:**
- `GET /api/restaurants/[slug]` - Get restaurant details
- `GET /api/restaurants/[slug]/menu` - Get full menu with categories
- `POST /api/cart` - Save cart session
- `GET /api/cart/[sessionId]` - Retrieve cart

**Components to Create:**
- `app/(public)/r/[slug]/page.tsx`
- `components/restaurant/restaurant-header.tsx`
- `components/restaurant/menu-category-nav.tsx`
- `components/restaurant/dish-card.tsx`
- `components/restaurant/dish-modal.tsx`
- `components/cart/cart-drawer.tsx`
- `components/cart/cart-item.tsx`
- `components/cart/mini-cart-button.tsx`
- `lib/stores/cart-store.ts` (Zustand)

**Acceptance Criteria:**
- Can browse restaurant menu by categories
- Can view dish details with modifiers
- Can add items to cart with customizations
- Cart persists across page refreshes
- Cart shows accurate totals
- Mobile-responsive design

---

### PHASE 7: Homepage & Restaurant Search 📍
**Priority:** HIGH  
**Estimated Time:** 2 days  
**Dependencies:** Phase 6 (menu page)  
**Current Status:** ❌ Not started

#### Subtasks:
- [ ] 7.1 - Create `/` homepage route
- [ ] 7.2 - Build hero section with location search
- [ ] 7.3 - Implement Mapbox address autocomplete
- [ ] 7.4 - Create restaurant grid/list view
- [ ] 7.5 - Add filters (cuisine, delivery fee, rating, etc.)
- [ ] 7.6 - Build restaurant card component
- [ ] 7.7 - Implement search functionality
- [ ] 7.8 - Add "Featured Restaurants" section
- [ ] 7.9 - Create customer navbar (with cart icon)
- [ ] 7.10 - Test search and filtering

**API Endpoints:**
- `GET /api/restaurants` - List restaurants (with filters)
- `POST /api/restaurants/search` - Search by location

**Components:**
- `app/(public)/page.tsx`
- `components/homepage/hero-section.tsx`
- `components/homepage/location-search.tsx`
- `components/homepage/restaurant-grid.tsx`
- `components/restaurant/restaurant-card.tsx`
- `components/layout/customer-navbar.tsx`

**Acceptance Criteria:**
- Can search restaurants by address
- Filters work correctly
- Restaurant cards link to menu pages
- Mobile-responsive design
- Fast performance (<2s load)

---

### PHASE 8: Checkout & Payment 💳
**Priority:** HIGH  
**Estimated Time:** 3 days  
**Dependencies:** Phase 6 (cart), Stripe integration  
**Current Status:** ❌ Not started

#### Subtasks:
- [ ] 8.1 - Install and configure Stripe
- [ ] 8.2 - Create `/checkout` route
- [ ] 8.3 - Build delivery type selector (delivery vs pickup radio buttons)
- [ ] 8.4 - Create address selector/form (street address, unit, city, postal code)
- [ ] 8.5 - Add delivery time selector (ASAP default, or Schedule for later with date + time picker)
- [ ] 8.6 - Implement Stripe Payment Element (card number, expiry, CVC, billing postal code)
- [ ] 8.7 - Add tip selection component
- [ ] 8.8 - Build order summary sidebar (items, delivery fee, tax 13% HST, total)
- [ ] 8.9 - Create coupon code input and validation
- [ ] 8.10 - Implement order creation API (creates order + order_items + payment_transaction)
- [ ] 8.11 - Handle Stripe Payment Intent creation and confirmation
- [ ] 8.12 - Create order confirmation page `/order-confirmation/[id]` with order number, estimated delivery time, "Track Order" button
- [ ] 8.13 - Build Stripe webhook handler for payment events
- [ ] 8.14 - Add "Save address" checkbox for logged-in users
- [ ] 8.15 - Test full checkout flow (delivery/pickup, ASAP/scheduled, payment, order creation)

**API Endpoints:**
- `POST /api/checkout/create-payment-intent`
- `POST /api/checkout/confirm-order`
- `POST /api/stripe/webhook`
- `POST /api/cart/apply-coupon`

**Components:**
- `app/(public)/checkout/page.tsx`
- `app/(public)/order-confirmation/[id]/page.tsx`
- `components/checkout/delivery-type-selector.tsx`
- `components/checkout/address-form.tsx`
- `components/checkout/payment-element.tsx`
- `components/checkout/order-summary.tsx`
- `components/checkout/tip-selector.tsx`

**Acceptance Criteria:**
- Can select delivery/pickup
- Address validation works
- Stripe payment processes successfully
- Coupons apply correctly
- Order confirmation displays
- Webhooks handle payment events

---

### PHASE 9: Customer Account Pages 👤
**Priority:** MEDIUM  
**Estimated Time:** 2 days  
**Dependencies:** Phase 8 (orders created)  
**Current Status:** ❌ Not started

#### Subtasks:
- [ ] 9.1 - Create customer authentication (signup/login)
- [ ] 9.2 - Build `/account/orders` - Order history page
- [ ] 9.3 - Create `/account/orders/[id]` - Order detail page
- [ ] 9.4 - Build `/account/addresses` - Saved addresses
- [ ] 9.5 - Create `/account/payments` - Saved cards
- [ ] 9.6 - Build `/account/favorites` - Favorite dishes
- [ ] 9.7 - Add real-time order tracking
- [ ] 9.8 - Implement order reordering
- [ ] 9.9 - Test account features

**API Endpoints:**
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/account/orders`
- `GET /api/account/orders/[id]`
- `GET /api/addresses`
- `POST /api/addresses`

**Components:**
- `app/(customer)/account/orders/page.tsx`
- `app/(customer)/account/orders/[id]/page.tsx`
- `app/(customer)/account/addresses/page.tsx`
- `app/(customer)/account/payments/page.tsx`
- `app/(customer)/account/favorites/page.tsx`
- `components/account/order-card.tsx`
- `components/account/order-tracking.tsx`

**Acceptance Criteria:**
- Customers can sign up/login
- Can view order history
- Real-time order tracking works
- Can save addresses and payment methods
- Can reorder past orders
- Mobile-responsive

---

## 🔥 CRITICAL TASKS (Admin Dashboard - Must Do First)

### TASK 1: Database Setup
**Priority:** CRITICAL  
**Estimated Time:** 4 hours  
**Dependencies:** None  
**Blocker Status:** Blocks all future features

#### Subtasks:
- [ ] 1.1 - Create `admin_roles` table (RBAC foundation)
- [ ] 1.2 - Create `blacklist` table (security)
- [ ] 1.3 - Create `franchises` table
- [ ] 1.4 - Create `franchise_commission_rules` table
- [ ] 1.5 - Create `order_cancellation_requests` table
- [ ] 1.6 - Create `email_templates` table
- [ ] 1.7 - Create `restaurant_citations` table
- [ ] 1.8 - Create `restaurant_banners` table
- [ ] 1.9 - Create `restaurant_bank_accounts` table
- [ ] 1.10 - Create `restaurant_redirects` table
- [ ] 1.11 - Create `restaurant_charges` table
- [ ] 1.12 - Add franchise_id column to restaurants table
- [ ] 1.13 - Add role_id column to admin_user_restaurants table
- [ ] 1.14 - Add coupon fields to promotional_coupons table
- [ ] 1.15 - Verify all tables created successfully

**Files to Create:**
- SQL migration script (can be run in Supabase SQL Editor)

**Acceptance Criteria:**
- All 15 new tables exist in database
- All foreign keys are properly configured
- All indexes are created
- Default roles are inserted (Super Admin, Restaurant Manager, Staff)

---

### TASK 2: RBAC System (Role-Based Access Control)
**Priority:** CRITICAL  
**Estimated Time:** 2 days  
**Dependencies:** TASK 1 (admin_roles table)  
**Current Status:** ❌ Not started

#### Subtasks:
- [ ] 2.1 - Create role management page (`app/admin/users/roles/page.tsx`)
- [ ] 2.2 - Create permission matrix component
- [ ] 2.3 - Build role assignment UI
- [ ] 2.4 - Implement API endpoints for roles
  - GET `/api/roles` - List all roles
  - POST `/api/roles` - Create new role
  - PUT `/api/roles/[id]` - Update role
  - DELETE `/api/roles/[id]` - Delete role (if not system role)
- [ ] 2.5 - Update middleware to check permissions
- [ ] 2.6 - Add permission checks to all sensitive routes
- [ ] 2.7 - Create role assignment to admin users
- [ ] 2.8 - Test role-based access restrictions

**Files to Create:**
- `app/admin/users/roles/page.tsx`
- `app/admin/users/permissions/page.tsx`
- `components/users/permission-matrix.tsx`
- `components/users/role-form.tsx`
- `app/api/roles/route.ts`
- `app/api/roles/[id]/route.ts`
- `lib/rbac.ts` (permission checking utilities)

**Acceptance Criteria:**
- Can create custom roles with specific permissions
- Admin users can be assigned roles
- Routes are protected based on permissions
- Super Admin has access to everything
- Restaurant Manager only sees assigned restaurants
- Staff has read-only access

---

### TASK 3: Master Admin Dashboard ✅
**Priority:** CRITICAL  
**Estimated Time:** 2 days  
**Dependencies:** None  
**Current Status:** ✅ COMPLETED (Oct 16, 2025)

#### Subtasks:
- [x] 3.1 - Build stat cards component (Total Revenue, Orders, Restaurants, Users)
- [x] 3.2 - Implement revenue chart (Recharts line chart with Daily/Weekly/Monthly)
- [x] 3.3 - Build live order feed component (auto-refresh every 10s)
- [x] 3.4 - Add date range filter (Daily/Weekly/Monthly tabs)
- [x] 3.5 - Create dashboard stats API endpoint
- [x] 3.6 - Implement auto-refresh (stats every 30s, orders every 10s)
- [x] 3.7 - Add top restaurants widget (top 5 by order count)
- [x] 3.8 - Revenue history API with proper date aggregation
- [x] 3.9 - Test dashboard with real data (32K users, 277 restaurants)

**Files to Create:**
- `components/dashboard/stat-card.tsx`
- `components/dashboard/revenue-chart.tsx`
- `components/dashboard/live-order-feed.tsx`
- `components/dashboard/top-restaurants.tsx`
- `components/dashboard/order-status-chart.tsx`
- `app/api/dashboard/revenue/route.ts`
- `app/api/dashboard/top-restaurants/route.ts`

**Files to Update:**
- `app/admin/dashboard/page.tsx` (currently empty)
- `app/api/dashboard/stats/route.ts` (expand functionality)

**Acceptance Criteria:**
- Dashboard shows real-time stats
- Charts display correctly
- Live order feed updates automatically
- Date filters work correctly
- Performance is acceptable (< 3 second load)

---

### TASK 4: Admin User Management ✅
**Priority:** CRITICAL  
**Estimated Time:** 2 days  
**Dependencies:** TASK 2 (RBAC system) - **Completed without full RBAC**  
**Current Status:** ✅ COMPLETED (Oct 16, 2025)

#### Subtasks:
- [x] 4.1 - Build admin user list page (with search, pagination)
- [x] 4.2 - Create add admin user form (with MFA toggle)
- [x] 4.3 - Security implementation (auth middleware, bcrypt hashing)
- [x] 4.4 - RLS bypass solution (API routes with service role)
- [x] 4.5 - E2E testing (user creation, list display, MFA badges)
- [x] 4.6 - Build user API endpoints
  - [x] GET `/api/admin-users` - List admin users
  - [x] GET `/api/admin-users/[id]` - Get user details  
  - [x] POST `/api/admin-users` - Create admin user (server-side bcrypt)
  - [x] PATCH `/api/admin-users/[id]` - Update admin user
  - [x] DELETE `/api/admin-users/[id]` - Soft delete user
- [x] 4.7 - Add user search & filters
- [x] 4.8 - Server-side password hashing with bcrypt
- [x] 4.9 - Test user CRUD operations (all passing)

**Files to Create:**
- `components/users/user-list.tsx`
- `components/users/user-form.tsx`
- `components/users/restaurant-assignment.tsx`
- `app/api/users/[id]/route.ts`
- `app/api/users/[id]/restaurants/route.ts`

**Files to Update:**
- `app/admin/users/page.tsx` (currently empty)
- `app/api/users/route.ts` (expand functionality)

**Acceptance Criteria:**
- Can add new admin users
- Can edit existing users
- Can assign roles to users
- Can assign restaurants to users
- Users receive invitation emails
- User list shows role and assigned restaurants

---

## ⚠️ HIGH PRIORITY TASKS

### TASK 5: Coupon Management System
**Priority:** HIGH  
**Estimated Time:** 3 days  
**Dependencies:** None  
**Current Status:** ❌ Not started

#### Subtasks:
- [ ] 5.1 - Build coupon list page with filters
- [ ] 5.2 - Create coupon form with all 15 fields
  - Code, discount type, amount, min order
  - Start/end dates, usage limits
  - Restaurant scope, language, courses
  - Email inclusion, single use, etc.
- [ ] 5.3 - Implement email coupon generator
- [ ] 5.4 - Build bulk CSV upload feature
- [ ] 5.5 - Create coupon analytics dashboard
- [ ] 5.6 - Implement coupon API endpoints
  - GET `/api/coupons` - List coupons
  - POST `/api/coupons` - Create coupon
  - PUT `/api/coupons/[id]` - Update coupon
  - DELETE `/api/coupons/[id]` - Delete coupon
  - POST `/api/coupons/bulk` - Bulk upload
  - GET `/api/coupons/[id]/usage` - Usage stats
- [ ] 5.7 - Add coupon validation logic
- [ ] 5.8 - Test coupon creation and redemption

**Files to Create:**
- `components/coupons/coupon-list.tsx`
- `components/coupons/coupon-form.tsx`
- `components/coupons/email-coupon-generator.tsx`
- `components/coupons/coupon-bulk-upload.tsx`
- `components/coupons/coupon-analytics.tsx`
- `app/api/coupons/[id]/route.ts`
- `app/api/coupons/bulk/route.ts`
- `app/api/coupons/email/route.ts`
- `lib/validations/coupon.ts`

**Files to Update:**
- `app/admin/coupons/page.tsx` (currently stub)
- `app/api/coupons/route.ts` (expand functionality)

**Acceptance Criteria:**
- Can create individual coupons
- Can generate email coupons in bulk
- CSV upload creates multiple coupons
- Coupon validation works correctly
- Analytics show usage statistics

---

### TASK 6: Franchise Management
**Priority:** HIGH  
**Estimated Time:** 2 days  
**Dependencies:** TASK 1 (franchises tables)  
**Current Status:** ❌ Not started

**📖 Documentation:** [Franchise/Chain Hierarchy Guide](lib/Documentation/Frontend-Guides/Restaurant%20Management/01-Franchise-Chain-Hierarchy.md)  
**Backend APIs Available:** 13 SQL Functions + 3 Edge Functions

#### Subtasks:
- [ ] 6.1 - Build franchise list page
- [ ] 6.2 - Create franchise form
- [ ] 6.3 - Implement restaurant linking UI
- [ ] 6.4 - Build commission rules editor
- [ ] 6.5 - Create consolidated reporting page
- [ ] 6.6 - Implement franchise API endpoints (use SQL functions from guide)
  - GET `/api/franchises` - List franchises
  - POST `/api/franchises` - Create franchise
  - PUT `/api/franchises/[id]` - Update franchise
  - GET `/api/franchises/[id]/restaurants` - Get linked restaurants
  - POST `/api/franchises/[id]/commission` - Set commission rules
  - GET `/api/franchises/[id]/reports` - Get consolidated reports
- [ ] 6.7 - Test franchise workflows

**Files to Create:**
- `app/admin/franchises/page.tsx`
- `app/admin/franchises/[id]/page.tsx`
- `app/admin/franchises/commission/page.tsx`
- `app/admin/franchises/reports/page.tsx`
- `components/franchises/franchise-form.tsx`
- `components/franchises/restaurant-linker.tsx`
- `components/franchises/commission-rules.tsx`
- `app/api/franchises/route.ts`
- `app/api/franchises/[id]/route.ts`
- `app/api/franchises/[id]/commission/route.ts`
- `app/api/franchises/[id]/reports/route.ts`

**Acceptance Criteria:**
- Can create franchises
- Can link multiple restaurants
- Commission rules can be configured
- Consolidated reports work across all franchise locations

---

### TASK 7: Accounting & Statement Generation
**Priority:** HIGH  
**Estimated Time:** 3 days  
**Dependencies:** TASK 1 (restaurant_bank_accounts, restaurant_charges tables)  
**Current Status:** ❌ Not started

#### Subtasks:
- [ ] 7.1 - Build statement generator page
- [ ] 7.2 - Implement PDF generation (jsPDF)
- [ ] 7.3 - Create commission manager
- [ ] 7.4 - Build vendor reports page
- [ ] 7.5 - Implement payment tracking
- [ ] 7.6 - Add reconciliation tool
- [ ] 7.7 - Create accounting API endpoints
  - POST `/api/accounting/statements` - Generate statement
  - GET `/api/accounting/commissions` - Get commissions
  - POST `/api/accounting/payments` - Record payment
  - GET `/api/accounting/reconciliation` - Get reconciliation data
- [ ] 7.8 - Test PDF generation
- [ ] 7.9 - Verify financial calculations

**Files to Create:**
- `app/admin/accounting/statements/page.tsx`
- `app/admin/accounting/commissions/page.tsx`
- `app/admin/accounting/payments/page.tsx`
- `app/admin/accounting/reconciliation/page.tsx`
- `components/accounting/statement-generator.tsx`
- `components/accounting/pdf-generator.tsx`
- `components/accounting/commission-manager.tsx`
- `components/accounting/payment-tracker.tsx`
- `app/api/accounting/statements/route.ts`
- `app/api/accounting/commissions/route.ts`
- `app/api/accounting/payments/route.ts`
- `lib/pdf-generator.ts`

**Acceptance Criteria:**
- Can generate statements for any date range
- PDFs are properly formatted
- Commission calculations are accurate
- Payment tracking is functional
- Reconciliation identifies discrepancies

---

### TASK 8: Blacklist Management
**Priority:** HIGH  
**Estimated Time:** 1 day  
**Dependencies:** TASK 1 (blacklist table)  
**Current Status:** ❌ Not started

#### Subtasks:
- [ ] 8.1 - Build blacklist management page
- [ ] 8.2 - Create add/edit blacklist form
- [ ] 8.3 - Implement identifier validation
- [ ] 8.4 - Add expiration date logic
- [ ] 8.5 - Create blacklist API endpoints
  - GET `/api/blacklist` - List blocked entries
  - POST `/api/blacklist` - Add to blacklist
  - PUT `/api/blacklist/[id]` - Update entry
  - DELETE `/api/blacklist/[id]` - Remove from blacklist
  - POST `/api/blacklist/check` - Check if identifier is blocked
- [ ] 8.6 - Test blacklist enforcement

**Files to Create:**
- `app/admin/blacklist/page.tsx`
- `components/blacklist/blacklist-form.tsx`
- `app/api/blacklist/route.ts`
- `app/api/blacklist/[id]/route.ts`
- `app/api/blacklist/check/route.ts`

**Acceptance Criteria:**
- Can block emails, phones, IPs
- Expiration dates work correctly
- Blocked users cannot place orders
- Can manually unblock entries

---

## 📋 MEDIUM PRIORITY TASKS

### TASK 9: Complete Restaurant Filters
**Priority:** MEDIUM  
**Estimated Time:** 4 hours  
**Dependencies:** None  
**Current Status:** ⚠️ Partially implemented

**📖 Documentation:** 
- [SEO & Full-Text Search Guide](lib/Documentation/Frontend-Guides/Restaurant%20Management/07-SEO-Full-Text-Search.md) - Full-text search functions
- [Categorization System Guide](lib/Documentation/Frontend-Guides/Restaurant%20Management/08-Categorization-System.md) - Tag-based filtering  
**Backend APIs Available:** 2 SQL Functions (search) + 3 SQL Functions (categorization)

#### Subtasks:
- [ ] 9.1 - Add vendor filter dropdown
- [ ] 9.2 - Add cuisine type filter (use categorization SQL functions)
- [ ] 9.3 - Add status filter (active/inactive)
- [ ] 9.4 - Implement combined filter logic
- [ ] 9.5 - Add filter reset button
- [ ] 9.6 - Add full-text search (use SEO SQL functions)
- [ ] 9.7 - Test all filter combinations

**Files to Update:**
- `app/admin/restaurants/page.tsx`

**Acceptance Criteria:**
- All filters work independently
- Filters can be combined
- Full-text search works with ranking
- Filter state persists in URL params
- Reset button clears all filters

---

### TASK 10: Add Restaurant Wizard
**Priority:** MEDIUM  
**Estimated Time:** 2 days  
**Dependencies:** None  
**Current Status:** ❌ Not started

**📖 Documentation:** [Restaurant Onboarding System Guide](lib/Documentation/Frontend-Guides/Restaurant%20Management/10-Restaurant-Onboarding-System.md)  
**Backend APIs Available:** 9 SQL Functions + 4 Edge Functions

#### Subtasks:
- [ ] 10.1 - Design multi-step wizard flow (reference onboarding guide)
- [ ] 10.2 - Build step 1: Basic Info
- [ ] 10.3 - Build step 2: Location
- [ ] 10.4 - Build step 3: Contact
- [ ] 10.5 - Build step 4: Service Config
- [ ] 10.6 - Build step 5: Review & Submit
- [ ] 10.7 - Implement step navigation with progress tracking
- [ ] 10.8 - Add form validation per step (use SQL validation functions)
- [ ] 10.9 - Test wizard completion

**Files to Create:**
- `app/admin/restaurants/add/page.tsx`
- `components/restaurant/add-wizard/step-1-basic.tsx`
- `components/restaurant/add-wizard/step-2-location.tsx`
- `components/restaurant/add-wizard/step-3-contact.tsx`
- `components/restaurant/add-wizard/step-4-service.tsx`
- `components/restaurant/add-wizard/step-5-review.tsx`
- `components/restaurant/add-wizard/wizard-navigation.tsx`

**Acceptance Criteria:**
- Can navigate between steps
- Form validation works per step
- Can go back without losing data
- Progress tracking displays completion percentage
- Successfully creates restaurant

---

### TASK 11: Onboarding Status Dashboard
**Priority:** MEDIUM  
**Estimated Time:** 1 day  
**Dependencies:** None  
**Current Status:** ❌ Not started

**📖 Documentation:** [Onboarding Status Tracking Guide](lib/Documentation/Frontend-Guides/Restaurant%20Management/09-Onboarding-Status-Tracking.md)  
**Backend APIs Available:** 4 SQL Functions + 3 Edge Functions

#### Subtasks:
- [ ] 11.1 - Build onboarding dashboard page
- [ ] 11.2 - Create progress visualization component
- [ ] 11.3 - Add completion percentage display
- [ ] 11.4 - Implement step-by-step tracking (use SQL functions)
- [ ] 11.5 - Build admin oversight view
- [ ] 11.6 - Add onboarding API endpoints
  - GET `/api/onboarding/status/[restaurantId]` - Get onboarding status
  - PUT `/api/onboarding/status/[restaurantId]` - Update step completion
  - GET `/api/onboarding/overview` - Get all restaurant onboarding statuses
- [ ] 11.7 - Test onboarding tracking

**Files to Create:**
- `app/admin/onboarding/page.tsx`
- `app/admin/onboarding/[restaurantId]/page.tsx`
- `components/onboarding/progress-tracker.tsx`
- `components/onboarding/step-checklist.tsx`
- `app/api/onboarding/status/route.ts`
- `app/api/onboarding/status/[restaurantId]/route.ts`

**Acceptance Criteria:**
- Can view onboarding progress for all restaurants
- Completion percentage displays accurately
- Step-by-step checklist shows what's complete/incomplete
- Admin can track which restaurants need attention

---

### TASK 12: Tablet Management
**Priority:** MEDIUM  
**Estimated Time:** 1 day  
**Dependencies:** None  
**Current Status:** ❌ Not started

#### Subtasks:
- [ ] 12.1 - Build tablet list page
- [ ] 12.2 - Create tablet registration form
- [ ] 12.3 - Add tablet status tracking
- [ ] 12.4 - Implement tablet API endpoints
  - GET `/api/tablets` - List tablets
  - POST `/api/tablets` - Register tablet
  - PUT `/api/tablets/[id]` - Update tablet
  - DELETE `/api/tablets/[id]` - Deregister tablet
- [ ] 12.5 - Test tablet management

**Files to Create:**
- `app/admin/tablets/page.tsx`
- `components/tablets/tablet-form.tsx`
- `app/api/tablets/route.ts`
- `app/api/tablets/[id]/route.ts`

**Acceptance Criteria:**
- Can register new tablets
- Can view tablet status
- Can deregister tablets
- Tablet list shows restaurant assignment

---

## 💡 NICE TO HAVE TASKS

### TASK 13: Soft Delete & Recovery UI
**Priority:** LOW  
**Estimated Time:** 1 day  
**Dependencies:** None  
**Current Status:** ❌ Not started

**📖 Documentation:** [Soft Delete Infrastructure Guide](lib/Documentation/Frontend-Guides/Restaurant%20Management/02-Soft-Delete-Infrastructure.md)  
**Backend APIs Available:** 3 SQL Functions + 3 Edge Functions

#### Subtasks:
- [ ] 13.1 - Build deleted restaurants view page
- [ ] 13.2 - Create recovery dialog component
- [ ] 13.3 - Add 30-day recovery window display
- [ ] 13.4 - Implement deletion audit trail view
- [ ] 13.5 - Build soft delete API endpoints (use Edge functions from guide)
  - GET `/api/restaurants/deleted` - List deleted restaurants
  - POST `/api/restaurants/[id]/restore` - Restore deleted restaurant
  - GET `/api/restaurants/[id]/deletion-audit` - View deletion history
- [ ] 13.6 - Test soft delete and recovery workflow

**Files to Create:**
- `app/admin/restaurants/deleted/page.tsx`
- `components/restaurant/recovery-dialog.tsx`
- `components/restaurant/deletion-audit-trail.tsx`
- `app/api/restaurants/deleted/route.ts`
- `app/api/restaurants/[id]/restore/route.ts`

**Acceptance Criteria:**
- Can view all deleted restaurants
- Can restore restaurants within 30-day window
- Recovery window countdown displays accurately
- Deletion audit trail shows complete history
- Zero data loss on accidents

---

### TASK 14: Restaurant Status Audit Trail
**Priority:** LOW  
**Estimated Time:** 4 hours  
**Dependencies:** None  
**Current Status:** ❌ Not started

**📖 Documentation:** [Status Audit Trail Guide](lib/Documentation/Frontend-Guides/Restaurant%20Management/04-Status-Audit-Trail.md)  
**Backend APIs Available:** 2 SQL Functions + 1 Edge Function

#### Subtasks:
- [ ] 14.1 - Build status audit trail view page
- [ ] 14.2 - Create status history timeline component
- [ ] 14.3 - Add compliance reporting features
- [ ] 14.4 - Implement historical analytics view
- [ ] 14.5 - Build audit trail API endpoints (use SQL functions from guide)
  - GET `/api/restaurants/[id]/status-history` - Get complete status change history
  - GET `/api/restaurants/status-audit` - Get audit report for compliance
- [ ] 14.6 - Test audit trail display and reporting

**Files to Create:**
- `app/admin/restaurants/[id]/audit/page.tsx`
- `components/restaurant/status-timeline.tsx`
- `components/restaurant/audit-report.tsx`
- `app/api/restaurants/[id]/status-history/route.ts`

**Acceptance Criteria:**
- Can view complete status change history for any restaurant
- Timeline shows who changed what, when
- Compliance reports generate correctly
- Historical analytics display trends

---

### TASK 15: Restaurant Cloning
**Priority:** LOW  
**Estimated Time:** 1 day  
**Dependencies:** None  
**Current Status:** ❌ Not started

#### Subtasks:
- [ ] 15.1 - Build clone restaurant dialog
- [ ] 15.2 - Implement deep copy logic (all tabs)
- [ ] 15.3 - Add clone API endpoint
  - POST `/api/restaurants/[id]/clone`
- [ ] 15.4 - Test cloning

**Files to Create:**
- `components/restaurant/clone-dialog.tsx`
- `app/api/restaurants/[id]/clone/route.ts`

**Acceptance Criteria:**
- Can clone entire restaurant
- All settings are copied
- New restaurant has unique ID
- Cloning includes all tabs

---

### TASK 16: Advanced Analytics
**Priority:** LOW  
**Estimated Time:** 2 days  
**Dependencies:** TASK 3 (Dashboard)  
**Current Status:** ❌ Not started

#### Subtasks:
- [ ] 16.1 - Build busiest hours heatmap
- [ ] 16.2 - Add customer retention chart
- [ ] 16.3 - Create average order value trends
- [ ] 16.4 - Build restaurant comparison tool
- [ ] 16.5 - Test analytics accuracy

**Files to Create:**
- `components/dashboard/busiest-hours-heatmap.tsx`
- `components/dashboard/retention-chart.tsx`
- `components/dashboard/aov-trends.tsx`
- `components/dashboard/restaurant-comparison.tsx`

**Acceptance Criteria:**
- Charts display correct data
- Heatmap shows peak hours
- Trends are accurate

---

## 🎨 POLISH & TESTING TASKS

### TASK 17: UI/UX Refinement
**Priority:** LOW  
**Estimated Time:** 1 week  
**Dependencies:** All major features complete  
**Current Status:** ❌ Not started

#### Subtasks:
- [ ] 17.1 - Mobile responsiveness testing
- [ ] 17.2 - Loading states for all pages
- [ ] 17.3 - Error handling improvements
- [ ] 17.4 - Toast notification consistency
- [ ] 17.5 - Form validation enhancements
- [ ] 17.6 - Accessibility audit
- [ ] 17.7 - Performance optimization
- [ ] 17.8 - Cross-browser testing

---

### TASK 18: Production Preparation
**Priority:** LOW  
**Estimated Time:** 1 week  
**Dependencies:** All features complete  
**Current Status:** ❌ Not started

#### Subtasks:
- [ ] 18.1 - Security audit
- [ ] 18.2 - RLS policy review
- [ ] 18.3 - Load testing
- [ ] 18.4 - Bug fixing
- [ ] 18.5 - Documentation
- [ ] 18.6 - User training materials
- [ ] 18.7 - Production deployment
- [ ] 18.8 - Monitoring setup

---

## 📊 SUMMARY

**Total Work:** 23 Phases + Tasks  
**✅ COMPLETED:** 4 phases (Admin: Phases 1-4)  
**⏳ IN PROGRESS:** Phase 6 (Restaurant Menu Page)  
**🛒 CUSTOMER ORDERING:** 5 new phases (5-9)  
**🔧 ADMIN TASKS:** 18 remaining tasks (1-18)

**Estimated Total Time:** 12-14 weeks  
**Time Spent:** ~2-3 weeks (Admin Phases 1-4 complete)

---

### ✅ ADMIN DASHBOARD COMPLETED (Phases 1-4)

1. **Phase 1: Authentication & Layout** ✅
   - Login with MENU.CA brand logo
   - Sidebar navigation with theme toggle
   - Route protection middleware
   - User dropdown & logout

2. **Phase 2: Restaurant Management** ✅ (BIGGEST!)
   - **15 fully functional management tabs**
   - Mapbox GL JS for delivery areas
   - Image management with Supabase Storage
   - Drag-drop image reordering
   - Complete CRUD with validation
   - 15+ API routes built

3. **Phase 3: Dashboard & Analytics** ✅
   - Real-time stats (revenue, orders, restaurants, users)
   - Revenue charts (Daily/Weekly/Monthly)
   - Recent orders widget (auto-refresh)
   - Top restaurants widget

4. **Phase 4: Admin Users Management** ✅
   - Secure authentication middleware
   - User CRUD with MFA support
   - RLS bypass solution
   - Server-side bcrypt password hashing
   - E2E tested

5. **Branding** ✅
   - MENU.CA logo on login page
   - Logo in sidebar navigation

---

### 🛒 CUSTOMER ORDERING SYSTEM (NEW - Phases 5-9)

**Phase 5:** Database Setup (8 new tables) ⏳ STARTING NOW
**Phase 6:** Restaurant Menu `/r/[slug]` ⏳ IN PROGRESS
**Phase 7:** Homepage & Search 📍 (not started)
**Phase 8:** Checkout & Payment 💳 (not started)
**Phase 9:** Customer Accounts 👤 (not started)

---

### 🔧 ADMIN TASKS REMAINING (Tasks 1-18)

**Critical:** Tasks 1-2 (Database, RBAC)  
**High Priority:** Tasks 5-8 (Coupons, Franchises, Accounting, Blacklist)  
**Medium:** Tasks 9-12 (Filters, Wizard, Orders, Tablets)  
**Low:** Tasks 13-16 (Content, Email, Cloning, Analytics)  
**Polish:** Tasks 17-18 (UI/UX, Production)

---

### 📊 CURRENT PROGRESS

**Built So Far:**
- **50+ API routes** (admin dashboard)
- **60+ components** created
- **15 restaurant tabs** fully functional
- **Connected to production DB** (32K+ users, 277 restaurants)
- **Security hardened** with auth middleware
- **E2E tested** critical flows

**Next Steps (PRIORITIZED):**
1. **🛒 Phase 5** - Customer DB Setup (STARTING NOW)
2. **🛒 Phase 6** - Restaurant Menu Page `/r/[slug]` (IN PROGRESS)
3. **🛒 Phase 7** - Homepage & Search
4. **🛒 Phase 8** - Checkout & Payment
5. **🛒 Phase 9** - Customer Accounts

**Then Admin Tasks:**
- Task 5: Coupon Management
- Task 11: Order Management
- Task 7: Accounting & Statements

---

**Current Status:** Admin dashboard 36% complete, starting customer ordering system (Phases 5-9)
