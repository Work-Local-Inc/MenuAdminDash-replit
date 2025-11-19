# 🍕 MENU.CA V3 - CUSTOMER ORDERING APP BUILD PLAN
**Comprehensive frontend ordering system for 961 restaurants**

---

## 🎯 **PROJECT OVERVIEW**

**What We're Building:**
A modern, responsive customer-facing ordering platform where 32,000+ customers can browse menus, customize orders, and checkout from 961 restaurants.

**Critical Requirements:**
- Browse restaurant menus with 15,740 dishes
- Add items to cart with modifiers and combos
- Apply promotional coupons
- Secure checkout with Stripe
- Real-time order tracking
- Customer account management
- Mobile-first responsive design

**Tech Stack:**
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Database:** Supabase PostgreSQL (menuca_v3 schema - EXISTING)
- **Styling:** TailwindCSS + shadcn/ui components
- **Auth:** Supabase Auth (customers table)
- **Payment:** Stripe Checkout + Payment Intents
- **Forms:** React Hook Form + Zod validation
- **State:** Zustand (cart state) + React Query (server state)
- **Maps:** Mapbox GL JS (delivery address selection)
- **Images:** Supabase Storage (dish images, restaurant logos)
- **Real-time:** Supabase Realtime (order status updates)

---

## 🗄️ **DATABASE ADDITIONS NEEDED**

### **Existing Tables We'll Use:**
- ✅ `restaurants` - 961 restaurants
- ✅ `restaurant_locations` - Addresses
- ✅ `restaurant_schedules` - Hours
- ✅ `courses` - Menu categories
- ✅ `dishes` - 15,740 dishes
- ✅ `dish_modifiers` - Add-ons
- ✅ `combo_groups` - Combo meals
- ✅ `combo_items` - Combo contents
- ✅ `promotional_coupons` - Discounts
- ✅ `users` - 32,349 customers
- ✅ `orders` (partitioned) - Order history
- ✅ `order_items` (partitioned) - Order line items

### **New Tables to Create:**

```sql
-- ============================================
-- 1. CART SESSIONS (Temporary storage)
-- ============================================
CREATE TABLE menuca_v3.cart_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES menuca_v3.users(id),
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  cart_data JSONB NOT NULL, -- {items: [...], subtotal: 0, tax: 0}
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cart_sessions_session_id ON menuca_v3.cart_sessions(session_id);
CREATE INDEX idx_cart_sessions_user ON menuca_v3.cart_sessions(user_id);
CREATE INDEX idx_cart_sessions_expires ON menuca_v3.cart_sessions(expires_at);

-- ============================================
-- 2. USER DELIVERY ADDRESSES (Already exists, verify)
-- ============================================
-- If doesn't exist:
CREATE TABLE menuca_v3.user_delivery_addresses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES menuca_v3.users(id),
  address_label VARCHAR(50), -- 'Home', 'Work', etc.
  street_address VARCHAR(500) NOT NULL,
  unit VARCHAR(50),
  city_id BIGINT NOT NULL REFERENCES menuca_v3.cities(id),
  postal_code VARCHAR(20) NOT NULL,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  delivery_instructions TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, address_label)
);

CREATE INDEX idx_user_addresses_user ON menuca_v3.user_delivery_addresses(user_id);

-- ============================================
-- 3. USER SAVED PAYMENT METHODS (Stripe)
-- ============================================
CREATE TABLE menuca_v3.user_payment_methods (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES menuca_v3.users(id),
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  card_brand VARCHAR(50), -- 'visa', 'mastercard', 'amex'
  last_4_digits VARCHAR(4),
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user ON menuca_v3.user_payment_methods(user_id);

-- ============================================
-- 4. PAYMENT TRANSACTIONS
-- ============================================
CREATE TABLE menuca_v3.payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  order_created_at TIMESTAMPTZ NOT NULL,
  user_id BIGINT NOT NULL REFERENCES menuca_v3.users(id),
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_charge_id VARCHAR(255),
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CAD',
  status VARCHAR(50) NOT NULL, -- 'pending', 'succeeded', 'failed', 'refunded'
  payment_method VARCHAR(50),
  failure_reason TEXT,
  refund_amount NUMERIC(10, 2) DEFAULT 0,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (order_id, order_created_at) REFERENCES menuca_v3.orders(id, created_at)
);

CREATE INDEX idx_payment_transactions_order ON menuca_v3.payment_transactions(order_id, order_created_at);
CREATE INDEX idx_payment_transactions_stripe ON menuca_v3.payment_transactions(stripe_payment_intent_id);

-- ============================================
-- 5. ORDER STATUS HISTORY (Tracking)
-- ============================================
CREATE TABLE menuca_v3.order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  order_created_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (order_id, order_created_at) REFERENCES menuca_v3.orders(id, created_at)
);

CREATE INDEX idx_order_history_order ON menuca_v3.order_status_history(order_id, order_created_at);

-- ============================================
-- 6. STRIPE WEBHOOK EVENTS (Idempotency)
-- ============================================
CREATE TABLE menuca_v3.stripe_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_stripe_id ON menuca_v3.stripe_webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_processed ON menuca_v3.stripe_webhook_events(processed);

-- ============================================
-- 7. CUSTOMER FAVORITES
-- ============================================
CREATE TABLE menuca_v3.user_favorite_dishes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES menuca_v3.users(id),
  dish_id BIGINT NOT NULL REFERENCES menuca_v3.dishes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, dish_id)
);

CREATE INDEX idx_favorites_user ON menuca_v3.user_favorite_dishes(user_id);

-- ============================================
-- 8. RESTAURANT REVIEWS (If not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS menuca_v3.restaurant_reviews (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  user_id BIGINT NOT NULL REFERENCES menuca_v3.users(id),
  order_id BIGINT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, order_id)
);

CREATE INDEX idx_reviews_restaurant ON menuca_v3.restaurant_reviews(restaurant_id);

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================

-- Add Stripe customer ID to users table
ALTER TABLE menuca_v3.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;

-- Add payment fields to orders table  
ALTER TABLE menuca_v3.orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delivery_address JSONB,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_delivery_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_delivery_time TIMESTAMPTZ;
```

