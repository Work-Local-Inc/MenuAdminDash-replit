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
    - **Unified Menu Builder (`/admin/menu/builder`)**: Single unified view with RestaurantMenu as main editing interface mirroring customer-facing menu design.
    - **Grid Layout**: Responsive dish cards (1/2/3 columns), hover-triggered controls, image upload with drag-drop support.
    - **Image Upload**: Dish images stored in Supabase storage with preview, drag-drop upload, and removal capabilities.
    - **Modifier Groups Architecture** (Global Library System - November 2025):
        - **Status**: ✅ Production-ready UI/API layer complete, database schema ready (migrations pending)
        - **Architecture Philosophy**: TRUE LINKING (not cloning) - One source of truth for modifier updates that propagate automatically
        - **Global Modifier Groups Library** (`/admin/menu/modifier-groups`):
            - Creates modifier groups with `course_id = NULL` (global, not tied to any category)
            - Groups are reusable across all categories and restaurants
            - Example: "Sizes" group with Small/Medium/Large options
            - Updates to library groups automatically propagate to all associated categories
            - Full CRUD UI: Create/Edit/Delete modifier groups with multiple modifiers
            - API: `/api/menu/modifier-groups` (GET/POST/PATCH/DELETE)
        - **Category Association** (Menu Builder):
            - Categories link to library groups via `library_template_id` reference (NO cloning)
            - `CategoryModifierAssociation` component provides checkbox UI in menu builder
            - Association creates a category template that REFERENCES the library group
            - All existing dishes in category automatically inherit the linked group
            - API: `/api/menu/category-modifier-templates` (POST/DELETE)
        - **Dish Inheritance**:
            - Dishes inherit modifiers from their category's associated library groups
            - `DishModifierPanel` shows "Inherited" vs "Custom" badges
            - Breaking inheritance creates custom dish-specific modifiers
            - "Break Inheritance" button with confirmation dialog
            - API: `/api/menu/break-inheritance` (POST)
        - **Auto-Apply on Dish Creation**:
            - New dishes automatically inherit all category modifier templates
            - Happens during POST to `/api/menu/dishes/route.ts`
            - Enhanced error handling logs template application success/failure
        - **Database Schema**:
            - `course_modifier_templates`: Library groups (course_id = NULL) AND category associations (course_id = X, library_template_id = Y)
            - `course_template_modifiers`: Modifier options within library groups
            - `modifier_groups`: Dish-level groups with course_template_id for inheritance tracking
            - `dish_modifiers`: Custom modifiers (only when inheritance is broken)
        - **⚠️ MANUAL MIGRATION REQUIRED**:
            - **Migration 009**: Make `course_id` nullable, add `library_template_id` column
            - **Migration 010**: Fix `apply_template_to_dish()` function to stop cloning modifiers
            - **Data Cleanup**: Run `tsx scripts/migrate-to-library-linking.ts` to remove legacy cloned modifiers
            - **Status Check**: Run `tsx lib/supabase/check-migrations.ts` to verify migrations
            - **Runtime Guard**: System blocks new associations until migrations confirmed (503 error with clear message)
            - **Defensive Fallbacks**: Menu builder gracefully handles mixed state (pre/post migration) without breaking customer menus
        - **Documentation**: See `LIBRARY_LINKING_FIX_SUMMARY.md` for complete implementation details, verification steps, and troubleshooting
    - **Drag-and-Drop**: Single DragDropContext for categories and nested dishes, reordering within categories.
    - **Bulk Operations**: Multi-select dishes with toolbar for batch actions (mark active/inactive, delete).
    - **Editor Controls**: Hover overlays on dishes (drag/edit/delete), secondary actions bar (price/active/modifiers).
    - **Inline Editing**: Click-to-edit prices, dish modifiers accessible via prominent button with count badge.
    - **Size & Price Variants Management** (November 2025):
        - **Status**: ✅ Production-ready, fully tested and architect-approved
        - **Purpose**: Manage dish pricing with size variants (e.g., Small/Medium/Large) for flexible menu pricing
        - **Location**: Integrated into Edit Dish dialog within Menu Builder (`/admin/menu/builder`)
        - **Database**: Uses `dish_prices` table in `menuca_v3` schema
        - **API Endpoint**: `/api/menu/dish-prices` (GET/POST/PATCH/DELETE)
        - **Features**:
            - Add unlimited size variants per dish (e.g., "Small (10\")", "Medium (12\")", "Large (15\")")
            - Edit variant names and prices inline
            - Drag-and-drop reordering with display_order persistence
            - Delete variants with confirmation
            - Real-time UI sync with server data after mutations
            - State management prevents edit overwrites during drag operations (isReordering flag)
        - **Security**: Multi-tenant restaurant ownership validation on all mutations (POST/PATCH/DELETE)
        - **Architecture**:
            - `SizeVariantManager` component handles all CRUD operations
            - React Query hooks with authenticated `apiRequest` helper
            - Toast notifications for success/error feedback
            - Optimistic UI updates with server reconciliation
        - **Customer-Facing**: Size variants display as dropdown selection in customer menu, prices update dynamically
        - **Shortcut Access**: "Price" button on dish cards shows variant count badge for quick identification
        - **Integration**: Separate from modifier groups system (size selection happens BEFORE modifier customization)
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
- **Order Type Selection** (November 2025):
    - **Status**: ✅ Production-ready, architect-approved
    - **Purpose**: Industry-standard DoorDash/Uber Eats style order type selection (Delivery vs Pickup)
    - **Components**:
        - `OrderTypeSelector`: Tabbed interface with Delivery/Pickup toggle, contextual fee copy
        - `PickupTimeSelector`: ASAP vs Scheduled selection with 30-minute time slots
    - **Cart Store Updates**:
        - `orderType`: 'delivery' | 'pickup' (default: 'delivery')
        - `pickupTime`: { type: 'asap' | 'scheduled', date?: string, timeSlot?: string }
        - `getEffectiveDeliveryFee()`: Returns 0 for pickup orders, actual fee for delivery
        - `restaurantAddress`: Stored for pickup display
    - **Checkout Flow**:
        - Delivery: Address form → Delivery zone validation → Payment
        - Pickup: Restaurant address display → Time selection → Guest email (if needed) → Payment
    - **Order Summary**: Shows "Pickup: Free" (green) for pickup, delivery fee for delivery
    - **Payment Metadata**: Includes `order_type`, `pickup_time`, `restaurant_address` for order processing
    - **Test IDs**: `button-order-type-delivery`, `button-order-type-pickup`, `button-pickup-asap`, `button-pickup-schedule`
