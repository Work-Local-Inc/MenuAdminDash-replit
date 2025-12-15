# Menu.ca Admin Dashboard

## Overview
The Menu.ca Admin Dashboard is a Next.js 14 application designed for managing a multi-tenant restaurant ordering platform. It integrates with an existing Supabase PostgreSQL database containing live production data. The primary purpose is to streamline the administration of restaurants, orders, coupons, and user accounts, enhancing the operational efficiency of a large-scale food ordering service. Key capabilities include comprehensive restaurant and menu management, franchise oversight, and customer ordering system configuration. The business vision is to provide a robust, scalable, and intuitive platform for restaurant owners and administrators, positioning Menu.ca as a leading solution in the online food ordering market.

## User Preferences
Preferred communication style: Simple, everyday language.

## Testing & Admin Access
- **Admin test credentials**: Stored as secrets `ADMIN_TEST_EMAIL` and `ADMIN_TEST_PASSWORD`
- **Admin login path**: `/admin` (redirects to login if not authenticated)
- **Test restaurants**:
  - Econo Pizza: restaurant_id=1009 (V3 ID matches dishes)
  - Centertown Donair & Pizza: restaurant_id=131 (legacy_v1_id=255 for dishes)

## System Architecture

### Frontend
-   **Framework**: Next.js 14 (App Router, TypeScript, Server & Client Components).
-   **UI/UX**: Tailwind CSS, shadcn/ui (Radix UI), `next-themes` for dark/light mode.
-   **Authentication**: Supabase Auth (email/password), middleware-based route protection, server-side session management.
-   **State Management**: React Query for server state, React Hook Form with Zod for form management, Zustand for customer-facing shopping cart.

### Backend & Data Layer
-   **Database**: Supabase PostgreSQL, with `public` and `menuca_v3` schemas. `menuca_v3` is critical for all restaurant platform data, requiring `db: { schema: 'menuca_v3' }` configuration for Supabase clients accessing restaurant data.
-   **Data Operations**: Primarily SQL Functions for reads and Edge Functions for writes.
-   **Admin Users**: Custom tables with RLS bypass via service role client for granular control.

### Core Features
-   **Restaurant Management**: Status, online ordering toggle, contact, delivery area configuration.
-   **Menu Management**:
    -   **Unified Menu Builder**: Single interface for menu editing with a grid layout for responsive dish cards, image uploads, and inline editing.
    -   **Modifier Groups Architecture**: True linking system for global modifier groups, enabling automatic propagation of updates. Dishes inherit modifiers from categories, with options to break inheritance.
    -   **Unified Modifier Manager**: Modifier-first workflow for bulk management, combining simple and combo modifiers in a catalog grid with view modes (Grid/List) and status filtering.
    -   **Size & Price Variants**: Integrated management within the Edit Dish dialog, supporting unlimited variants, inline editing, and drag-and-drop reordering.
    -   **Drag-and-Drop**: For reordering categories and dishes.
    -   **Bulk Operations**: Multi-select dishes for batch actions.
-   **Franchise Management**: Hierarchical system for linking restaurants, bulk updates, and analytics.
-   **Categorization System**: Cuisine and tag-based discovery.
-   **Customer Ordering System**:
    -   **Authentication**: Separate Supabase Auth for customers, including Google OAuth.
    -   **Order Types**: Delivery vs. Pickup with contextual fees and scheduling based on `restaurant_schedules`.
    -   **Delivery Area Fee Calculation**: Uses `restaurant_delivery_areas` for zone-based fees.
    -   **Checkout Flow**: Multi-step process with Zustand cart, Google Places Autocomplete for addresses, and Stripe payment.
    -   **Account Pages**: Customer dashboard for order history, address management, and profile editing.
    -   **Security**: Server-side validation for prices, amounts, quantities, payment replay protection, restaurant ownership, user authentication, and webhook signature verification.
    -   **Default Branding System**: Consistent default branding (e.g., Menu.ca red, default banners, icons) for restaurants without custom configurations.