---

## 📂 **PROJECT STRUCTURE**

```
menu-ca-ordering/
├── app/
│   ├── (public)/                         # Public routes (no auth)
│   │   ├── page.tsx                      # Landing page / Restaurant search
│   │   ├── r/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx              # Restaurant menu page
│   │   │       └── dish/
│   │   │           └── [id]/
│   │   │               └── page.tsx      # Dish detail modal
│   │   ├── search/
│   │   │   └── page.tsx                  # Search restaurants
│   │   ├── checkout/
│   │   │   └── page.tsx                  # Checkout flow
│   │   └── layout.tsx                    # Public layout
│   ├── (customer)/                       # Customer auth required
│   │   ├── account/
│   │   │   ├── page.tsx                  # Account dashboard
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx              # Order history
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx          # Order detail
│   │   │   ├── addresses/
│   │   │   │   └── page.tsx              # Saved addresses
│   │   │   ├── payments/
│   │   │   │   └── page.tsx              # Saved cards
│   │   │   └── favorites/
│   │   │       └── page.tsx              # Favorite dishes
│   │   └── layout.tsx                    # Customer layout
│   ├── api/
│   │   ├── restaurants/
│   │   │   ├── route.ts                  # List restaurants
│   │   │   ├── [slug]/
│   │   │   │   ├── route.ts              # Get restaurant
│   │   │   │   └── menu/
│   │   │   │       └── route.ts          # Get menu
│   │   ├── cart/
│   │   │   ├── route.ts                  # Get/update cart
│   │   │   └── apply-coupon/
│   │   │       └── route.ts              # Apply coupon code
│   │   ├── orders/
│   │   │   ├── route.ts                  # Create order
│   │   │   └── [id]/
│   │   │       ├── route.ts              # Get order
│   │   │       └── status/
│   │   │           └── route.ts          # Get order status
│   │   ├── checkout/
│   │   │   ├── create-payment-intent/
│   │   │   │   └── route.ts              # Stripe Payment Intent
│   │   │   └── confirm-order/
│   │   │       └── route.ts              # Finalize order
│   │   ├── stripe/
│   │   │   └── webhook/
│   │   │       └── route.ts              # Stripe webhooks
│   │   ├── auth/
│   │   │   ├── signup/
│   │   │   │   └── route.ts              # Customer signup
│   │   │   └── login/
│   │   │       └── route.ts              # Customer login
│   │   └── addresses/
│   │       ├── route.ts                  # CRUD addresses
│   │       └── [id]/
│   │           └── route.ts              # Update/delete address
│   └── layout.tsx                        # Root layout
├── components/
│   ├── ui/                               # shadcn/ui components
│   ├── restaurant/
│   │   ├── restaurant-card.tsx           # Restaurant preview card
│   │   ├── restaurant-header.tsx         # Restaurant info header
│   │   ├── menu-category-nav.tsx         # Category sidebar
│   │   ├── dish-card.tsx                 # Dish display card
│   │   ├── dish-modal.tsx                # Dish detail + customization
│   │   └── restaurant-hours.tsx          # Hours display
│   ├── cart/
│   │   ├── cart-drawer.tsx               # Sliding cart (Sheet)
│   │   ├── cart-item.tsx                 # Individual cart item
│   │   ├── cart-summary.tsx              # Subtotal/tax/total
│   │   └── mini-cart-button.tsx          # Floating cart button
│   ├── checkout/
│   │   ├── delivery-type-selector.tsx    # Delivery vs Pickup
│   │   ├── address-selector.tsx          # Select/add address
│   │   ├── time-selector.tsx             # ASAP or scheduled
│   │   ├── payment-form.tsx              # Stripe Elements
│   │   ├── coupon-input.tsx              # Apply coupon
│   │   └── order-summary.tsx             # Final review
│   ├── order/
│   │   ├── order-tracking.tsx            # Order status timeline
│   │   ├── order-card.tsx                # Order history card
│   │   └── order-details.tsx             # Full order breakdown
│   ├── account/
│   │   ├── address-form.tsx              # Add/edit address
│   │   ├── saved-card.tsx                # Payment method card
│   │   └── profile-form.tsx              # Edit profile
│   ├── search/
│   │   ├── restaurant-search.tsx         # Search bar
│   │   ├── filter-sidebar.tsx            # Cuisine, rating filters
│   │   └── search-results.tsx            # Results grid
│   └── layout/
│       ├── public-header.tsx             # Public site header
│       ├── customer-header.tsx           # Logged-in header
│       ├── footer.tsx                    # Site footer
│       └── auth-modal.tsx                # Login/signup modal
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # Browser client
│   │   ├── server.ts                     # Server client
│   │   └── middleware.ts                 # Auth middleware
│   ├── stripe/
│   │   ├── client.ts                     # Stripe.js
│   │   └── server.ts                     # Stripe Node SDK
│   ├── validations/
│   │   ├── order.ts                      # Order Zod schemas
│   │   ├── address.ts                    # Address Zod schemas
│   │   ├── auth.ts                       # Auth Zod schemas
│   │   └── cart.ts                       # Cart Zod schemas
│   ├── utils/
│   │   ├── cart-helpers.ts               # Cart calculations
│   │   ├── price-formatter.ts            # Currency formatting
│   │   ├── time-helpers.ts               # Delivery time calculations
│   │   └── order-helpers.ts              # Order utilities
│   ├── constants.ts                      # App constants
│   └── utils.ts                          # Generic utilities
├── stores/
│   ├── use-cart-store.ts                 # Zustand cart state
│   └── use-auth-store.ts                 # Auth state
├── hooks/
│   ├── use-restaurant.ts                 # Restaurant queries
│   ├── use-menu.ts                       # Menu queries
│   ├── use-cart.ts                       # Cart operations
│   ├── use-orders.ts                     # Order queries
│   ├── use-checkout.ts                   # Checkout flow
│   └── use-customer.ts                   # Customer data
├── types/
│   ├── supabase-database.ts              # Database types (EXISTS!)
│   ├── cart.ts                           # Cart types
│   ├── order.ts                          # Order types
│   └── stripe.ts                         # Stripe types
└── middleware.ts                         # Route protection

```

