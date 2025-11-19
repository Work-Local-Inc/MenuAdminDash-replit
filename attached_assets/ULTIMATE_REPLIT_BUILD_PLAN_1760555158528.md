# 🚀 MENU.CA V3 - ULTIMATE REPLIT BUILD PLAN
**The most detailed admin dashboard build plan ever created**

---

## 🎯 **PROJECT OVERVIEW**

**What We're Building:**
A modern, multi-tenant restaurant ordering platform admin dashboard for 74-500 restaurants, 32,000+ customers, and millions in annual orders.

**Tech Stack:**
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Database:** Supabase PostgreSQL (menuca_v3 schema)
- **Styling:** TailwindCSS + shadcn/ui components
- **Auth:** Supabase Auth + Row Level Security
- **Forms:** React Hook Form + Zod validation
- **State:** Zustand (client state) + React Query (server state)
- **Maps:** Mapbox GL JS (delivery areas)
- **Charts:** Recharts
- **File Upload:** Supabase Storage
- **PDF Generation:** jsPDF or Puppeteer

**Scope:**
- **168 features** across 11 major sections
- **Master Admin Dashboard** (platform-wide control)
- **Restaurant Owner Portal** (per-restaurant management)
- **15 new database tables** to create
- **74 existing tables** to use
- **3 user roles** (Master Admin, Restaurant Owner, Staff)

---

## 📂 **PROJECT STRUCTURE**

```
menu-ca-admin/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx              # Login page
│   │   └── layout.tsx                # Auth layout (centered)
│   ├── (master-admin)/
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Master admin dashboard
│   │   ├── restaurants/
│   │   │   ├── page.tsx              # Restaurant list
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx          # Restaurant detail
│   │   │   │   └── edit/
│   │   │   │       ├── page.tsx      # Edit restaurant (tab container)
│   │   │   │       └── [tab]/
│   │   │   │           └── page.tsx  # Individual edit tabs
│   │   │   └── add/
│   │   │       └── page.tsx          # Add restaurant wizard
│   │   ├── users/
│   │   │   ├── page.tsx              # Admin user list
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Edit admin user
│   │   ├── coupons/
│   │   │   ├── page.tsx              # Global coupons
│   │   │   └── email/
│   │   │       └── page.tsx          # Email coupons
│   │   ├── franchises/
│   │   │   ├── page.tsx              # Franchise list
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Franchise details
│   │   ├── accounting/
│   │   │   ├── statements/
│   │   │   │   └── page.tsx          # Generate statements
│   │   │   ├── commissions/
│   │   │   │   └── page.tsx          # Commission manager
│   │   │   └── vendor-reports/
│   │   │       └── page.tsx          # Vendor reports
│   │   ├── blacklist/
│   │   │   └── page.tsx              # Blacklist management
│   │   ├── tablets/
│   │   │   └── page.tsx              # Tablet management
│   │   ├── content/
│   │   │   ├── cities/
│   │   │   │   └── page.tsx          # Cities
│   │   │   ├── cuisines/
│   │   │   │   └── page.tsx          # Cuisine types
│   │   │   └── tags/
│   │   │       └── page.tsx          # Restaurant tags
│   │   └── layout.tsx                # Master admin layout (sidebar)
│   ├── (restaurant-owner)/
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Restaurant owner dashboard
│   │   ├── menu/
│   │   │   ├── page.tsx              # Menu management
│   │   │   └── [dishId]/
│   │   │       └── page.tsx          # Edit dish
│   │   ├── deals/
│   │   │   └── page.tsx              # Deals & promotions
│   │   ├── orders/
│   │   │   ├── page.tsx              # Order management
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Order detail
│   │   ├── analytics/
│   │   │   └── page.tsx              # Restaurant analytics
│   │   ├── staff/
│   │   │   └── page.tsx              # Staff management
│   │   └── layout.tsx                # Restaurant owner layout
│   └── layout.tsx                    # Root layout
├── components/
│   ├── ui/                           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── data-table.tsx
│   │   ├── form.tsx
│   │   └── ... (30+ components)
│   ├── restaurant/
│   │   ├── restaurant-list.tsx       # Restaurant table
│   │   ├── restaurant-filters.tsx    # Filters (province, city, etc.)
│   │   ├── restaurant-form.tsx       # Add/edit form
│   │   └── restaurant-clone-dialog.tsx
│   ├── dashboard/
│   │   ├── stat-card.tsx             # Order stats card
│   │   ├── revenue-chart.tsx         # Revenue line chart
│   │   └── live-order-feed.tsx       # Real-time orders
│   ├── map/
│   │   └── delivery-area-map.tsx     # Mapbox polygon drawing
│   ├── coupons/
│   │   ├── coupon-form.tsx
│   │   └── coupon-bulk-upload.tsx
│   └── layout/
│       ├── sidebar.tsx               # Admin sidebar nav
│       ├── header.tsx                # Top header
│       └── user-dropdown.tsx         # User menu
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   └── middleware.ts             # Auth middleware
│   ├── validations/
│   │   ├── restaurant.ts             # Restaurant Zod schemas
│   │   ├── coupon.ts                 # Coupon Zod schemas
│   │   └── user.ts                   # User Zod schemas
│   ├── utils.ts                      # Utility functions
│   └── constants.ts                  # App constants
├── types/
│   └── supabase-database.ts          # Generated DB types (ALREADY EXISTS!)
├── hooks/
│   ├── use-restaurants.ts            # Restaurant queries
│   ├── use-orders.ts                 # Order queries
│   └── use-auth.ts                   # Auth state
├── stores/
│   └── use-app-store.ts              # Zustand global state
└── middleware.ts                     # Route protection

```

