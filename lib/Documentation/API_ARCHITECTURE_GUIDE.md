# Menu.ca API Architecture Guide

**Last Updated:** November 4, 2025  
**Version:** 3.1  
**Purpose:** Comprehensive reference for all API endpoints, patterns, and best practices

## 🎯 Quick Reference

**Core Principles:**
1. **IDs**: Use `UUID` in APIs, `integer ID` internally
2. **Server State**: React Query for all API data
3. **Client State**: Zustand for UI/app state
4. **Database**: SQL functions for CUD, direct queries for simple reads
5. **Validation**: Zod schemas on every API route

---

## Table of Contents

1. [Core Architecture](#core-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Patterns & Standards](#api-patterns--standards)
4. [Entity Reference](#entity-reference)
5. [Error Handling](#error-handling)
6. [Frontend Integration Guide](#frontend-integration-guide)
7. [Testing & Examples](#testing--examples)

---

## Core Architecture

### Technology Stack
- **Backend**: Next.js 14 App Router API Routes
- **Database**: Supabase PostgreSQL (menuca_v3 schema)
- **Authentication**: Supabase Auth with middleware
- **Business Logic**: SQL Functions + Edge Functions
- **Type Safety**: TypeScript with Zod validation

### Database Schema Configuration

⚠️ **CRITICAL**: All Supabase clients MUST include `db: { schema: 'menuca_v3' }`

```typescript
// Server-side client
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/types/supabase-database'

export async function createClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'menuca_v3' },  // REQUIRED
      cookies: { /* ... */ }
    }
  )
}
```

**Two Schemas:**
1. **`public` schema**: Admin tables only (`admin_users`, `admin_roles`, `admin_user_restaurants`)
2. **`menuca_v3` schema**: ALL restaurant platform data (restaurants, dishes, orders, users, promotional deals, etc.)

### Critical ID Architecture Rules

⚠️ **Restaurant Identification Pattern:**
- **Database Primary Key**: `id` (INTEGER) - Used internally for foreign keys and joins
- **API Public Interface**: `uuid` (STRING) - **ALWAYS use UUID in API calls**

**Why UUIDs for APIs:**
- ✅ Prevents confusion between tables with duplicate IDs
- ✅ Safer for external integrations
- ✅ Industry best practice for public APIs
- ✅ Future-proof for distributed systems

```typescript
// ❌ WRONG - Don't expose internal integer IDs in APIs
POST /api/admin/promotions/deals
{ "restaurant_id": 846 }

// ✅ CORRECT - Always use UUID in API requests/responses
POST /api/admin/promotions/deals
{ "restaurant_uuid": "769323a7-0a51-4a06-8bb9-86bb57826f33" }

// Internal: Convert UUID to ID for database operations
const { data } = await supabase
  .from('restaurants')
  .select('id')
  .eq('uuid', restaurant_uuid)
  .single()

const restaurant_id = data.id  // Now use integer ID for FK constraints
```

---

## Authentication & Authorization

### 1. Admin Authentication Pattern

**Every admin API route follows this flow:**

```typescript
import { verifyAdminAuth } from '@/lib/auth/verify-admin'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Verify admin is authenticated
    const { adminUser } = await verifyAdminAuth(request)
    
    // adminUser contains: { id, email, role_id, role_name }
    
    // Continue with business logic...
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}
```

### 2. Restaurant Permission Authorization

**For restaurant-specific operations (CRITICAL PATTERN):**

```typescript
import { verifyAdminAuth } from '@/lib/auth/verify-admin'
import { verifyRestaurantPermission, getAdminAuthorizedRestaurants } from '@/lib/api/promotions'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Authenticate admin
    const { adminUser } = await verifyAdminAuth(request)
    
    // Step 2: Get request data
    const body = await request.json()
    const { restaurant_id } = body
    
    // Step 3: Verify permission for specific restaurant
    const hasPermission = await verifyRestaurantPermission(
      adminUser.id,
      restaurant_id
    )
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to manage this restaurant' },
        { status: 403 }
      )
    }
    
    // Step 4: Perform operation
    // ... business logic
    
    return NextResponse.json({ success: true }, { status: 200 })
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

**For listing operations:**

```typescript
export async function GET(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    
    // Get all authorized restaurant IDs
    const authorizedIds = await getAdminAuthorizedRestaurants(adminUser.id)
    
    if (authorizedIds.length === 0) {
      return NextResponse.json({ deals: [] }, { status: 200 })
    }
    
    // Filter query by authorized restaurants
    const { data } = await supabase
      .from('promotional_deals')
      .select('*')
      .in('restaurant_id', authorizedIds)
    
    return NextResponse.json({ deals: data }, { status: 200 })
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### 3. Customer Authentication

**Customer-facing routes (public menu, orders):**

```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // Get user session (optional for public pages)
  const { data: { user } } = await supabase.auth.getUser()
  
  // Public data accessible to all
  const { data } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', params.slug)
  
  return NextResponse.json({ restaurant: data }, { status: 200 })
}
```

---

## API Patterns & Standards

### Architectural Principles

#### 1. State Management Strategy

**Server State (React Query):**
All data fetching, mutations, caching, and real-time updates MUST use React Query.

```typescript
import { useQuery, useMutation, queryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'

// ✅ CORRECT - React Query for server state
function DealsPage() {
  // Data fetching with automatic caching & refetching
  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/promotions/deals'],  // Automatic fetching
    staleTime: 60000,  // Default: 1 minute
  })
  
  // Mutations with cache invalidation
  const createDeal = useMutation({
    mutationFn: (data) => apiRequest('/api/admin/promotions/deals/create', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      // Invalidate and refetch deals list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/deals'] })
    }
  })
  
  return (
    <div>
      {isLoading ? <Skeleton /> : data.deals.map(/* ... */)}
      <button onClick={() => createDeal.mutate(formData)}>
        Create Deal
      </button>
    </div>
  )
}
```

**React Query Configuration:**
```typescript
// lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,  // Automatic URL fetching
      staleTime: 60 * 1000,     // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

**Client State (Zustand):**
Use Zustand for UI state and local app state (NOT server data).

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ✅ CORRECT - Zustand for client-side state
interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      removeItem: (id) => set((state) => ({ 
        items: state.items.filter(i => i.id !== id) 
      })),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'cart-storage' }  // Persists to localStorage
  )
)
```

**When to use what:**
- **React Query**: API data, database records, server state
- **Zustand**: Shopping cart, UI preferences, form wizards, theme
- **React State**: Component-local UI state (modals, toggles)

#### 2. Database Operations Pattern

⚠️ **CRITICAL**: Follow this pattern for ALL database operations:

**CREATE, UPDATE, DELETE → SQL Functions ONLY**
```typescript
// ✅ CORRECT - Use SQL function for mutations
const { data, error } = await supabase
  .rpc('create_promotional_deal', {
    p_restaurant_uuid: '769323a7-0a51-4a06-8bb9-86bb57826f33',
    p_name: 'Summer Sale',
    p_discount_percent: 20
  })

// ✅ CORRECT - Use SQL function for updates
const { data, error } = await supabase
  .rpc('update_deal_status', {
    p_deal_id: 123,
    p_is_enabled: false
  })

// ✅ CORRECT - Use SQL function for deletes (soft delete)
const { data, error } = await supabase
  .rpc('soft_delete_deal', {
    p_deal_id: 123
  })
```

**READ → Direct Queries (Single Table Only)**
```typescript
// ✅ CORRECT - Direct query for simple reads
const { data } = await supabase
  .from('promotional_deals')
  .select('*')
  .eq('restaurant_id', 846)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })

// ✅ CORRECT - Direct query with filtering & sorting
const { data } = await supabase
  .from('restaurants')
  .select('id, name, slug, is_online')
  .eq('is_active', true)
  .order('name')
```

**Complex Reads → SQL Functions**
```typescript
// ✅ CORRECT - Use function for multi-table reads
const { data } = await supabase
  .rpc('get_restaurant_menu', {
    p_restaurant_id: 846,
    p_language: 'en'
  })

// ✅ CORRECT - Use function for aggregations
const { data } = await supabase
  .rpc('get_deal_analytics', {
    p_restaurant_id: 846,
    p_start_date: '2025-01-01',
    p_end_date: '2025-12-31'
  })
```

**Why SQL Functions for CUD:**
- ✅ Centralized business logic
- ✅ Transaction safety
- ✅ Consistent validation
- ✅ Better performance (server-side)
- ✅ Easier to test and maintain
- ✅ Reusable across API routes

#### 3. Request Validation (Zod)

**EVERY API route MUST validate input with Zod schemas:**

```typescript
import { z } from 'zod'

// Define validation schema
const createDealSchema = z.object({
  restaurant_uuid: z.string().uuid('Invalid restaurant UUID'),
  name: z.string().min(1, 'Name required').max(255),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  discount_value: z.number().positive('Discount must be positive'),
  minimum_purchase: z.number().min(0).optional(),
})

// Use in API route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ✅ Validate before processing
    const validated = createDealSchema.parse(body)
    
    // Now use validated data safely
    const result = await supabase.rpc('create_promotional_deal', {
      p_restaurant_uuid: validated.restaurant_uuid,
      p_name: validated.name,
      p_discount_type: validated.discount_type,
      p_discount_value: validated.discount_value,
    })
    
    return NextResponse.json({ success: true, data: result })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

**Zod Best Practices:**
- ✅ Create reusable schemas in `lib/validation/`
- ✅ Use `.parse()` for strict validation (throws on error)
- ✅ Return 400 errors with field-level details
- ✅ Validate UUIDs with `.uuid()` method
- ✅ Use `.transform()` for data normalization

---

### RESTful Route Structure

**Standard patterns:**
```
GET    /api/{resource}                  # List all
POST   /api/{resource}                  # Create new
GET    /api/{resource}/[id]             # Get one
PATCH  /api/{resource}/[id]             # Update
DELETE /api/{resource}/[id]             # Delete

# Sub-resources
GET    /api/{resource}/[id]/{sub}       # Get sub-resource
POST   /api/{resource}/[id]/{sub}       # Create sub-resource
PATCH  /api/{resource}/[id]/{sub}/[sid] # Update sub-resource
```

### Request Validation with Zod

**Always validate request bodies:**

```typescript
import { z } from 'zod'

const createDealSchema = z.object({
  restaurant_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  discount_value: z.number().positive(),
  minimum_purchase: z.number().min(0).optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  is_enabled: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate with Zod
    const validatedData = createDealSchema.parse(body)
    
    // Use validated data
    const { data, error } = await supabase
      .from('promotional_deals')
      .insert(validatedData)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ deal: data }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Response Formats

**Success responses:**

```typescript
// Single resource (200 OK or 201 Created)
{ 
  "deal": { id: 1, name: "Black Friday", ... }
}

// Collection (200 OK)
{
  "deals": [
    { id: 1, name: "Deal 1", ... },
    { id: 2, name: "Deal 2", ... }
  ]
}

// Analytics/Complex data (200 OK)
{
  "dealAnalytics": { total_redemptions: 150, ... },
  "couponAnalytics": { total_redemptions: 75, ... },
  "topDeals": [...]
}

// Operation result (200 OK)
{
  "success": true,
  "message": "Deal enabled successfully"
}
```

**Error responses:**

```typescript
// Validation error (400 Bad Request)
{
  "error": "Validation failed",
  "details": [
    { path: ["name"], message: "Required" }
  ]
}

// Unauthorized (401)
{
  "error": "Authentication required"
}

// Forbidden (403)
{
  "error": "You do not have permission to manage this restaurant"
}

// Not found (404)
{
  "error": "Deal not found"
}

// Server error (500)
{
  "error": "An unexpected error occurred"
}
```

### SQL Functions vs Direct Queries

**When to use SQL functions:**
- Complex business logic
- Multi-table aggregations
- Analytics calculations
- Data validation rules

**When to use direct queries:**
- Simple CRUD operations
- Single-table reads
- Filtering and sorting

```typescript
// SQL Function (complex analytics)
const { data } = await supabase.rpc('get_restaurant_deal_analytics', {
  p_restaurant_id: restaurantId,
  p_start_date: startDate,
  p_end_date: endDate
})

// Direct Query (simple read)
const { data } = await supabase
  .from('promotional_deals')
  .select('*')
  .eq('restaurant_id', restaurantId)
  .order('created_at', { ascending: false })
```

---

## Entity Reference

### 1. Promotional Deals & Coupons

**Base Path:** `/api/admin/promotions`

#### List Deals
```
GET /api/admin/promotions/deals
Authorization: Admin (authenticated)
Permission: Filters by authorized restaurants

Response:
{
  "deals": [
    {
      "id": 1,
      "restaurant_id": 10,
      "name": "Black Friday Sale",
      "discount_type": "percentage",
      "discount_value": 20,
      "is_enabled": true,
      "restaurants": {
        "id": 10,
        "name": "Pizza Palace",
        "slug": "pizza-palace"
      }
    }
  ]
}
```

#### Create Deal
```
POST /api/admin/promotions/deals/create
Authorization: Admin (authenticated)
Permission: Requires access to specified restaurant_id

Request Body:
{
  "restaurant_id": 10,
  "name": "Summer Special",
  "description": "Get 15% off all pizzas",
  "discount_type": "percentage",
  "discount_value": 15,
  "minimum_purchase": 25.00,
  "start_date": "2025-06-01T00:00:00Z",
  "end_date": "2025-08-31T23:59:59Z",
  "service_types": ["delivery", "pickup"],
  "first_order_only": false,
  "is_enabled": true,
  "terms_conditions": "Cannot be combined with other offers"
}

Response: (201 Created)
{
  "deal": { /* created deal object */ }
}
```

#### Toggle Deal Status
```
PATCH /api/admin/promotions/deals/[id]/toggle
Authorization: Admin (authenticated)
Permission: Requires access to deal's restaurant

Request Body:
{
  "is_enabled": true
}

Response:
{
  "deal": { /* updated deal */ }
}
```

#### Get Deal Stats
```
GET /api/admin/promotions/deals/[id]/stats
Authorization: Admin (authenticated)
Permission: Requires access to deal's restaurant

Response:
{
  "stats": {
    "total_redemptions": 45,
    "total_discount_given": 675.50,
    "total_revenue": 2250.00,
    "avg_order_value": 50.00
  }
}
```

#### Clone Deal
```
POST /api/admin/promotions/deals/[id]/clone
Authorization: Admin (authenticated)
Permission: Requires access to deal's restaurant

Response: (201 Created)
{
  "deal": { 
    "id": 99,
    "name": "Summer Special (Copy)",
    "is_enabled": false,
    /* ... other fields copied */
  }
}
```

#### Delete Deal (Soft Delete)
```
DELETE /api/admin/promotions/deals/[id]
Authorization: Admin (authenticated)
Permission: Requires access to deal's restaurant

Response:
{
  "success": true,
  "message": "Deal deleted successfully"
}
```

#### Analytics Dashboard
```
GET /api/admin/promotions/analytics
Authorization: Admin (authenticated)
Permission: Filters by authorized restaurants

Query Parameters:
?restaurant_id=10          # Optional: filter by restaurant
&date_range=30            # Optional: 7, 30, 90, 365, or "all"

Response:
{
  "dealAnalytics": {
    "total_deals": 5,
    "active_deals": 3,
    "total_redemptions": 150,
    "total_discount_given": 3450.00,
    "total_revenue": 15000.00,
    "avg_order_value": 100.00
  },
  "couponAnalytics": {
    "total_coupons": 8,
    "active_coupons": 5,
    "total_redemptions": 75,
    "total_discount_given": 1250.00,
    "total_revenue": 5000.00
  },
  "topDeals": [
    {
      "deal_id": 1,
      "deal_name": "Black Friday",
      "redemption_count": 50,
      "total_revenue": 5000.00,
      "avg_order_value": 100.00
    }
  ]
}
```

**Types:**
```typescript
// Location: types/promotions.ts

export type PromotionalDeal = Database['menuca_v3']['Tables']['promotional_deals']['Row']
export type DealInsert = Database['menuca_v3']['Tables']['promotional_deals']['Insert']
export type DealUpdate = Database['menuca_v3']['Tables']['promotional_deals']['Update']

export type DealWithRestaurant = PromotionalDeal & {
  restaurants: {
    id: number
    name: string
    slug: string
  }
}

export interface DealPerformance {
  deal_id: number
  total_redemptions: number
  total_discount_given: number
  total_revenue: number
  avg_order_value: number
  conversion_rate: number
}
```

---

### 2. Restaurants

**Base Path:** `/api/restaurants`

#### List Restaurants
```
GET /api/restaurants
Authorization: Admin (authenticated)
Permission: Filters by authorized restaurants

Query Parameters:
?status=active            # Optional: filter by status
&online_ordering=true     # Optional: filter by online ordering
&search=pizza            # Optional: search by name

Response:
{
  "restaurants": [
    {
      "id": 10,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Pizza Palace",
      "slug": "pizza-palace",
      "status": "active",
      "online_ordering_enabled": true,
      "phone": "+1-416-555-0100"
    }
  ]
}
```

#### Get Restaurant
```
GET /api/restaurants/[id]
Authorization: Admin (authenticated)
Permission: Requires access to this restaurant

Response:
{
  "restaurant": { /* full restaurant object */ }
}
```

#### Update Restaurant
```
PATCH /api/restaurants/[id]
Authorization: Admin (authenticated)
Permission: Requires access to this restaurant

Request Body:
{
  "name": "Updated Name",
  "phone": "+1-416-555-0199",
  "status": "active"
}

Response:
{
  "restaurant": { /* updated restaurant */ }
}
```

#### Toggle Online Ordering
```
PATCH /api/restaurants/[id]/online-ordering
Authorization: Admin (authenticated)
Permission: Requires access to this restaurant

Request Body:
{
  "is_enabled": true
}

Response:
{
  "restaurant": { /* updated restaurant */ }
}
```

---

### 3. Menu Management

**Base Path:** `/api/menu`

#### Categories (Courses)

```
GET /api/menu/courses
Authorization: Admin (authenticated)
Permission: Filters by authorized restaurants

Query Parameters:
?restaurant_id=10

Response:
{
  "courses": [
    {
      "id": 1,
      "restaurant_id": 10,
      "name": "Appetizers",
      "description": "Start your meal right",
      "display_order": 1,
      "is_active": true
    }
  ]
}
```

```
POST /api/menu/courses
Authorization: Admin (authenticated)
Permission: Requires access to restaurant_id

Request Body:
{
  "restaurant_id": 10,
  "name": "Desserts",
  "description": "Sweet endings",
  "display_order": 5,
  "is_active": true
}

Response: (201 Created)
{
  "course": { /* created course */ }
}
```

```
PATCH /api/menu/courses/[id]
Authorization: Admin (authenticated)
Permission: Requires access to course's restaurant

Request Body:
{
  "name": "Updated Category Name",
  "is_active": false
}

Response:
{
  "course": { /* updated course */ }
}
```

```
POST /api/menu/courses/reorder
Authorization: Admin (authenticated)
Permission: Requires access to restaurant

Request Body:
{
  "restaurant_id": 10,
  "course_orders": [
    { "id": 1, "display_order": 1 },
    { "id": 2, "display_order": 2 }
  ]
}

Response:
{
  "success": true
}
```

#### Dishes

```
GET /api/menu/dishes
Authorization: Admin (authenticated)
Permission: Filters by authorized restaurants

Query Parameters:
?restaurant_id=10
&course_id=1              # Optional: filter by category
&search=pizza            # Optional: search by name
&is_active=true          # Optional: filter by status

Response:
{
  "dishes": [
    {
      "id": 100,
      "restaurant_id": 10,
      "course_id": 1,
      "name": "Margherita Pizza",
      "description": "Classic tomato and mozzarella",
      "is_active": true,
      "is_featured": false,
      "dish_prices": [
        {
          "id": 1,
          "size_name": "Small",
          "price": 12.99,
          "display_order": 1
        },
        {
          "id": 2,
          "size_name": "Large",
          "price": 18.99,
          "display_order": 2
        }
      ]
    }
  ]
}
```

```
POST /api/menu/dishes
Authorization: Admin (authenticated)
Permission: Requires access to restaurant_id

Request Body:
{
  "restaurant_id": 10,
  "course_id": 1,
  "name": "Pepperoni Pizza",
  "description": "Classic pepperoni",
  "is_active": true,
  "is_featured": false,
  "prices": [
    { "size_name": "Small", "price": 13.99 },
    { "size_name": "Large", "price": 19.99 }
  ]
}

Response: (201 Created)
{
  "dish": { /* created dish with prices */ }
}
```

```
PATCH /api/menu/dishes/[id]
Authorization: Admin (authenticated)
Permission: Requires access to dish's restaurant

Request Body:
{
  "name": "Updated Dish Name",
  "is_featured": true,
  "prices": [
    { "size_name": "Medium", "price": 15.99 }
  ]
}

Response:
{
  "dish": { /* updated dish */ }
}
```

```
PATCH /api/menu/dishes/[id]/inventory
Authorization: Admin (authenticated)
Permission: Requires access to dish's restaurant

Request Body:
{
  "is_available": false,
  "out_of_stock_reason": "Sold out for today"
}

Response:
{
  "inventory": { /* updated inventory status */ }
}
```

#### Modifier Groups

```
GET /api/menu/dishes/[id]/modifier-groups
Authorization: Admin (authenticated)
Permission: Requires access to dish's restaurant

Response:
{
  "modifierGroups": [
    {
      "id": 1,
      "name": "Toppings",
      "min_selections": 0,
      "max_selections": 5,
      "is_required": false,
      "display_order": 1,
      "modifiers": [
        {
          "id": 10,
          "name": "Extra Cheese",
          "price": 2.00,
          "is_available": true,
          "display_order": 1
        }
      ]
    }
  ]
}
```

```
POST /api/menu/dishes/[id]/modifier-groups
Authorization: Admin (authenticated)
Permission: Requires access to dish's restaurant

Request Body:
{
  "name": "Size Options",
  "min_selections": 1,
  "max_selections": 1,
  "is_required": true,
  "modifiers": [
    { "name": "Small", "price": 0 },
    { "name": "Large", "price": 5.00 }
  ]
}

Response: (201 Created)
{
  "modifierGroup": { /* created group with modifiers */ }
}
```

---

### 4. Orders

**Base Path:** `/api/orders`

```
GET /api/orders
Authorization: Admin (authenticated)
Permission: Filters by authorized restaurants

Query Parameters:
?restaurant_id=10
&status=pending          # pending, confirmed, completed, cancelled
&date_from=2025-01-01
&date_to=2025-12-31

Response:
{
  "orders": [
    {
      "id": 1000,
      "restaurant_id": 10,
      "user_id": 500,
      "order_number": "ORD-2025-1000",
      "status": "confirmed",
      "subtotal": 25.00,
      "tax": 3.25,
      "delivery_fee": 5.00,
      "total": 33.25,
      "created_at": "2025-11-04T14:30:00Z",
      "customer": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1-416-555-0123"
      }
    }
  ]
}
```

---

### 5. Users & Access

**Base Path:** `/api/admin-users`

#### List Admin Users
```
GET /api/admin-users
Authorization: Admin (authenticated)
Permission: Super admin only

Response:
{
  "adminUsers": [
    {
      "id": 1,
      "email": "admin@menu.ca",
      "role_id": 1,
      "role_name": "Super Admin",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Admin User
```
POST /api/admin-users/create
Authorization: Admin (authenticated)
Permission: Super admin only

Request Body:
{
  "email": "newadmin@menu.ca",
  "password": "SecurePass123!",
  "role_id": 2,
  "restaurant_ids": [10, 15, 20]
}

Response: (201 Created)
{
  "adminUser": { /* created user */ },
  "assignments": [ /* restaurant assignments */ ]
}
```

#### Get Current Admin
```
GET /api/admin-users/me
Authorization: Admin (authenticated)

Response:
{
  "adminUser": {
    "id": 1,
    "email": "admin@menu.ca",
    "role_id": 1,
    "role_name": "Super Admin",
    "authorized_restaurants": [10, 15, 20]
  }
}
```

---

### 6. Customer-Facing Routes

**Base Path:** `/api/customer`

#### Get Restaurant Menu (Public)
```
GET /api/customer/restaurants/[slug]/menu
Authorization: None (public)

Response:
{
  "restaurant": {
    "id": 10,
    "name": "Pizza Palace",
    "slug": "pizza-palace",
    "online_ordering_enabled": true
  },
  "menu": [
    {
      "course_id": 1,
      "course_name": "Appetizers",
      "dishes": [
        {
          "id": 100,
          "name": "Garlic Bread",
          "description": "Toasted with garlic butter",
          "prices": [
            { "size_name": "Regular", "price": 5.99 }
          ],
          "modifierGroups": []
        }
      ]
    }
  ]
}
```

#### Get Dish Modifiers (Public)
```
GET /api/customer/dishes/[id]/modifiers
Authorization: None (public)

Response:
{
  "dish": { /* dish details */ },
  "modifierGroups": [ /* available modifiers */ ]
}
```

---

## Error Handling

### Common Error Patterns

```typescript
// 1. Authentication Error (401)
if (!adminUser) {
  return NextResponse.json(
    { error: 'Authentication required. Please log in.' },
    { status: 401 }
  )
}

// 2. Permission Error (403)
if (!hasPermission) {
  return NextResponse.json(
    { error: 'You do not have permission to access this resource' },
    { status: 403 }
  )
}

// 3. Not Found (404)
if (!data) {
  return NextResponse.json(
    { error: 'Resource not found' },
    { status: 404 }
  )
}

// 4. Validation Error (400)
if (error instanceof z.ZodError) {
  return NextResponse.json(
    { 
      error: 'Validation failed',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    },
    { status: 400 }
  )
}

// 5. Database Error (500)
if (error) {
  console.error('Database error:', error)
  return NextResponse.json(
    { error: 'An unexpected error occurred. Please try again.' },
    { status: 500 }
  )
}
```

### Frontend Error Handling

```typescript
// In your React components
try {
  const response = await fetch('/api/admin/promotions/deals/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dealData)
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    // Handle specific error codes
    if (response.status === 401) {
      // Redirect to login
      router.push('/admin/login')
    } else if (response.status === 403) {
      // Show permission error
      toast.error(data.error || 'Permission denied')
    } else if (response.status === 400) {
      // Show validation errors
      data.details?.forEach(err => {
        toast.error(`${err.field}: ${err.message}`)
      })
    } else {
      // Generic error
      toast.error(data.error || 'An error occurred')
    }
    return
  }
  
  // Success
  toast.success('Deal created successfully')
  router.push('/admin/promotions')
  
} catch (error) {
  console.error('Request failed:', error)
  toast.error('Network error. Please check your connection.')
}
```

---

## Frontend Integration Guide

### React Query Integration

**1. Create a custom hook:**

```typescript
// hooks/use-promotional-deals.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import type { DealWithRestaurant, DealInsert } from '@/types/promotions'

export function usePromotionalDeals(restaurantId?: number) {
  const queryKey = restaurantId 
    ? ['/api/admin/promotions/deals', restaurantId]
    : ['/api/admin/promotions/deals']
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = restaurantId 
        ? `/api/admin/promotions/deals?restaurant_id=${restaurantId}`
        : '/api/admin/promotions/deals'
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch deals')
      
      const data = await response.json()
      return data.deals as DealWithRestaurant[]
    }
  })
}

export function useCreateDeal() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (deal: DealInsert) => {
      const response = await fetch('/api/admin/promotions/deals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deal)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create deal')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate all deal queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/deals'] })
      toast({
        title: 'Success',
        description: 'Deal created successfully'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

export function useToggleDealStatus() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async ({ dealId, isEnabled }: { dealId: number; isEnabled: boolean }) => {
      const response = await fetch(`/api/admin/promotions/deals/${dealId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: isEnabled })
      })
      
      if (!response.ok) throw new Error('Failed to toggle deal status')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions/deals'] })
      toast({
        title: 'Success',
        description: 'Deal status updated'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}
```

**2. Use in components:**

```typescript
'use client'

import { usePromotionalDeals, useToggleDealStatus } from '@/hooks/use-promotional-deals'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'

export function DealsPage() {
  const { data: deals, isLoading } = usePromotionalDeals()
  const toggleStatus = useToggleDealStatus()
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div className="space-y-4">
      {deals?.map(deal => (
        <Card key={deal.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3>{deal.name}</h3>
              <p className="text-sm text-muted-foreground">
                {deal.restaurants.name}
              </p>
            </div>
            <Switch
              checked={deal.is_enabled}
              onCheckedChange={(checked) => 
                toggleStatus.mutate({ 
                  dealId: deal.id, 
                  isEnabled: checked 
                })
              }
              disabled={toggleStatus.isPending}
            />
          </div>
        </Card>
      ))}
    </div>
  )
}
```

### Type Safety

**Always use generated types:**

```typescript
import type { Database } from '@/types/supabase-database'

// Table types
type Restaurant = Database['menuca_v3']['Tables']['restaurants']['Row']
type Dish = Database['menuca_v3']['Tables']['dishes']['Row']
type Order = Database['menuca_v3']['Tables']['orders']['Row']

// Insert types
type RestaurantInsert = Database['menuca_v3']['Tables']['restaurants']['Insert']
type DishInsert = Database['menuca_v3']['Tables']['dishes']['Insert']

// Update types
type RestaurantUpdate = Database['menuca_v3']['Tables']['restaurants']['Update']
```

---

## Testing & Examples

### Example: Complete Create Deal Flow

```typescript
// 1. API Route
// app/api/admin/promotions/deals/create/route.ts
export async function POST(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    const body = await request.json()
    
    const validated = createDealSchema.parse(body)
    
    const hasPermission = await verifyRestaurantPermission(
      adminUser.id,
      validated.restaurant_id
    )
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('promotional_deals')
      .insert(validated)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ deal: data }, { status: 201 })
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// 2. React Hook
// hooks/use-create-deal.ts
export function useCreateDeal() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (deal: DealInsert) => {
      const response = await fetch('/api/admin/promotions/deals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deal)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/promotions/deals'] 
      })
      toast({ title: 'Deal created successfully' })
    }
  })
}

// 3. Component
// components/create-deal-form.tsx
export function CreateDealForm() {
  const createDeal = useCreateDeal()
  const form = useForm<DealInsert>({
    resolver: zodResolver(dealSchema)
  })
  
  const onSubmit = (data: DealInsert) => {
    createDeal.mutate(data)
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
        <Button 
          type="submit" 
          disabled={createDeal.isPending}
        >
          Create Deal
        </Button>
      </form>
    </Form>
  )
}
```

---

## Quick Reference Checklist

**When creating a new API endpoint:**

- [ ] Choose RESTful route structure
- [ ] Add authentication with `verifyAdminAuth()`
- [ ] Add permission check with `verifyRestaurantPermission()` (if restaurant-specific)
- [ ] Validate request body with Zod schema
- [ ] Use TypeScript types from `Database` type
- [ ] Handle errors with appropriate status codes
- [ ] Return consistent response format
- [ ] Create React Query hook for frontend
- [ ] Add to this documentation
- [ ] Test with real data

**When updating this documentation:**

- [ ] Update entity reference with new endpoints
- [ ] Add request/response examples
- [ ] Update TypeScript types reference
- [ ] Add frontend integration examples
- [ ] Update version number and date at top

---

**Last Updated:** November 4, 2025  
**Version:** 3.0  
**Maintainer:** Menu.ca Development Team
