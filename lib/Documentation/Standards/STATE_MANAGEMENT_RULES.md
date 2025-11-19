# State Management Rules - Menu.ca V3

**Purpose:** Clear separation between Zustand and React Query to prevent data synchronization bugs

**Last Updated:** October 22, 2025

---

## Golden Rule

**Zustand** = Ephemeral UI state (exists only in browser, not persisted to server)  
**React Query** = Server state (data from database, APIs, synchronized with backend)

**NEVER mix the two!**

---

## ✅ Use Zustand For:

### 1. Shopping Cart (Before Submission)
```typescript
// lib/stores/cart-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  dishId: number;
  dishName: string;
  size?: { id: number; name: string; price: number };
  modifiers: { id: number; name: string; price: number }[];
  quantity: number;
  specialInstructions?: string;
  subtotal: number;
}

interface CartStore {
  items: CartItem[];
  restaurantId: number | null;
  restaurantName: string | null;
  
  // Actions
  addItem: (item: CartItem, restaurantId: number, restaurantName: string) => void;
  removeItem: (dishId: number) => void;
  updateQuantity: (dishId: number, quantity: number) => void;
  clearCart: () => void;
  
  // Computed
  itemCount: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      restaurantName: null,
      
      addItem: (item, restaurantId, restaurantName) => {
        // Check if switching restaurants
        const currentRestaurantId = get().restaurantId;
        if (currentRestaurantId && currentRestaurantId !== restaurantId) {
          // Clear cart when switching restaurants
          // (After user confirms via dialog)
          set({ items: [], restaurantId, restaurantName });
        }
        
        set((state) => ({
          items: [...state.items, item],
          restaurantId,
          restaurantName
        }));
      },
      
      removeItem: (dishId) => {
        set((state) => ({
          items: state.items.filter((item) => item.dishId !== dishId)
        }));
      },
      
      updateQuantity: (dishId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(dishId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.dishId === dishId ? { ...item, quantity } : item
          )
        }));
      },
      
      clearCart: () => {
        set({ items: [], restaurantId: null, restaurantName: null });
      },
      
      itemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      subtotal: () => {
        return get().items.reduce((total, item) => total + item.subtotal, 0);
      }
    }),
    {
      name: 'menu-ca-cart', // localStorage key
      partialize: (state) => ({
        items: state.items,
        restaurantId: state.restaurantId,
        restaurantName: state.restaurantName
      })
    }
  )
);
```

**Why Zustand:** Cart is temporary, client-only state. It only becomes server state AFTER checkout submission.

---

### 2. UI Toggle States
```typescript
// lib/stores/ui-store.ts
interface UIStore {
  // Modal/drawer states
  isCartDrawerOpen: boolean;
  isDishModalOpen: boolean;
  selectedDishId: number | null;
  
  // Navigation states
  isSidebarCollapsed: boolean;
  
  // Filter states (before applying)
  tempFilters: {
    cuisine: string[];
    priceRange: [number, number];
    rating: number;
  };
  
  // Actions
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  openDishModal: (dishId: number) => void;
  closeDishModal: () => void;
  toggleSidebar: () => void;
  setTempFilters: (filters: Partial<UIStore['tempFilters']>) => void;
}
```

**Why Zustand:** These are pure UI states that don't need server synchronization.

---

### 3. Form Draft State (Before Submission)
```typescript
// For multi-step forms
interface CheckoutFormStore {
  // Draft data (not submitted yet)
  deliveryType: 'delivery' | 'pickup';
  address?: {
    street: string;
    city: string;
    postalCode: string;
  };
  scheduledTime?: Date;
  tip?: number;
  
  // Current step
  currentStep: number;
  
  // Actions
  setDeliveryType: (type: 'delivery' | 'pickup') => void;
  setAddress: (address: CheckoutFormStore['address']) => void;
  nextStep: () => void;
  prevStep: () => void;
}
```

**Why Zustand:** Form drafts are temporary. They become server state only after submission.

---

## ✅ Use React Query For:

### 1. Restaurant Data (From Database)
```typescript
// app/(public)/r/[slug]/page.tsx
import { useQuery } from '@tanstack/react-query';

export default function RestaurantMenuPage({ params }: { params: { slug: string } }) {
  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['restaurant', params.slug],
    queryFn: async () => {
      const res = await fetch(`/api/customer/restaurants/${params.slug}`);
      if (!res.ok) throw new Error('Restaurant not found');
      return res.json();
    }
  });

  const { data: menu } = useQuery({
    queryKey: ['restaurant', params.slug, 'menu'],
    queryFn: async () => {
      const res = await fetch(`/api/customer/restaurants/${params.slug}/menu`);
      return res.json();
    }
  });

  // ... render menu
}
```