---

## 🗄️ **DATABASE SETUP**

### **Step 1: Create New Tables (15 tables)**

Run these migrations in Supabase SQL Editor:

```sql
-- ============================================
-- 1. ORDER CANCELLATION REQUESTS
-- ============================================
CREATE TABLE menuca_v3.order_cancellation_requests (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  order_created_at TIMESTAMPTZ NOT NULL,
  requested_by_user_id BIGINT REFERENCES menuca_v3.users(id),
  requested_by_admin_id BIGINT REFERENCES menuca_v3.admin_users(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by_admin_id BIGINT REFERENCES menuca_v3.admin_users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (order_id, order_created_at) REFERENCES menuca_v3.orders(id, created_at)
);

CREATE INDEX idx_cancellation_requests_order ON menuca_v3.order_cancellation_requests(order_id);
CREATE INDEX idx_cancellation_requests_status ON menuca_v3.order_cancellation_requests(status);

-- ============================================
-- 2. BLACKLIST
-- ============================================
CREATE TABLE menuca_v3.blacklist (
  id BIGSERIAL PRIMARY KEY,
  identifier_type VARCHAR(20) NOT NULL, -- email, phone, ip
  identifier_value VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  blocked_by_admin_id BIGINT REFERENCES menuca_v3.admin_users(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identifier_type, identifier_value)
);

CREATE INDEX idx_blacklist_identifier ON menuca_v3.blacklist(identifier_type, identifier_value);

-- ============================================
-- 3. EMAIL TEMPLATES
-- ============================================
CREATE TABLE menuca_v3.email_templates (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT REFERENCES menuca_v3.restaurants(id),
  template_type VARCHAR(50) NOT NULL, -- order_confirmation, password_reset, etc.
  language VARCHAR(5) NOT NULL DEFAULT 'en', -- en, fr
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB, -- {customerName: "Customer's first name", orderNumber: "Order ID"}
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, template_type, language)
);

-- ============================================
-- 4. ADMIN ROLES (RBAC)
-- ============================================
CREATE TABLE menuca_v3.admin_roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL, -- {page_access: [], restaurant_access: []}
  is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add role reference to admin_user_restaurants
ALTER TABLE menuca_v3.admin_user_restaurants
  ADD COLUMN IF NOT EXISTS role_id BIGINT REFERENCES menuca_v3.admin_roles(id);

-- Insert default roles
INSERT INTO menuca_v3.admin_roles (name, description, permissions, is_system_role) VALUES
('Super Admin', 'Full platform access', '{"page_access": ["*"], "restaurant_access": ["*"]}', true),
('Restaurant Manager', 'Manage assigned restaurants', '{"page_access": ["menu", "deals", "orders", "analytics"], "restaurant_access": ["assigned"]}', true),
('Staff', 'View-only access', '{"page_access": ["orders"], "restaurant_access": ["assigned"]}', true);

-- ============================================
-- 5. RESTAURANT CITATIONS (SEO)
-- ============================================
CREATE TABLE menuca_v3.restaurant_citations (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  citation_type VARCHAR(50) NOT NULL, -- gmb, yelp, tripadvisor, facebook, instagram
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, citation_type)
);

-- ============================================
-- 6. RESTAURANT BANNERS
-- ============================================
CREATE TABLE menuca_v3.restaurant_banners (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  name VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banners_restaurant ON menuca_v3.restaurant_banners(restaurant_id, display_order);

-- ============================================
-- 7. RESTAURANT IMAGES (Gallery)
-- ============================================
CREATE TABLE menuca_v3.restaurant_images (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  image_url TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 8. RESTAURANT FEEDBACK
-- ============================================
CREATE TABLE menuca_v3.restaurant_feedback (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  user_id BIGINT REFERENCES menuca_v3.users(id),
  order_id BIGINT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  response TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, responded, resolved
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX idx_feedback_restaurant ON menuca_v3.restaurant_feedback(restaurant_id, rating);

-- ============================================
-- 9. RESTAURANT CUSTOM CSS
-- ============================================
CREATE TABLE menuca_v3.restaurant_custom_css (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL UNIQUE REFERENCES menuca_v3.restaurants(id),
  css_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 10. RESTAURANT BANK ACCOUNTS
-- ============================================
CREATE TABLE menuca_v3.restaurant_bank_accounts (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL UNIQUE REFERENCES menuca_v3.restaurants(id),
  bank_name VARCHAR(255),
  account_number VARCHAR(255), -- Should be encrypted in production
  routing_number VARCHAR(255),
  account_holder_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 11. RESTAURANT PAYMENT METHODS
-- ============================================
CREATE TABLE menuca_v3.restaurant_payment_methods (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  payment_provider VARCHAR(50) NOT NULL, -- stripe, square, paypal
  provider_account_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 12. RESTAURANT REDIRECTS (SEO)
-- ============================================
CREATE TABLE menuca_v3.restaurant_redirects (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  from_path VARCHAR(500) NOT NULL,
  to_path VARCHAR(500) NOT NULL,
  redirect_type INTEGER NOT NULL DEFAULT 301,
  hit_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, from_path)
);

-- ============================================
-- 13. RESTAURANT CHARGES
-- ============================================
CREATE TABLE menuca_v3.restaurant_charges (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  charge_type VARCHAR(20) NOT NULL, -- fixed, percentage
  is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
  is_credit BOOLEAN NOT NULL DEFAULT FALSE,
  frequency VARCHAR(20) NOT NULL DEFAULT 'one_time',
  scope VARCHAR(50) NOT NULL DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 14. FRANCHISES
-- ============================================
CREATE TABLE menuca_v3.franchises (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_admin_id BIGINT REFERENCES menuca_v3.admin_users(id),
  legal_name VARCHAR(255),
  tax_id VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add franchise reference to restaurants
ALTER TABLE menuca_v3.restaurants
  ADD COLUMN IF NOT EXISTS franchise_id BIGINT REFERENCES menuca_v3.franchises(id);

-- ============================================
-- 15. FRANCHISE COMMISSION RULES
-- ============================================
CREATE TABLE menuca_v3.franchise_commission_rules (
  id BIGSERIAL PRIMARY KEY,
  franchise_id BIGINT NOT NULL REFERENCES menuca_v3.franchises(id),
  commission_split_type VARCHAR(20) NOT NULL DEFAULT 'equal',
  commission_percentage NUMERIC(5, 2),
  distribution_rules JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================

-- Extend promotional_coupons for email campaigns
ALTER TABLE menuca_v3.promotional_coupons
  ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'restaurant',
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS allow_reorder BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS single_use BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS exempt_courses BIGINT[],
  ADD COLUMN IF NOT EXISTS include_in_email BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_message TEXT;
```