---

## 🛒 **CART SYSTEM ARCHITECTURE**

### **Cart State Management (Zustand)**

**File:** `stores/use-cart-store.ts`
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartModifier {
  modifierId: number
  name: string
  price: number
}

export interface CartItem {
  id: string // Unique identifier for cart item (not dish ID)
  dishId: number
  dishName: string
  dishPrice: number
  quantity: number
  modifiers: CartModifier[]
  specialInstructions?: string
  subtotal: number // dishPrice + modifiers * quantity
}

interface CartStore {
  restaurantId: number | null
  restaurantName: string | null
  items: CartItem[]
  
  // Actions
  setRestaurant: (id: number, name: string) => void
  addItem: (item: Omit<CartItem, 'id' | 'subtotal'>) => void
  updateItemQuantity: (itemId: string, quantity: number) => void
  removeItem: (itemId: string) => void
  clearCart: () => void
  
  // Computed
  getSubtotal: () => number
  getTax: () => number
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: null,
      items: [],
      
      setRestaurant: (id, name) => set({ restaurantId: id, restaurantName: name }),
      
      addItem: (item) => set((state) => {
        // Check if adding from different restaurant
        if (state.restaurantId && state.restaurantId !== item.dishId) {
          const confirmSwitch = confirm(
            `Your cart contains items from ${state.restaurantName}. Clear cart and start new order?`
          )
          if (!confirmSwitch) return state
          
          // Clear cart and start fresh
          return {
            items: [],
            restaurantId: null,
            restaurantName: null
          }
        }
        
        // Calculate subtotal
        const modifiersTotal = item.modifiers.reduce((sum, m) => sum + m.price, 0)
        const subtotal = (item.dishPrice + modifiersTotal) * item.quantity
        
        // Generate unique ID
        const id = `${item.dishId}-${Date.now()}-${Math.random()}`
        
        return {
          items: [...state.items, { ...item, id, subtotal }]
        }
      }),
      
      updateItemQuantity: (itemId, quantity) => set((state) => ({
        items: state.items.map(item => {
          if (item.id === itemId) {
            const modifiersTotal = item.modifiers.reduce((sum, m) => sum + m.price, 0)
            const subtotal = (item.dishPrice + modifiersTotal) * quantity
            return { ...item, quantity, subtotal }
          }
          return item
        })
      })),
      
      removeItem: (itemId) => set((state) => ({
        items: state.items.filter(item => item.id !== itemId)
      })),
      
      clearCart: () => set({ items: [], restaurantId: null, restaurantName: null }),
      
      getSubtotal: () => {
        const items = get().items
        return items.reduce((sum, item) => sum + item.subtotal, 0)
      },
      
      getTax: () => {
        const subtotal = get().getSubtotal()
        return subtotal * 0.13 // 13% HST for Ontario
      },
      
      getTotal: () => {
        return get().getSubtotal() + get().getTax()
      },
      
      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      }
    }),
    {
      name: 'menu-ca-cart' // LocalStorage key
    }
  )
)
```

---

## 🍽️ **RESTAURANT MENU PAGE**

### **Route:** `/r/[slug]`

**File:** `app/(public)/r/[slug]/page.tsx`
```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RestaurantHeader from '@/components/restaurant/restaurant-header'
import MenuCategoryNav from '@/components/restaurant/menu-category-nav'
import DishCard from '@/components/restaurant/dish-card'
import CartDrawer from '@/components/cart/cart-drawer'
import MiniCartButton from '@/components/cart/mini-cart-button'

export async function generateStaticParams() {
  const supabase = createClient()
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, slug')
    .eq('status', 'active')
  
  return restaurants?.map((r) => ({ slug: r.slug })) || []
}