**Why React Query:** Restaurant data comes from database, needs caching, auto-refresh, etc.

---

### 2. User Orders (From Database)
```typescript
// app/(public)/account/orders/page.tsx
export default function OrderHistoryPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['user', 'orders'],
    queryFn: async () => {
      const res = await fetch('/api/customer/orders');
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30s for order status updates
  });

  // ... render orders
}
```

---

### 3. Mutations (Writing to Database)
```typescript
// components/checkout/checkout-form.tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function CheckoutForm() {
  const queryClient = useQueryClient();
  const cartItems = useCartStore((state) => state.items);
  
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      const res = await fetch('/api/customer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (!res.ok) throw new Error('Order creation failed');
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['user', 'orders'] });
      
      // Clear cart after successful order
      useCartStore.getState().clearCart();
      
      // Redirect to confirmation
      router.push(`/order-confirmation/${data.orderId}`);
    }
  });

  const handleSubmit = async (formData) => {
    await createOrderMutation.mutateAsync({
      items: cartItems,
      deliveryType: formData.deliveryType,
      // ... other fields
    });
  };
}
```

**Why React Query:** Creating an order writes to database and needs proper error handling, retries, cache invalidation.

---

## ❌ Anti-Patterns (NEVER DO THIS!)

### ❌ Don't Duplicate Server Data in Zustand
```typescript
// ❌ BAD - Duplicating server data!
interface BadStore {
  restaurants: Restaurant[]; // This is server data!
  currentUser: User | null;  // This is server data!
}

// ✅ GOOD - Use React Query instead
const { data: restaurants } = useQuery({
  queryKey: ['restaurants'],
  queryFn: fetchRestaurants
});
```

**Why:** Creates stale data bugs. React Query already handles caching!

---

### ❌ Don't Put UI State in React Query
```typescript
// ❌ BAD - UI state doesn't belong in query cache!
const { data: isModalOpen } = useQuery({
  queryKey: ['isModalOpen'],
  queryFn: () => false
});

// ✅ GOOD - Use Zustand for UI state
const isModalOpen = useUIStore((state) => state.isModalOpen);
```

---

### ❌ Don't Manually Sync Zustand with Server
```typescript
// ❌ BAD - Manual sync creates bugs!
const updateCart = async (item) => {
  // Add to Zustand
  useCartStore.getState().addItem(item);
  
  // Also save to server?
  await fetch('/api/cart', {
    method: 'POST',
    body: JSON.stringify(item)
  });
};

// ✅ GOOD - Cart is client-only until checkout
// Only send to server during checkout mutation
```

---

## Decision Flowchart

```
Does this data exist on the server?
│
├─ YES → Use React Query
│   │
│   ├─ Reading? → useQuery
│   ├─ Writing? → useMutation
│   └─ Real-time? → useQuery with refetchInterval
│
└─ NO → Is it temporary UI state?
    │
    ├─ YES → Use Zustand
    │   │
    │   └─ Examples: modals, filters, cart (before submission)
    │
    └─ NO → Use React useState/useReducer
        │
        └─ Examples: form inputs, component-specific state
```

---

## Testing Rules

### Unit Tests
```typescript
// Test Zustand stores
import { renderHook, act } from '@testing-library/react';
import { useCartStore } from '@/lib/stores/cart-store';

test('adds item to cart', () => {
  const { result } = renderHook(() => useCartStore());
  
  act(() => {
    result.current.addItem({
      dishId: 1,
      dishName: 'Pizza',
      quantity: 1,
      subtotal: 12.99
    }, 1, 'Restaurant A');
  });
  
  expect(result.current.items).toHaveLength(1);
});
```

### Integration Tests  
```typescript
// Test React Query mutations
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

test('creates order successfully', async () => {
  const queryClient = new QueryClient();
  
  const { result } = renderHook(
    () => useMutation({ mutationFn: createOrder }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    }
  );
  
  await act(async () => {
    await result.current.mutateAsync(mockOrderData);
  });
  
  expect(result.current.isSuccess).toBe(true);
});
```

---

## Summary

| State Type | Tool | Example | Persisted? |
|-----------|------|---------|-----------|
| Shopping cart (temp) | Zustand | Cart items before checkout | localStorage |
| UI toggles | Zustand | Modal open/closed | No |
| Form drafts | Zustand | Checkout form steps | No |
| Restaurant data | React Query | Menu, dishes, hours | Cache only |
| User orders | React Query | Order history | No (always from server) |
| Creating order | React Query (mutation) | POST /api/orders | No |

**Remember:** Zustand for ephemeral, React Query for server. Never mix!

---

**Questions?** See examples in:
- `lib/stores/cart-store.ts`
- `app/(public)/r/[slug]/page.tsx`
- `components/checkout/checkout-form.tsx`