---

## 🎨 **UI COMPONENT LIBRARY**

### **Install shadcn/ui Components:**

```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Install all needed components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add form
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add table
npx shadcn-ui@latest add card
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add command
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add skeleton
```

### **Install Additional Dependencies:**

```bash
npm install @supabase/supabase-js
npm install @supabase/ssr
npm install react-hook-form @hookform/resolvers zod
npm install @tanstack/react-query
npm install zustand
npm install recharts
npm install mapbox-gl @types/mapbox-gl
npm install date-fns
npm install clsx tailwind-merge
npm install lucide-react
npm install jspdf jspdf-autotable
```

---

## 🚀 **PHASE 1: AUTHENTICATION & LAYOUT (Week 1)**

### **1.1 Setup Supabase Client**

**File:** `lib/supabase/client.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase-database'

export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**File:** `lib/supabase/server.ts`
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase-database'

export const createClient = () => {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

### **1.2 Login Page**

**File:** `app/(auth)/login/page.tsx`
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: error.message,
        })
        return
      }

      // Check user role and redirect
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id, email, admin_user_restaurants(restaurant_id, role)')
        .eq('email', email)
        .single()

      if (adminUser) {
        // Determine redirect based on role
        const hasMultipleRestaurants = adminUser.admin_user_restaurants.length > 1
        if (hasMultipleRestaurants) {
          router.push('/master-admin/dashboard')
        } else {
          router.push('/restaurant-owner/dashboard')
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Access denied',
          description: 'You do not have admin access',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-red-600">MENU.CA</span>
          </div>
          <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@menu.ca"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

### **1.3 Master Admin Layout with Sidebar**

**File:** `app/(master-admin)/layout.tsx`
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

export default async function MasterAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check admin role
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, email, admin_user_restaurants(restaurant_id, role)')
    .eq('email', user.email)
    .single()

  if (!adminUser) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar user={adminUser} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={adminUser} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
```