- **Checkout Flow**: Multi-step process with Zustand-based cart, address confirmation (Google Places Autocomplete), and Stripe payment.
- **Address Management**: CRUD for delivery addresses (`user_delivery_addresses`), fraud prevention with verified addresses.
- **Payment Processing**: Stripe integration for secure payments, server-side payment intent creation, `stripe_customer_id` linkage, and `payment_transactions` tracking (CAD).
- **Order Management**: Order creation post-payment, order history, status tracking (`order_status_history`).
- **Account Pages**: Dashboard (`/customer/account`) for orders, addresses, and profile management.
- **Security**: Server-side price and amount validation, payment replay protection, restaurant ownership validation, quantity validation, user authentication, webhook signature verification, OAuth email verification.

## Known Issues

### NEXT_REDIRECT Hook Warning (Non-Blocking)
- **Issue**: "Invalid hook call" warnings appear in browser console during Next.js server-side redirects (e.g., accessing invalid restaurant slugs).
- **Trigger**: Occurs when RestaurantPage triggers `redirect('/')` for missing restaurants.
- **Impact**: Warning only, does not affect functionality. Customer pages and admin features work correctly.
- **Root Cause**: Zustand cart store hook interaction during Next.js SSR redirect path. Cart store has SSR-safe storage implementation but warning persists.
- **Status**: Documented for future resolution. Does not block production deployment.
- **Workaround**: None needed. Warning is cosmetic and only visible in development console.

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