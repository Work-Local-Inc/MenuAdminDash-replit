# Menu.ca Admin Dashboard - Developer Handoff

> **Last Updated:** January 28, 2026  
> **Purpose:** Comprehensive onboarding guide for new developers

---

## 1. Architecture

### Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Next.js 14 | App Router, TypeScript, Server & Client Components |
| **Frontend** | React 18, Tailwind CSS, shadcn/ui | Radix UI primitives, Lucide icons |
| **State Management** | React Query (TanStack Query v5) | Server state caching |
| **Forms** | React Hook Form + Zod | Validation schemas |
| **Cart State** | Zustand | Customer-facing shopping cart |
| **Authentication** | Supabase Auth | Email/password, Google OAuth |
| **Database** | Supabase PostgreSQL | External hosted (NOT Replit DB) |
| **Payments** | Stripe | Test/Live mode toggle per restaurant |
| **Maps** | Mapbox GL JS | Delivery area drawing |
| **Email** | Resend | Transactional emails |
| **Drag & Drop** | @hello-pangea/dnd | Menu item reordering |

### Folder Structure

```
├── app/                      # Next.js App Router
│   ├── admin/                # Admin dashboard pages
│   │   ├── dashboard/        # Main admin dashboard
│   │   ├── restaurants/      # Restaurant management
│   │   ├── menu/             # Menu builder
│   │   ├── promotions/       # Deals, coupons, analytics
│   │   ├── orders/           # Order management
│   │   └── users/            # User management (Super Admin only)
│   ├── api/                  # API routes (Next.js Route Handlers)
│   │   ├── admin/            # Admin-specific APIs
│   │   ├── restaurants/      # Restaurant CRUD APIs
│   │   ├── orders/           # Order APIs
│   │   └── customer/         # Customer-facing APIs
│   ├── (auth)/               # Auth pages (login, logout)
│   ├── (public)/             # Public customer-facing pages
│   │   └── [slug]/           # Restaurant ordering pages
│   ├── globals.css           # Global styles + Tailwind
│   └── layout.tsx            # Root layout
│
├── components/               # React components
│   ├── ui/                   # shadcn/ui base components
│   ├── admin/                # Admin-specific components
│   ├── customer/             # Customer ordering components
│   ├── restaurant/           # Restaurant management tabs
│   └── app-sidebar.tsx       # Main admin sidebar navigation
│
├── lib/                      # Utilities and business logic
│   ├── supabase/             # Supabase client configs
│   │   ├── admin.ts          # Service role client (server-side)
│   │   ├── client.ts         # Anon key client (client-side)
│   │   └── queries.ts        # Shared query functions
│   ├── auth/                 # Authentication helpers
│   │   └── admin-check.ts    # Admin verification (verifyAdminAuth)
│   ├── hooks/                # Custom React hooks
│   ├── api/                  # API client functions
│   ├── validation/           # Zod validation schemas
│   ├── rbac.ts               # Role-based access control helpers
│   └── utils.ts              # General utilities
│
├── hooks/                    # Top-level hooks
│   ├── use-admin-user.ts     # Current admin user info
│   └── use-admin-restaurants.ts # Restaurant permissions
│
├── types/                    # TypeScript types
│   └── supabase-database.ts  # Database type definitions
│
├── middleware.ts             # Next.js middleware (auth, subdomains)
├── replit.md                 # Project documentation (keep updated!)
└── AI-AGENTS-START-HERE/     # AI agent documentation
```

### How It Connects to Menu.ca Platform

1. **Supabase PostgreSQL**: All data lives in an external Supabase project (`nthpbtdjhhnwfxqsxbvy.supabase.co`)
2. **menuca_v3 Schema**: Primary schema for restaurant platform data. Always use `.schema('menuca_v3')` when querying
3. **Edge Functions**: Some writes use Supabase Edge Functions (with direct DB fallbacks when they fail)
4. **Subdomain Routing**: Supports branded URLs like `restaurant-slug.menu.ca` for customer ordering
5. **API Base URL Helper**: `getApiBaseUrl()` ensures API calls route correctly from subdomains

---

## 2. Current State

### Working Features