**File:** `components/layout/sidebar.tsx`
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Store,
  Users,
  Ticket,
  Ban,
  Tablet,
  MapPin,
  FileText,
  DollarSign,
  Settings,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/master-admin/dashboard', icon: LayoutDashboard },
  { name: 'Restaurants', href: '/master-admin/restaurants', icon: Store },
  { name: 'Users', href: '/master-admin/users', icon: Users },
  { name: 'Coupons', href: '/master-admin/coupons', icon: Ticket },
  { name: 'Franchises', href: '/master-admin/franchises', icon: Store },
  { name: 'Blacklist', href: '/master-admin/blacklist', icon: Ban },
  { name: 'Tablets', href: '/master-admin/tablets', icon: Tablet },
  { name: 'Content', href: '/master-admin/content/cities', icon: MapPin },
  {
    name: 'Accounting',
    href: '/master-admin/accounting/statements',
    icon: DollarSign,
  },
]

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-500">MENU.CA</h1>
        <p className="text-sm text-gray-400">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
            {user.email?.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{user.email}</p>
            <p className="text-xs text-gray-400">Master Admin</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 🏢 **PHASE 2: RESTAURANT MANAGEMENT (Week 2-3)**

### **2.1 Restaurant List with Advanced Filters**

**File:** `app/(master-admin)/restaurants/page.tsx`
```typescript
import { createClient } from '@/lib/supabase/server'
import RestaurantList from '@/components/restaurant/restaurant-list'
import RestaurantFilters from '@/components/restaurant/restaurant-filters'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: { status?: string; province?: string; city?: string; cuisine?: string }
}) {
  const supabase = createClient()

  // Build query with filters
  let query = supabase
    .from('restaurants')
    .select(`
      id,
      name,
      status,
      restaurant_locations (
        address,
        city_id,
        cities (
          name,
          province_id,
          provinces (name)
        )
      ),
      marketing_tags (name)
    `)
    .order('name')

  // Apply filters
  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  const { data: restaurants } = await query

  // Get filter options
  const { data: provinces } = await supabase.from('provinces').select('id, name').order('name')
  const { data: cities } = await supabase.from('cities').select('id, name, province_id').order('name')
  const { data: cuisines } = await supabase.from('marketing_tags').select('id, name').order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Restaurants</h1>
          <p className="text-gray-600">Manage all restaurants on the platform</p>
        </div>
        <Link href="/master-admin/restaurants/add">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Restaurant
          </Button>
        </Link>
      </div>

      <RestaurantFilters
        provinces={provinces || []}
        cities={cities || []}
        cuisines={cuisines || []}
      />

      <RestaurantList restaurants={restaurants || []} />
    </div>
  )
}
```

**File:** `components/restaurant/restaurant-list.tsx`
```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Edit, Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RestaurantList({ restaurants }: { restaurants: any[] }) {
  const router = useRouter()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleClone = async (restaurantId: number) => {
    // TODO: Implement clone restaurant functionality
    alert(`Clone restaurant ${restaurantId} - TODO`)
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Province</TableHead>
            <TableHead>Cuisine</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {restaurants.map((restaurant) => (
            <TableRow key={restaurant.id}>
              <TableCell className="font-medium">{restaurant.name}</TableCell>
              <TableCell>
                {restaurant.restaurant_locations?.[0]?.cities?.name || '-'}
              </TableCell>
              <TableCell>
                {restaurant.restaurant_locations?.[0]?.cities?.provinces?.name || '-'}
              </TableCell>
              <TableCell>
                {restaurant.marketing_tags?.[0]?.name || '-'}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(restaurant.status)}>
                  {restaurant.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/master-admin/restaurants/${restaurant.id}/edit`)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClone(restaurant.id)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

