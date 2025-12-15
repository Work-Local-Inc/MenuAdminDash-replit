# Menu.ca Admin Dashboard

## Overview
The Menu.ca Admin Dashboard is a Next.js 14 application for managing a multi-tenant restaurant ordering platform, integrated with a Supabase PostgreSQL database. Its purpose is to streamline the administration of restaurants, orders, coupons, and user accounts, enhancing operational efficiency. Key capabilities include comprehensive restaurant and menu management, franchise oversight, and customer ordering system configuration. The business vision is to provide a robust, scalable, and intuitive platform, positioning Menu.ca as a leading solution in the online food ordering market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: Next.js 14 (App Router, TypeScript, Server & Client Components).
-   **UI/UX**: Tailwind CSS, shadcn/ui (Radix UI), `next-themes` for dark/light mode.
-   **Authentication**: Supabase Auth (email/password), middleware-based route protection.
-   **State Management**: React Query for server state, React Hook Form with Zod for forms, Zustand for customer-facing shopping cart.

### Backend & Data Layer
-   **Database**: Supabase PostgreSQL (`public` and `menuca_v3` schemas). `menuca_v3` is critical for restaurant platform data, requiring specific Supabase client configuration.
-   **Data Operations**: Primarily SQL Functions for reads and Edge Functions for writes.
-   **Admin Users**: Custom tables with RLS bypass for granular control.

### Core Features
-   **Restaurant Management**: Status, online ordering toggle, contact, delivery area configuration.
-   **Menu Management**:
    -   **Unified Menu Builder**: Single interface for menu editing with grid layout, image uploads, and inline editing.
    -   **Modifier Groups Architecture**: True linking system for global modifier groups, allowing inheritance and automatic propagation of updates.
    -   **Unified Modifier Manager**: Modifier-first workflow for bulk management of simple and combo modifiers.
    -   **Size & Price Variants**: Integrated management within dish editing.
    -   **Drag-and-Drop**: For reordering categories and dishes.
    -   **Bulk Operations**: Multi-select dishes for batch actions.
-   **Franchise Management**: Hierarchical system for linking restaurants and bulk updates.
-   **Categorization System**: Cuisine and tag-based discovery.
-   **Customer Ordering System**:
    -   **Authentication**: Separate Supabase Auth for customers, including Google OAuth.
    -   **Order Types**: Delivery vs. Pickup with contextual fees and scheduling.
    -   **Delivery Area Fee Calculation**: Zone-based fees.
    -   **Checkout Flow**: Multi-step process with Zustand cart, Google Places Autocomplete, and Stripe payment.
    -   **Account Pages**: Customer dashboard for order history, address management.
    -   **Security**: Server-side validation for prices, quantities, payments, and user authentication.
    -   **Default Branding System**: Consistent branding for restaurants without custom configurations.
    -   **Per-Item Special Instructions**: Stores notes at the item level for allergy safety, displayed prominently on receipts.
    -   **Modifier Quantity Steppers**: Allows selection of multiple units of a modifier.
    -   **Combo Modifier Free Items**: Supports free items within combo sections.
    -   **Duplicate Modifier Consolidation**: Consolidates duplicate modifiers for clearer display and kitchen receipts.
    -   **Special Combo Selections**: Allows customers to choose full dishes as part of a combo.

### UI/UX Decisions
-   **Color Schemes**: Dark/light mode support via `next-themes`.
-   **Templates**: Utilizes shadcn/ui components for a consistent design.
-   **Design Approaches**: Responsive design with Tailwind CSS.

### Technical Implementations
-   **ID Mapping**: Handles `combo_groups.restaurant_id` (V3 IDs) vs. `dishes.restaurant_id` (legacy_v1_id) via API.
-   **Terminology**: "Template" in database translates to "modifier" or "modifier group" in UI/code.
-   **Combo Modifier Hierarchy**: `combo_groups` → `combo_group_sections` → `combo_modifier_groups` → `combo_modifiers`.

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