| Feature | Status | Notes |
|---------|--------|-------|
| Admin Authentication | ✅ Working | Email/password via Supabase Auth |
| Restaurant Management | ✅ Working | Status, contacts, locations, delivery areas |
| Menu Builder | ✅ Working | Dishes, modifiers, combos, categories |
| Order Management | ✅ Working | View, status updates |
| Promotional Deals | ✅ Working | Create, edit, item targeting |
| Coupon System | ✅ Working | Tiered discounts, usage limits, validation |
| Customer Ordering | ✅ Working | Cart, checkout, Stripe payments |
| RBAC System | ✅ Working | Super Admin vs Restaurant Admin separation |
| Bilingual Support | ✅ Working | EN/FR for deals and coupons |
| Subdomain Routing | ✅ Working | Branded restaurant URLs |

### In Progress / Needs Attention

| Item | Status | Notes |
|------|--------|-------|
| Contact Edge Functions | ⚠️ Fallback Mode | `update-restaurant-contact` Edge Function fails; using direct DB fallback |
| Admin Profile Updates | 🔧 Needs Implementation | See `attached_assets/ADMIN_PROFILE_UPDATE_HANDOFF_*.md` for details |
| Test/Live Stripe Toggle | ⚠️ Needs Verification | Per-restaurant payment mode switching |

### Known Bugs / Tech Debt

1. **Edge Function Failures**: Some Supabase Edge Functions return non-2xx status codes. All affected routes have direct DB fallbacks implemented.

2. **Browserslist Warning**: `caniuse-lite` data is 15 months old. Run `npx update-browserslist-db@latest` to update.

3. **Legacy ID Mapping**: Some tables use V3 IDs while others use legacy_v1_id. The `combo_groups.restaurant_id` uses V3 IDs, but `dishes.restaurant_id` uses legacy_v1_id.

4. **Duplicate Schema Files**: Some `.md` files have ` 2.md` duplicates from copy operations.

---

## 3. Data

### Database Type and Location

| Property | Value |
|----------|-------|
| **Type** | Supabase PostgreSQL (Neon-backed) |
| **Location** | External (NOT Replit DB) |
| **Project URL** | `https://nthpbtdjhhnwfxqsxbvy.supabase.co` |
| **Primary Schema** | `menuca_v3` |
| **Secondary Schema** | `public` |

**CRITICAL**: Always use `.schema('menuca_v3')` when querying restaurant platform tables.

### Key Tables (menuca_v3 schema)

| Table | Purpose |
|-------|---------|
| `restaurants` | Restaurant master data |
| `restaurant_locations` | Physical locations |
| `restaurant_contacts` | Contact information (primary source) |
| `restaurant_domains` | Subdomain configuration |
| `dishes` | Menu items |
| `dish_prices` | Size/price variants |
| `courses` | Menu categories |
| `modifiers` | Modifier items |
| `modifier_groups` | Modifier groupings |
| `combo_groups` | Combo meal configurations |
| `orders` | Customer orders |
| `order_items` | Order line items |
| `promotional_deals` | Promotional deals |
| `promotional_coupons` | Coupon codes |
| `coupon_usage_log` | Coupon redemption tracking |
| `admin_users` | Admin user accounts |
| `admin_user_restaurants` | Admin-to-restaurant assignments |
| `admin_roles` | Role definitions (1=Super Admin, 2=Restaurant Admin) |
| `users` | Customer accounts |
| `user_delivery_addresses` | Customer delivery addresses |

### External APIs

| Service | Purpose | Auth Method |
|---------|---------|-------------|
| Supabase | Database, Auth, Edge Functions | Service Role Key / Anon Key |
| Stripe | Payment processing | Secret Key (test/live modes) |
| Mapbox | Delivery area maps | Public token |
| Google Places | Address autocomplete | API Key |
| Resend | Email sending | API Key |
| RestoZone | Third-party delivery provider | Per-restaurant config |

---

## 4. Deployment

### How It Runs on Replit

1. **Workflow**: `Start application` runs `npm run dev` which starts Next.js on port 5000
2. **Port Binding**: Frontend binds to `0.0.0.0:5000` (required for Replit)
3. **Auto-restart**: Workflows automatically restart after package installation