### UI/UX Decisions
-   **Color Schemes**: Uses `next-themes` for dark/light mode.
-   **Templates**: Utilizes shadcn/ui components for a consistent design system.
-   **Design Approaches**: Responsive design with Tailwind CSS.

### Technical Implementations
-   **ID Mapping**: Critical handling of `combo_groups.restaurant_id` (V3 IDs) vs. `dishes.restaurant_id` (using `legacy_v1_id`) via API.
-   **Terminology**: Database "template" is always "modifier" or "modifier group" in UI/code.
-   **Combo Modifier Hierarchy**: `combo_groups` → `combo_group_sections` → `combo_modifier_groups` → `combo_modifiers`.
-   **Per-Item Special Instructions**: Implemented for allergy safety, storing notes at the item level in the cart and database, and displaying them prominently on printed receipts via external printer software.
-   **Modifier Filtering**: Customer-facing dish modals filter simple modifiers by `dish_id` and combo modifiers by `combo_modifier_groups.is_selected = true` (repurposed to mean "available/visible").

## External Dependencies

### Backend Services
-   **Supabase**: PostgreSQL database, authentication, real-time subscriptions.

### UI Libraries
-   **Radix UI**: Headless component primitives.
-   **Lucide React**: Icon library.
-   **Recharts**: Charting library.

### Development Tools
-   **TypeScript**: Type safety.
-   **Tailwind CSS**: Utility-first styling.
-   **class-variance-authority**: Type-safe component variants.
-   **clsx** + **tailwind-merge**: Class name composition.

### Fonts
-   **Inter**: Primary sans-serif font.
-   **JetBrains Mono**: Monospace font.

### Integrations
-   **Mapbox GL JS**: Delivery area drawing.
-   **@hello-pangea/dnd**: Drag-and-drop reordering.
-   **Stripe**: Payment processing.
-   **Google Places API**: Address autocomplete and verification.

## Troubleshooting & Debugging Notes

### Stripe Key Mismatch (CRITICAL - Nov 2025)
**Problem:** Payment intents created with TEST key but retrieved with LIVE key = "No such payment_intent" error.

**Lesson Learned:** When debugging Stripe issues, ALWAYS audit ALL Stripe files first:
```bash
grep -r "new Stripe\|STRIPE_SECRET_KEY" app/api --include="*.ts"
```

**All Stripe endpoints must use the same key priority:**
- `app/api/customer/create-payment-intent/route.ts`
- `app/api/customer/orders/route.ts`
- `app/api/customer/signup/route.ts`
- `app/api/customer/stripe-webhook/route.ts`

**Current configuration (TEST mode):**
```typescript
const stripeSecretKey = process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY
```

### Table & Column Renames (Dec 2025)
- `restaurant_service_configs` → `delivery_and_pickup_configs`
- `restaurant_delivery_fees` → `restaurant_distance_based_delivery_fees`
- `min_order_value` → `delivery_min_order` (in `restaurant_delivery_areas`)

### Dual Modifier Validation (Dec 2025)
Order validation supports BOTH modifier types:
1. **Simple Modifiers**: Validated via `modifier_group.dish_id === item.dishId`
2. **Combo Modifiers**: Validated via `dish_combo_groups` junction table hierarchy

### Per-Item Special Instructions & Allergy Safety (Dec 2025)
Per-item notes flow: Dish Modal → Zustand Cart → Checkout API → Database (orders.items JSONB) → Tablet/Printer API → Printed Receipt

**ALLERGY SAFETY FEATURE:** External printer software auto-detects "allergy" keyword in notes and generates prominent **"!! ALLERGY !!"** alert on printed orders.

### Modifier Filtering Fix (Dec 2025)
**Bug:** Combo-modifiers API returned ALL modifier groups instead of dish-specific ones.

**Fix:** Added `.eq('is_selected', true)` filter to `combo_modifier_groups` query.

**Key insight:** `is_selected` column is repurposed to mean "available/visible" (not pre-selection). This is because `combo_modifier_groups` lacks an `is_active` column.

**File:** `app/api/customer/dishes/[id]/combo-modifiers/route.ts` (line 109)