---

## 📊 **PHASE 3: DASHBOARD & ANALYTICS (Week 4)**

### **3.1 Master Admin Dashboard**

**File:** `app/(master-admin)/dashboard/page.tsx`
```typescript
import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/dashboard/stat-card'
import RevenueChart from '@/components/dashboard/revenue-chart'
import LiveOrderFeed from '@/components/dashboard/live-order-feed'
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react'

export const revalidate = 60 // Revalidate every 60 seconds

export default async function DashboardPage() {
  const supabase = createClient()

  // Get today's stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: todayOrders, count: todayCount } = await supabase
    .from('orders')
    .select('total_amount', { count: 'exact' })
    .gte('created_at', today.toISOString())

  const todayRevenue = todayOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0

  // Get yesterday's stats
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const { count: yesterdayCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', yesterday.toISOString())
    .lt('created_at', today.toISOString())

  // Calculate growth
  const orderGrowth = yesterdayCount ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Platform overview and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Revenue"
          value={`$${todayRevenue.toFixed(2)}`}
          icon={DollarSign}
          trend={orderGrowth}
        />
        <StatCard
          title="Today's Orders"
          value={todayCount?.toString() || '0'}
          icon={ShoppingCart}
          trend={orderGrowth}
        />
        <StatCard
          title="Active Restaurants"
          value="74"
          icon={TrendingUp}
        />
        <StatCard
          title="Total Customers"
          value="32,349"
          icon={Users}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <LiveOrderFeed />
      </div>
    </div>
  )
}
```

**File:** `components/dashboard/stat-card.tsx`
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: number
}

export default function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="w-4 h-4 text-gray-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <p className="text-xs text-gray-600 mt-1 flex items-center">
            {trend >= 0 ? (
              <ArrowUp className="w-3 h-3 text-green-600 mr-1" />
            ) : (
              <ArrowDown className="w-3 h-3 text-red-600 mr-1" />
            )}
            <span className={trend >= 0 ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(trend).toFixed(1)}%
            </span>
            <span className="ml-1">vs yesterday</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## 🎯 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Foundation (Week 1)** ✅
- [ ] Setup Next.js 14 project
- [ ] Install dependencies (Supabase, shadcn/ui, etc.)
- [ ] Create database migrations (15 new tables)
- [ ] Setup Supabase client (browser & server)
- [ ] Build login page
- [ ] Build master admin layout with sidebar
- [ ] Setup route protection middleware
- [ ] Test authentication flow

### **Phase 2: Restaurant Management (Week 2-3)**
- [ ] Build restaurant list with filters
- [ ] Implement advanced filters (province, city, cuisine, vendor)
- [ ] Build restaurant detail page
- [ ] Build add restaurant wizard (multi-step form)
- [ ] Implement 15 restaurant edit sub-tabs:
  - [ ] Restaurant Info
  - [ ] Other Configs
  - [ ] Delivery (with map drawing)
  - [ ] Citations
  - [ ] Banners
  - [ ] Menu
  - [ ] Deals
  - [ ] Images
  - [ ] Feedback
  - [ ] Mail Templates
  - [ ] CSS
  - [ ] Coupon
  - [ ] Account Info
  - [ ] 301 Redirects
  - [ ] Charges
- [ ] Implement clone restaurant feature
- [ ] Test CRUD operations

### **Phase 3: Dashboard & Analytics (Week 4)**
- [ ] Build master admin dashboard
- [ ] Implement stat cards (revenue, orders, restaurants, users)
- [ ] Build revenue chart (Recharts)
- [ ] Build live order feed (Supabase Realtime)
- [ ] Implement date range filters
- [ ] Build top restaurants widget
- [ ] Build busiest hours heatmap
- [ ] Test real-time updates