### Environment Variables (Secrets)

These must be configured in Replit Secrets:

| Secret | Purpose | Required |
|--------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | ✅ Yes |
| `SUPABASE_DB_URL` | Direct database connection string | ✅ Yes |
| `SESSION_SECRET` | Session encryption key | ✅ Yes |
| `STRIPE_SECRET_KEY` | Live Stripe secret key | ⚠️ For live payments |
| `VITE_STRIPE_PUBLIC_KEY` | Live Stripe publishable key | ⚠️ For live payments |
| `TESTING_STRIPE_SECRET_KEY` | Test Stripe secret key | ⚠️ For test payments |
| `TESTING_VITE_STRIPE_PUBLIC_KEY` | Test Stripe publishable key | ⚠️ For test payments |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public access token | ⚠️ For maps |
| `GOOGLE_API_KEY` | Google Places API key | ⚠️ For address autocomplete |
| `RESEND_API_KEY` | Resend email API key | ⚠️ For emails |
| `RESEND_FROM_EMAIL` | Sender email address | ⚠️ For emails |

### Important Notes

- **Never expose `SUPABASE_SERVICE_ROLE_KEY`** - only use server-side
- Stripe keys must match payment mode (test keys for test mode, live keys for live mode)
- Some secrets are auto-populated by Replit (REPLIT_DOMAINS, REPL_ID, etc.)

---

## 5. Priorities & Blockers

### Current Priorities

1. **Admin Profile Self-Update**: Allow Restaurant Admins to update their own email/password/phone
   - Documentation provided in `attached_assets/ADMIN_PROFILE_UPDATE_HANDOFF_*.md`
   - Use Supabase `auth.updateUser()` for client-side updates

2. **Edge Function Reliability**: Some Supabase Edge Functions are failing
   - Current workaround: Direct DB fallbacks implemented
   - Long-term: Debug Edge Functions in Supabase dashboard

3. **RBAC Completeness**: Ensure all API routes properly check role permissions
   - Pattern: `verifyAdminAuth(request)` returns `{ user, adminUser }` with `{ id, role_id }`
   - Super Admin = role_id 1, Restaurant Admin = role_id 2

### Blockers / Pain Points

1. **Supabase Edge Function Debugging**: Limited visibility into why Edge Functions fail
   - Check Supabase dashboard logs for details
   - Always implement direct DB fallback as backup

2. **Schema Documentation**: TypeScript types in `types/supabase-database.ts` may not match actual DB schema
   - Verify against Supabase SQL editor when unsure

3. **ID Mapping Complexity**: Different tables use different ID systems
   - `combo_groups.restaurant_id` = V3 IDs
   - `dishes.restaurant_id` = legacy_v1_id
   - Always check which ID type a table expects

---

## 6. Quick Reference

### Common Patterns

```typescript
// Verify admin auth in API routes
const { user, adminUser } = await verifyAdminAuth(request)
const isSuperAdmin = adminUser?.role_id === 1

// Query menuca_v3 schema
const { data, error } = await supabase
  .schema('menuca_v3')
  .from('restaurants')
  .select('*')

// React Query with proper invalidation
queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] })
```

### Important Files to Read First

1. `replit.md` - Project overview and recent changes
2. `lib/auth/admin-check.ts` - Admin authentication logic
3. `lib/rbac.ts` - Role-based access control helpers
4. `types/supabase-database.ts` - Database type definitions
5. `middleware.ts` - Auth and subdomain routing

### Test Accounts

Ask the project owner for test credentials. Admin test email/password are stored as secrets (`ADMIN_TEST_EMAIL`, `ADMIN_TEST_PASSWORD`).

---

## 7. Getting Started

1. **Review this document** and `replit.md`
2. **Check Replit Secrets** - ensure all required env vars are set
3. **Start the workflow** - `Start application` runs `npm run dev`
4. **Login to admin** - Navigate to `/login` and use test credentials
5. **Explore the dashboard** - `/admin/dashboard`
6. **Check the Supabase dashboard** - For database and Edge Function debugging

---

*Questions? Check the `AI-AGENTS-START-HERE/` directory for additional context, or review the extensive documentation in `lib/Documentation/`.*