### Modifier Quantity Steppers (Dec 2025)
**Feature:** Customers can add multiple of the same modifier (e.g., 5 Creamy Garlic dips) using +/- quantity buttons.

**UI Logic:**
- `max_selections === 1`: Radio buttons (single choice)
- `max_selections !== 1` (including 0 = unlimited): Quantity steppers with +/- buttons

**Database Requirement:** For dips/sauces to show quantity steppers, the `modifier_groups.max_selections` column must be set to 0 (unlimited) or > 1. If set to 1, radio buttons are shown instead.

**Cart Integration:** `CartModifier` now includes `quantity` field. Price calculation: `m.price * (m.quantity || 1)`

**Files:**
- `components/customer/dish-modal.tsx` (quantity stepper UI + handleModifierQuantityChange)
- `lib/stores/cart-store.ts` (CartModifier type, calculateSubtotal, generateCartItemId)

### Phone Number on Orders (Dec 2025)
**Requirement:** All orders (delivery and pickup) require customer phone for restaurant contact.

**Implementation:**
- Guests: Phone field required with min 7 character validation
- Logged-in users: If profile has no/invalid phone, inline phone input shown
- Phone priority: Inline entry > Profile phone > Guest phone field

**Printer API:** Full phone number passed (unmasked) to tablet/printer API at `customer.phone`

**File:** `app/api/tablet/orders/route.ts` (line 148)

### Combo Modifier Free Items (Dec 2025)
**Feature:** Combo sections with `free_items > 0` allow N items for free before charging.

**Implementation:**
- `CartModifier.paidQuantity`: Tracks how many of the selected quantity are actually paid (after free items applied)
- Cart subtotal calculation uses `paidQuantity` instead of `quantity` for modifier pricing
- Synchronous atomic state updates prevent race conditions when adjusting quantities

**Free Items Logic:**
- First N items selected in a section are free (where N = `section.free_items`)
- Example: If `free_items=3` and customer adds 2 pepperoni + 2 mushroom = 4 total → first 3 free, 4th is paid
- When items are deselected, remaining items shift into free slots automatically

**Files:**
- `components/customer/dish-modal.tsx` (handleComboModifierQuantityChange, handleComboModifierToggle)
- `lib/stores/cart-store.ts` (calculateSubtotal uses paidQuantity)

### Duplicate Modifier Consolidation (Dec 2025)
**Problem:** When same modifier is selected multiple times (e.g., pepperoni as free topping + pepperoni as paid topping), cart and kitchen receipt showed separate lines. Kitchen couldn't tell it's "double pepperoni."

**Solution:** Consolidate duplicate modifiers (same name + placement) in both cart display and tablet/printer API.

**Display Logic:**
- If same modifier appears multiple times with same placement, combine into single line
- Show quantity: "Pepperoni x2" instead of two separate "Pepperoni" lines
- Price displays sum of paid quantities: "(+$2.50)" for 1 free + 1 paid at $2.50

**Files:**
- `components/customer/cart-drawer.tsx` (consolidation logic in modifier rendering)
- `app/api/tablet/orders/route.ts` (consolidation before sending to printer, includes `quantity` field)

### Logged-in User Name on Kitchen Receipts (Dec 2025)
**Problem:** When logged-in users placed orders, the kitchen receipt sometimes showed "Guest Customer" instead of their actual name (e.g., "Tim").

**Root Cause:** The checkout relied on `delivery_address.name` being populated from the user's profile. If `first_name` and `last_name` were empty in the profile, it would fall back to "Guest Customer" in the order creation.

**Solution:** Order creation APIs now look up the user's name directly from the `users` table when:
1. `user_id` exists (logged-in user)
2. `delivery_address.name` is empty

**Name Resolution Priority:**
1. `delivery_address.name` (from checkout form)
2. `first_name + last_name` from users table
3. Email prefix (e.g., "tim" from "tim@example.com")
4. "Customer" as final fallback

**Files:**
- `app/api/customer/orders/route.ts` (credit card orders)
- `app/api/customer/orders/cash/route.ts` (cash/debit orders)