export default async function RestaurantPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createClient()
  
  // Get restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select(`
      id,
      uuid,
      name,
      slug,
      description,
      logo_url,
      banner_url,
      min_order_amount,
      delivery_fee,
      estimated_delivery_time,
      restaurant_locations (
        street_address,
        unit,
        city_id,
        cities (
          name,
          province_id,
          provinces (name)
        )
      ),
      restaurant_schedules (
        day_of_week,
        open_time,
        close_time,
        is_closed
      )
    `)
    .eq('slug', params.slug)
    .eq('status', 'active')
    .single()
  
  if (!restaurant) {
    notFound()
  }
  
  // Get menu with categories
  const { data: courses } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      description,
      display_order,
      dishes (
        id,
        name,
        description,
        image_url,
        is_active,
        dish_prices (
          id,
          size_name,
          price
        ),
        dish_modifiers (
          id,
          name,
          price,
          is_required,
          max_selection
        )
      )
    `)
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('display_order')
  
  const activeCourses = courses?.map(course => ({
    ...course,
    dishes: course.dishes?.filter(d => d.is_active) || []
  })) || []
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Restaurant Header */}
      <RestaurantHeader restaurant={restaurant} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Category Navigation - Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <MenuCategoryNav categories={activeCourses} />
            </div>
          </div>
          
          {/* Menu Items Grid */}
          <div className="lg:col-span-3 space-y-12">
            {activeCourses.map((course) => (
              <section key={course.id} id={`category-${course.id}`}>
                <h2 className="text-3xl font-bold mb-2">{course.name}</h2>
                {course.description && (
                  <p className="text-gray-600 mb-6">{course.description}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {course.dishes.map((dish) => (
                    <DishCard
                      key={dish.id}
                      dish={dish}
                      restaurantId={restaurant.id}
                      restaurantName={restaurant.name}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
      
      {/* Floating Cart Button */}
      <MiniCartButton />
      
      {/* Cart Drawer */}
      <CartDrawer restaurant={restaurant} />
    </div>
  )
}
```

---

## 🛒 **DISH CARD COMPONENT**

**File:** `components/restaurant/dish-card.tsx`
```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import DishModal from './dish-modal'

interface DishCardProps {
  dish: {
    id: number
    name: string
    description: string
    image_url: string | null
    dish_prices: Array<{ id: number; size_name: string; price: number }>
    dish_modifiers: Array<{
      id: number
      name: string
      price: number
      is_required: boolean
      max_selection: number
    }>
  }
  restaurantId: number
  restaurantName: string
}

export default function DishCard({ dish, restaurantId, restaurantName }: DishCardProps) {
  const [showModal, setShowModal] = useState(false)
  
  // Get base price (smallest if multiple sizes)
  const basePrice = dish.dish_prices[0]?.price || 0
  const hasMultipleSizes = dish.dish_prices.length > 1
  
  return (
    <>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowModal(true)}>
        <CardContent className="p-0">
          {/* Dish Image */}
          {dish.image_url && (
            <div className="relative h-48 w-full">
              <Image
                src={dish.image_url}
                alt={dish.name}
                fill
                className="object-cover rounded-t-lg"
              />
            </div>
          )}
          
          {/* Dish Info */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold line-clamp-2">{dish.name}</h3>
              <Button
                size="sm"
                className="ml-2 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowModal(true)
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {dish.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {dish.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-red-600">
                {hasMultipleSizes ? 'From ' : ''}${basePrice.toFixed(2)}
              </span>
              
              {dish.dish_modifiers.length > 0 && (
                <span className="text-xs text-gray-500">
                  Customizable
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Dish Detail Modal */}
      {showModal && (
        <DishModal
          dish={dish}
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
```

---

## 🔍 **DISH MODAL (Customization)**

**File:** `components/restaurant/dish-modal.tsx`
```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Minus, Plus } from 'lucide-react'
import { useCartStore } from '@/stores/use-cart-store'
import { useToast } from '@/components/ui/use-toast'

const addToCartSchema = z.object({
  sizeId: z.number(),
  modifierIds: z.array(z.number()),
  specialInstructions: z.string().optional(),
  quantity: z.number().min(1),
})

interface DishModalProps {
  dish: {
    id: number
    name: string
    description: string
    image_url: string | null
    dish_prices: Array<{ id: number; size_name: string; price: number }>
    dish_modifiers: Array<{
      id: number
      name: string
      price: number
      is_required: boolean
      max_selection: number
    }>
  }
  restaurantId: number
  restaurantName: string
  onClose: () => void
}

export default function DishModal({ dish, restaurantId, restaurantName, onClose }: DishModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState(dish.dish_prices[0]?.id || 0)
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([])
  const [specialInstructions, setSpecialInstructions] = useState('')
  
  const { addItem, setRestaurant } = useCartStore()
  const { toast } = useToast()
  
  // Calculate price
  const sizePrice = dish.dish_prices.find(p => p.id === selectedSize)?.price || 0
  const modifiersPrice = selectedModifiers.reduce((sum, modId) => {
    const mod = dish.dish_modifiers.find(m => m.id === modId)
    return sum + (mod?.price || 0)
  }, 0)
  const totalPrice = (sizePrice + modifiersPrice) * quantity
  
  const handleAddToCart = () => {
    // Set restaurant if not set
    if (!useCartStore.getState().restaurantId) {
      setRestaurant(restaurantId, restaurantName)
    }
    
    // Build cart item
    const selectedSizeName = dish.dish_prices.find(p => p.id === selectedSize)?.size_name || ''
    const modifiers = selectedModifiers.map(modId => {
      const mod = dish.dish_modifiers.find(m => m.id === modId)!
      return {
        modifierId: mod.id,
        name: mod.name,
        price: mod.price
      }
    })
    
    addItem({
      dishId: dish.id,
      dishName: `${dish.name}${selectedSizeName ? ` (${selectedSizeName})` : ''}`,
      dishPrice: sizePrice,
      quantity,
      modifiers,
      specialInstructions: specialInstructions || undefined
    })
    
    toast({
      title: 'Added to cart',
      description: `${quantity}x ${dish.name}`,
    })
    
    onClose()
  }
  
  const toggleModifier = (modId: number) => {
    if (selectedModifiers.includes(modId)) {
      setSelectedModifiers(selectedModifiers.filter(id => id !== modId))
    } else {
      setSelectedModifiers([...selectedModifiers, modId])
    }
  }
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dish.name}</DialogTitle>
        </DialogHeader>
        
        {/* Dish Image */}
        {dish.image_url && (
          <div className="relative h-64 w-full -mx-6 -mt-2">
            <Image
              src={dish.image_url}
              alt={dish.name}
              fill
              className="object-cover"
            />
          </div>
        )}
        
        {/* Description */}
        {dish.description && (
          <p className="text-gray-600">{dish.description}</p>
        )}
        
        {/* Size Selection */}
        {dish.dish_prices.length > 1 && (
          <div className="space-y-2">
            <Label className="text-base font-semibold">Select Size</Label>
            <RadioGroup value={selectedSize.toString()} onValueChange={(val) => setSelectedSize(parseInt(val))}>
              {dish.dish_prices.map((price) => (
                <div key={price.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={price.id.toString()} id={`size-${price.id}`} />
                    <Label htmlFor={`size-${price.id}`} className="cursor-pointer">
                      {price.size_name}
                    </Label>
                  </div>
                  <span className="font-semibold">${price.price.toFixed(2)}</span>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}
        
        {/* Modifiers */}
        {dish.dish_modifiers.length > 0 && (
          <div className="space-y-2">
            <Label className="text-base font-semibold">Customize Your Order</Label>
            <div className="space-y-2">
              {dish.dish_modifiers.map((modifier) => (
                <div key={modifier.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`mod-${modifier.id}`}
                      checked={selectedModifiers.includes(modifier.id)}
                      onCheckedChange={() => toggleModifier(modifier.id)}
                    />
                    <Label htmlFor={`mod-${modifier.id}`} className="cursor-pointer">
                      {modifier.name}
                      {modifier.is_required && (
                        <span className="text-red-600 ml-1">*</span>
                      )}
                    </Label>
                  </div>
                  {modifier.price > 0 && (
                    <span className="font-semibold">+${modifier.price.toFixed(2)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Special Instructions */}
        <div className="space-y-2">
          <Label htmlFor="instructions">Special Instructions (Optional)</Label>
          <Textarea
            id="instructions"
            placeholder="E.g., No onions, extra sauce..."
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            rows={3}
          />
        </div>
        
        {/* Quantity Selector */}
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Quantity</Label>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity === 1}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Add to Cart Button */}
        <DialogFooter>
          <Button onClick={handleAddToCart} className="w-full text-lg py-6">
            Add {quantity} to Cart - ${totalPrice.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🛒 **CART DRAWER**

**File:** `components/cart/cart-drawer.tsx`
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, X } from 'lucide-react'
import { useCartStore } from '@/stores/use-cart-store'
import CartItem from './cart-item'

interface CartDrawerProps {
  restaurant: {
    id: number
    name: string
    min_order_amount: number | null
    delivery_fee: number | null
  }
}

export default function CartDrawer({ restaurant }: CartDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  
  const { items, getSubtotal, getTax, getTotal, clearCart } = useCartStore()
  
  const subtotal = getSubtotal()
  const tax = getTax()
  const total = getTotal()
  const deliveryFee = restaurant.delivery_fee || 0
  const grandTotal = total + deliveryFee
  
  const minOrderAmount = restaurant.min_order_amount || 0
  const meetsMinimum = subtotal >= minOrderAmount
  
  const handleCheckout = () => {
    setIsOpen(false)
    router.push('/checkout')
  }
  
  // Global listener for cart button clicks
  if (typeof window !== 'undefined') {
    window.addEventListener('openCart', () => setIsOpen(true))
  }
  
  if (items.length === 0) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Your Cart</SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <ShoppingCart className="w-16 h-16 mb-4" />
            <p>Your cart is empty</p>
          </div>
        </SheetContent>
      </Sheet>
    )
  }
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Your Cart</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-red-600"
            >
              Clear Cart
            </Button>
          </div>
          <p className="text-sm text-gray-600">{restaurant.name}</p>
        </SheetHeader>
        
        {/* Cart Items */}
        <ScrollArea className="flex-1 my-4">
          <div className="space-y-4">
            {items.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>
        </ScrollArea>
        
        {/* Order Summary */}
        <div className="space-y-3">
          <Separator />
          
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Delivery Fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span>Tax (13% HST)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
          
          {!meetsMinimum && (
            <p className="text-sm text-red-600">
              Minimum order: ${minOrderAmount.toFixed(2)} 
              (add ${(minOrderAmount - subtotal).toFixed(2)} more)
            </p>
          )}
        </div>
        
        {/* Checkout Button */}
        <SheetFooter className="mt-4">
          <Button
            onClick={handleCheckout}
            disabled={!meetsMinimum}
            className="w-full text-lg py-6"
          >
            {meetsMinimum ? 'Proceed to Checkout' : 'Add More Items'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
```

---

## 💳 **CHECKOUT FLOW**

**File:** `app/(public)/checkout/page.tsx`
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import DeliveryTypeSelector from '@/components/checkout/delivery-type-selector'
import AddressSelector from '@/components/checkout/address-selector'
import TimeSelector from '@/components/checkout/time-selector'
import PaymentForm from '@/components/checkout/payment-form'
import CouponInput from '@/components/checkout/coupon-input'
import OrderSummary from '@/components/checkout/order-summary'
import { useCartStore } from '@/stores/use-cart-store'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function CheckoutPage() {
  const router = useRouter()
  const { items, restaurantId, restaurantName, getSubtotal, getTax, getTotal } = useCartStore()
  
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery')
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  
  if (items.length === 0) {
    router.push('/')
    return null
  }
  
  const subtotal = getSubtotal()
  const deliveryFee = deliveryType === 'delivery' ? 5.00 : 0
  const discount = appliedCoupon ? appliedCoupon.amount : 0
  const tax = getTax()
  const total = subtotal + deliveryFee - discount + tax
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Checkout Steps */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Delivery Type */}
            <Card>
              <CardHeader>
                <CardTitle>1. Delivery Method</CardTitle>
              </CardHeader>
              <CardContent>
                <DeliveryTypeSelector
                  value={deliveryType}
                  onChange={setDeliveryType}
                />
              </CardContent>
            </Card>
            
            {/* Step 2: Address (if delivery) */}
            {deliveryType === 'delivery' && (
              <Card>
                <CardHeader>
                  <CardTitle>2. Delivery Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <AddressSelector
                    selectedId={selectedAddressId}
                    onChange={setSelectedAddressId}
                  />
                </CardContent>
              </Card>
            )}
            
            {/* Step 3: Time */}
            <Card>
              <CardHeader>
                <CardTitle>3. {deliveryType === 'delivery' ? 'Delivery' : 'Pickup'} Time</CardTitle>
              </CardHeader>
              <CardContent>
                <TimeSelector
                  value={scheduledTime}
                  onChange={setScheduledTime}
                />
              </CardContent>
            </Card>
            
            {/* Step 4: Payment */}
            <Card>
              <CardHeader>
                <CardTitle>4. Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise}>
                  <PaymentForm
                    amount={total}
                    onSuccess={(orderId) => {
                      router.push(`/order-confirmation/${orderId}`)
                    }}
                  />
                </Elements>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <OrderSummary
                restaurantName={restaurantName!}
                items={items}
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                tax={tax}
                discount={discount}
                total={total}
              />
              
              {/* Coupon Input */}
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <CouponInput
                    restaurantId={restaurantId!}
                    onApply={setAppliedCoupon}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 💳 **STRIPE PAYMENT INTEGRATION**

### **Create Payment Intent API**

**File:** `app/api/checkout/create-payment-intent/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const createPaymentIntentSchema = z.object({
  amount: z.number().positive(),
  restaurantId: z.number(),
  items: z.array(z.object({
    dishId: z.number(),
    dishName: z.string(),
    quantity: z.number(),
    subtotal: z.number(),
  })),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get customer data
    const { data: customer } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id')
      .eq('id', user.id)
      .single()
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    
    // Parse request
    const body = await request.json()
    const { amount, restaurantId, items } = createPaymentIntentSchema.parse(body)
    
    // Convert to cents
    const amountInCents = Math.round(amount * 100)
    
    // Create or get Stripe customer
    let stripeCustomerId = customer.stripe_customer_id
    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        metadata: {
          supabase_user_id: customer.id.toString(),
        },
      })
      
      stripeCustomerId = stripeCustomer.id
      
      // Save Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', customer.id)
    }
    
    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'cad',
      customer: stripeCustomerId,
      metadata: {
        user_id: customer.id.toString(),
        restaurant_id: restaurantId.toString(),
        items: JSON.stringify(items),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Payment Intent creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
```

### **Confirm Order API**

**File:** `app/api/checkout/confirm-order/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const confirmOrderSchema = z.object({
  paymentIntentId: z.string(),
  restaurantId: z.number(),
  deliveryType: z.enum(['delivery', 'pickup']),
  addressId: z.number().optional(),
  scheduledTime: z.string().optional(),
  items: z.array(z.object({
    dishId: z.number(),
    dishName: z.string(),
    dishPrice: z.number(),
    quantity: z.number(),
    modifiers: z.array(z.object({
      modifierId: z.number(),
      name: z.string(),
      price: z.number(),
    })),
    specialInstructions: z.string().optional(),
    subtotal: z.number(),
  })),
  subtotal: z.number(),
  deliveryFee: z.number(),
  tax: z.number(),
  discount: z.number(),
  total: z.number(),
  couponCode: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get customer
    const { data: customer } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', user.id)
      .single()
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    
    // Parse request
    const body = await request.json()
    const data = confirmOrderSchema.parse(body)
    
    // Get address details if delivery
    let deliveryAddress = null
    if (data.deliveryType === 'delivery' && data.addressId) {
      const { data: address } = await supabase
        .from('user_delivery_addresses')
        .select('*, cities(name, provinces(name))')
        .eq('id', data.addressId)
        .single()
      
      deliveryAddress = address
    }
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: data.restaurantId,
        user_id: customer.id,
        order_status: 'pending',
        order_type: data.deliveryType,
        subtotal: data.subtotal,
        tax_amount: data.tax,
        delivery_fee: data.deliveryFee,
        tip_amount: 0, // TODO: Add tip support
        total_amount: data.total,
        stripe_payment_intent_id: data.paymentIntentId,
        payment_status: 'succeeded',
        delivery_address: deliveryAddress ? {
          street: deliveryAddress.street_address,
          unit: deliveryAddress.unit,
          city: deliveryAddress.cities.name,
          province: deliveryAddress.cities.provinces.name,
          postal_code: deliveryAddress.postal_code,
        } : null,
        scheduled_delivery_time: data.scheduledTime ? new Date(data.scheduledTime) : null,
      })
      .select()
      .single()
    
    if (orderError) {
      throw orderError
    }
    
    // Create order items
    const orderItems = data.items.map(item => ({
      order_id: order.id,
      created_at: order.created_at, // Partition key
      dish_id: item.dishId,
      item_name: item.dishName,
      quantity: item.quantity,
      unit_price: item.dishPrice,
      total_price: item.subtotal,
      customizations: item.modifiers.length > 0 ? item.modifiers : null,
      special_instructions: item.specialInstructions,
    }))
    
    await supabase.from('order_items').insert(orderItems)
    
    // Create payment transaction record
    await supabase.from('payment_transactions').insert({
      order_id: order.id,
      order_created_at: order.created_at,
      user_id: customer.id,
      restaurant_id: data.restaurantId,
      stripe_payment_intent_id: data.paymentIntentId,
      amount: data.total,
      status: 'succeeded',
      payment_method: 'card',
    })
    
    // Create initial order status history
    await supabase.from('order_status_history').insert({
      order_id: order.id,
      order_created_at: order.created_at,
      status: 'pending',
      notes: 'Order placed',
    })
    
    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderUuid: order.uuid,
    })
  } catch (error) {
    console.error('Order confirmation error:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
```

### **Stripe Webhook Handler**

**File:** `app/api/stripe/webhook/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!
    
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    
    const supabase = createClient()
    
    // Check for duplicate events (idempotency)
    const { data: existingEvent } = await supabase
      .from('stripe_webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single()
    
    if (existingEvent) {
      return NextResponse.json({ received: true, duplicate: true })
    }
    
    // Log webhook event
    await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event.data,
    })
    
    // Handle event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSuccess(paymentIntent)
        break
      
      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailure(failedIntent)
        break
      
      case 'charge.refunded':
        const refund = event.data.object as Stripe.Charge
        await handleRefund(refund)
        break
    }
    
    // Mark event as processed
    await supabase
      .from('stripe_webhook_events')
      .update({ processed: true })
      .eq('stripe_event_id', event.id)
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createClient()
  
  // Update order status
  await supabase
    .from('orders')
    .update({
      payment_status: 'succeeded',
      order_status: 'confirmed',
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)
  
  // Update payment transaction
  await supabase
    .from('payment_transactions')
    .update({
      status: 'succeeded',
      stripe_charge_id: paymentIntent.latest_charge as string,
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createClient()
  
  await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      order_status: 'cancelled',
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)
  
  await supabase
    .from('payment_transactions')
    .update({
      status: 'failed',
      failure_reason: paymentIntent.last_payment_error?.message,
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)
}

async function handleRefund(charge: Stripe.Charge) {
  const supabase = createClient()
  
  const refundAmount = charge.amount_refunded / 100
  
  await supabase
    .from('payment_transactions')
    .update({
      status: 'refunded',
      refund_amount: refundAmount,
      refunded_at: new Date().toISOString(),
    })
    .eq('stripe_charge_id', charge.id)
}
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Foundation (Day 1-2)**
- [ ] Setup Next.js 14 project
- [ ] Install dependencies (Supabase, Stripe, shadcn/ui)
- [ ] Create database migrations (8 new tables)
- [ ] Setup Supabase client
- [ ] Setup Stripe client
- [ ] Configure environment variables
- [ ] Test database connection

### **Phase 2: Restaurant Menu Display (Day 3-4)**
- [ ] Build restaurant page route `/r/[slug]`
- [ ] Build `RestaurantHeader` component
- [ ] Build `MenuCategoryNav` component
- [ ] Build `DishCard` component
- [ ] Build `DishModal` with customization
- [ ] Test menu browsing with real data

### **Phase 3: Cart System (Day 5)**
- [ ] Build Zustand cart store
- [ ] Build `CartDrawer` component
- [ ] Build `CartItem` component
- [ ] Build `MiniCartButton` component
- [ ] Implement cart calculations
- [ ] Test add/remove/update cart

### **Phase 4: Checkout Flow (Day 6-7)**
- [ ] Build checkout page
- [ ] Build `DeliveryTypeSelector`
- [ ] Build `AddressSelector`
- [ ] Build `TimeSelector`
- [ ] Build `OrderSummary`
- [ ] Build `CouponInput`
- [ ] Test checkout flow

### **Phase 5: Payment Integration (Day 8-9)**
- [ ] Setup Stripe account
- [ ] Create Payment Intent API
- [ ] Build `PaymentForm` with Stripe Elements
- [ ] Create Confirm Order API
- [ ] Setup Stripe webhook handler
- [ ] Test payment flow end-to-end
- [ ] Test webhook events

### **Phase 6: Customer Account (Day 10-11)**
- [ ] Build customer signup/login
- [ ] Build account dashboard
- [ ] Build order history page
- [ ] Build order detail page
- [ ] Build saved addresses page
- [ ] Build saved payment methods page
- [ ] Test customer account features

### **Phase 7: Order Tracking (Day 12)**
- [ ] Build order confirmation page
- [ ] Build order tracking component
- [ ] Implement real-time status updates
- [ ] Build order status timeline
- [ ] Test order tracking

### **Phase 8: Polish & Testing (Day 13-14)**
- [ ] Mobile responsiveness
- [ ] Loading states
- [ ] Error handling
- [ ] Form validation
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] End-to-end testing

### **Phase 9: Launch Prep (Day 15)**
- [ ] Security audit
- [ ] Load testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Production deployment
- [ ] Monitor first orders

---

## 🎨 **DESIGN SYSTEM**

### **Color Palette:**
- **Primary:** Red-600 (#DC2626) - Menu.ca brand
- **Success:** Green-600 (#059669)
- **Warning:** Yellow-500 (#EAB308)
- **Error:** Red-600 (#DC2626)
- **Info:** Blue-600 (#2563EB)
- **Background:** Gray-50 (#F9FAFB)
- **Surface:** White (#FFFFFF)
- **Border:** Gray-200 (#E5E7EB)

### **Typography:**
- **Font Family:** Inter (system font stack)
- **Headings:** Bold, 20-32px
- **Body:** Regular, 14-16px
- **Caption:** Regular, 12-14px

### **Spacing:**
- **Container max-width:** 1280px
- **Page padding:** 16px mobile, 32px desktop
- **Section gap:** 24-48px
- **Card padding:** 16-24px

### **Breakpoints:**
- **Mobile:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px

---

## ⚡ **PERFORMANCE OPTIMIZATION**

### **Image Optimization:**
```typescript
// Use Next.js Image component
<Image
  src={dish.image_url}
  alt={dish.name}
  width={400}
  height={300}
  loading="lazy"
  quality={75}
/>
```

### **React Query Configuration:**
```typescript
// lib/react-query.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
```

### **Supabase Query Optimization:**
```typescript
// Only select needed columns
.select('id, name, price') // Good
.select('*') // Bad (overfetching)

// Use pagination for large lists
.range(0, 19) // First 20 items

// Use indexes (already created in migrations)
.eq('restaurant_id', id) // Fast (indexed)
```

---

## 🔒 **SECURITY BEST PRACTICES**

### **Environment Variables:**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # Server-side only!

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx  # Server-side only!
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Server-side only!

NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
```

### **Never Expose:**
- ❌ Service role keys in client code
- ❌ Stripe secret keys in client code
- ❌ Customer emails/addresses without authentication
- ❌ Payment method details (except last 4 digits)

### **Always Do:**
- ✅ Validate all inputs with Zod
- ✅ Check authentication on all API routes
- ✅ Use Supabase RLS policies
- ✅ Sanitize user inputs
- ✅ Verify Stripe webhook signatures
- ✅ Use HTTPS in production

---

## 📱 **MOBILE-FIRST DESIGN**

### **Responsive Patterns:**
```typescript
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">

// Responsive padding
<div className="p-4 md:p-6 lg:p-8">

// Responsive columns
<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
  <aside className="lg:col-span-1">Sidebar</aside>
  <main className="lg:col-span-3">Content</main>
</div>
```

---

## 🚀 **QUICK START GUIDE**

### **1. Setup Project:**
```bash
# Create Next.js 14 app
npx create-next-app@latest menu-ca-ordering --typescript --tailwind --app

cd menu-ca-ordering

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
npm install react-hook-form @hookform/resolvers zod
npm install @tanstack/react-query
npm install zustand
npm install date-fns clsx tailwind-merge lucide-react

# Install shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card dialog sheet checkbox radio-group
```

### **2. Run Database Migrations:**
```sql
-- Run all CREATE TABLE statements from the migrations section above
-- in your Supabase SQL Editor
```

### **3. Configure Environment:**
```bash
# Create .env.local
cp .env.example .env.local

# Add your keys
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
STRIPE_SECRET_KEY=xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=xxx
```

### **4. Start Development:**
```bash
npm run dev
# Open http://localhost:3000
```

---

## ✅ **SUCCESS CRITERIA**

### **Must Have (MVP):**
- ✅ Browse restaurant menus
- ✅ Add items to cart with modifiers
- ✅ Checkout with address selection
- ✅ Stripe payment integration
- ✅ Order confirmation
- ✅ Customer signup/login
- ✅ Order history
- ✅ Mobile responsive

### **Nice to Have (V2):**
- ⚪ Reorder previous orders
- ⚪ Save favorite dishes
- ⚪ Schedule orders in advance
- ⚪ Apple Pay / Google Pay
- ⚪ Restaurant reviews
- ⚪ Real-time order tracking map
- ⚪ Push notifications

---

## 🎯 **START HERE**

**First 3 Pages to Build:**
1. **Restaurant Menu Page** (`/r/[slug]`) - Display dishes
2. **Cart Drawer** - Add/remove items
3. **Checkout Page** - Complete purchase

**Once these 3 work, you have an MVP! 🚀**

---

**READY TO BUILD THE REAL PRODUCT? LET'S GO! 🍕**