### **Phase 4: User Management (Week 5)**
- [ ] Build admin user list
- [ ] Build add/edit admin user form
- [ ] Implement RBAC (roles & permissions)
- [ ] Build permission matrix UI
- [ ] Implement restaurant assignment
- [ ] Build user activity log
- [ ] Test role-based access

### **Phase 5: Coupons & Promotions (Week 6)**
- [ ] Build coupon list
- [ ] Build coupon form (all 15 fields)
- [ ] Implement email coupon generation
- [ ] Build bulk CSV upload
- [ ] Implement coupon usage tracking
- [ ] Build active deals widget
- [ ] Test coupon validation

### **Phase 6: Franchise Management (Week 7)**
- [ ] Build franchise list
- [ ] Build create franchise form
- [ ] Implement restaurant linking
- [ ] Build consolidated reporting
- [ ] Implement commission splitting
- [ ] Test multi-location workflows

### **Phase 7: Accounting & Reports (Week 8)**
- [ ] Build statement generator
- [ ] Implement PDF generation
- [ ] Build commission manager
- [ ] Build vendor reports
- [ ] Implement date range exports
- [ ] Test financial calculations

### **Phase 8: Additional Features (Week 9-10)**
- [ ] Build blacklist management
- [ ] Build tablet management
- [ ] Build content management (cities, cuisines, tags)
- [ ] Implement order cancellation workflow
- [ ] Build email template editor
- [ ] Test all features end-to-end

### **Phase 9: Polish & Testing (Week 11)**
- [ ] UI/UX refinement
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Error handling
- [ ] Loading states
- [ ] Toast notifications
- [ ] Form validation

### **Phase 10: Production Deploy (Week 12)**
- [ ] Security audit
- [ ] RLS policy review
- [ ] Load testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Production deployment
- [ ] User training

---

## 🎨 **DESIGN PATTERNS**

### **Color Scheme:**
- **Primary:** Red (#EF4444) - Menu.ca brand
- **Success:** Green (#10B981)
- **Warning:** Yellow (#F59E0B)
- **Error:** Red (#EF4444)
- **Info:** Blue (#3B82F6)
- **Background:** Gray (#F9FAFB)
- **Card:** White (#FFFFFF)
- **Border:** Gray (#E5E7EB)

### **Typography:**
- **Headings:** Bold, 24-32px
- **Body:** Regular, 14-16px
- **Caption:** Regular, 12px

### **Spacing:**
- **Page padding:** 24px
- **Section gap:** 24px
- **Card padding:** 16-24px
- **Button padding:** 12px 24px

---

## 🚨 **IMPORTANT NOTES**

### **Performance:**
- Use React Query for server state
- Implement infinite scroll for long lists
- Lazy load images
- Use Supabase Realtime sparingly
- Implement proper caching

### **Security:**
- Never expose sensitive data in client
- Use RLS policies for database access
- Encrypt bank account numbers
- Sanitize user inputs
- Implement rate limiting

### **Error Handling:**
- Show user-friendly error messages
- Log errors to monitoring service
- Implement retry logic for failed requests
- Show loading states
- Handle offline scenarios

### **Accessibility:**
- Use semantic HTML
- Add ARIA labels
- Ensure keyboard navigation
- Maintain color contrast
- Test with screen readers

---

## ✅ **SUCCESS CRITERIA**

### **Must Have:**
- ✅ All 168 features implemented
- ✅ Mobile responsive (works on tablets)
- ✅ Fast load times (< 3 seconds)
- ✅ No console errors
- ✅ All forms validated
- ✅ Real-time updates working
- ✅ PDF generation working
- ✅ Map drawing working

### **Nice to Have:**
- Dark mode toggle
- Keyboard shortcuts
- Bulk operations
- Advanced search
- Export to Excel
- Email notifications
- Mobile app (future)

---

## 🎯 **START HERE**

**First 3 Features to Build:**
1. **Login Page** - Get authentication working
2. **Master Admin Layout** - Build sidebar navigation
3. **Restaurant List** - Display 74 restaurants with filters

Once these 3 are working, the rest will fall into place!

**Ready to build? Let's go! 🚀**

