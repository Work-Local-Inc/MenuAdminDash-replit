import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type OrderType = 'delivery' | 'pickup';

export interface PickupTime {
  type: 'asap' | 'scheduled';
  scheduledTime?: string; // ISO date string for scheduled pickup
}

export type PlacementType = 'whole' | 'left' | 'right';

export interface CartModifier {
  id: number;
  name: string;
  price: number;
  quantity?: number; // For multiple of same modifier (e.g., 5 Creamy Garlic dips), default 1
  paidQuantity?: number; // For free items tracking: how many of quantity are paid (after free items applied)
  placement?: PlacementType; // For pizza toppings: whole, left, or right
}

export interface CartItem {
  id: string; // unique ID for cart item (dishId + size + modifiers hash)
  dishId: number;
  dishName: string;
  dishImage?: string;
  size: string;
  sizePrice: number;
  quantity: number;
  modifiers: CartModifier[];
  specialInstructions?: string;
  subtotal: number; // (sizePrice + sum of modifier prices) * quantity
}

// Applied promo code details
export interface AppliedPromo {
  code: string;
  type: 'percent' | 'currency' | 'item' | 'delivery';
  value: number; // Percent or fixed amount
  description: string;
  promoId?: number; // ID from promotional_coupons or promotional_deals
  promoType?: 'coupon' | 'deal';
}

interface CartStore {
  // Restaurant info
  restaurantId: number | null;
  restaurantName: string | null;
  restaurantSlug: string | null;
  restaurantAddress: string | null; // For pickup display
  restaurantPrimaryColor: string | null; // For branded checkout
  deliveryFee: number;
  minOrder: number;
  
  // Order type
  orderType: OrderType;
  pickupTime: PickupTime;
  
  // Cart items
  items: CartItem[];
  
  // Promo code
  appliedPromo: AppliedPromo | null;
  
  // Actions
  setRestaurant: (id: number, name: string, slug: string, deliveryFee: number, minOrder: number, address?: string, primaryColor?: string) => void;
  setRestaurantAddress: (address: string) => void;
  setDeliveryFee: (fee: number) => void;
  setMinOrder: (minOrder: number) => void;
  setOrderType: (type: OrderType) => void;
  setPickupTime: (time: PickupTime) => void;
  addItem: (item: Omit<CartItem, 'id' | 'subtotal'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Promo code actions
  applyPromo: (promo: AppliedPromo) => void;
  clearPromo: () => void;
  
  // Computed values
  getItemCount: () => number;
  getSubtotal: () => number;
  getDiscount: () => number; // Discount amount from promo
  getTax: () => number; // 13% HST (Ontario)
  getTotal: () => number;
  getEffectiveDeliveryFee: () => number; // Returns 0 for pickup
}

// Helper function to generate unique cart item ID
function generateCartItemId(
  dishId: number,
  size: string,
  modifiers: CartModifier[],
  specialInstructions?: string
): string {
  // Include placement and quantity in modifier hash so same topping with different placements/quantities are separate items
  const modifierHash = modifiers
    .map(m => `${m.id}:${m.placement || 'whole'}:${m.quantity || 1}`)
    .sort()
    .join('-');
  const instructions = specialInstructions?.trim() || '';
  return `${dishId}-${size}-${modifierHash}-${instructions}`.toLowerCase();
}

// Helper function to calculate item subtotal
function calculateSubtotal(
  sizePrice: number,
  modifiers: CartModifier[],
  quantity: number
): number {
  // Use paidQuantity if available (for combo modifiers with free items)
  // Otherwise fall back to quantity for simple modifiers
  const modifierTotal = modifiers.reduce((sum, m) => {
    const paidQty = m.paidQuantity !== undefined ? m.paidQuantity : (m.quantity || 1);
    return sum + (m.price * paidQty);
  }, 0);
  return (sizePrice + modifierTotal) * quantity;
}

// SSR-safe storage: returns localStorage on client, no-op storage on server
const getStorage = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return localStorage;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      restaurantId: null,
      restaurantName: null,
      restaurantSlug: null,
      restaurantAddress: null,
      restaurantPrimaryColor: null,
      deliveryFee: 0,
      minOrder: 0,
      orderType: 'delivery' as OrderType,
      pickupTime: { type: 'asap' } as PickupTime,
      items: [],
      appliedPromo: null,
      
      // Set restaurant info
      setRestaurant: (id, name, slug, deliveryFee, minOrder, address, primaryColor) => {
        const currentRestaurantId = get().restaurantId;
        
        // If switching to a different restaurant with items in cart, confirm clear
        if (currentRestaurantId && currentRestaurantId !== id && get().items.length > 0) {
          // Only handle restaurant switching on client side
          if (typeof window === 'undefined') {
            // On server, don't auto-clear cart - just skip the update
            return;
          }
          
          const confirmed = window.confirm(
            `Your cart contains items from ${get().restaurantName}. Clear cart and switch to ${name}?`
          );
          
          if (!confirmed) {
            return; // User cancelled, don't switch
          }
          
          // User confirmed, clear cart and switch
          set({
            restaurantId: id,
            restaurantName: name,
            restaurantSlug: slug,
            restaurantAddress: address || null,
            restaurantPrimaryColor: primaryColor || null,
            deliveryFee,
            minOrder,
            orderType: 'delivery',
            pickupTime: { type: 'asap' },
            items: [],
          });
        } else {
          // No conflict, just update restaurant info
          // Always update primaryColor to ensure current restaurant's color is used
          set({
            restaurantId: id,
            restaurantName: name,
            restaurantSlug: slug,
            restaurantAddress: address || get().restaurantAddress,
            restaurantPrimaryColor: primaryColor ?? null,
            deliveryFee,
            minOrder,
          });
        }
      },
      
      // Set restaurant address for pickup display
      setRestaurantAddress: (address) => {
        set({ restaurantAddress: address });
      },
      
      // Update delivery fee (from zone validation)
      setDeliveryFee: (fee) => {
        set({ deliveryFee: fee });
      },
      
      // Update min order (from zone validation)
      setMinOrder: (minOrder) => {
        set({ minOrder });
      },
      
      // Set order type (delivery or pickup)
      // Reset pickupTime to ASAP when switching to avoid stale scheduled times
      // that might not be valid for the new service type's schedule
      setOrderType: (type) => {
        const currentType = get().orderType;
        if (currentType !== type) {
          // Reset to ASAP when switching order types
          set({ orderType: type, pickupTime: { type: 'asap' } });
        } else {
          set({ orderType: type });
        }
      },
      
      // Set pickup time
      setPickupTime: (time) => {
        set({ pickupTime: time });
      },
      
      // Add item to cart
      addItem: (item) => {
        const id = generateCartItemId(
          item.dishId,
          item.size,
          item.modifiers,
          item.specialInstructions
        );
        
        const subtotal = calculateSubtotal(
          item.sizePrice,
          item.modifiers,
          item.quantity
        );
        
        const newItem: CartItem = {
          ...item,
          id,
          subtotal,
        };
        
        const items = get().items;
        const existingIndex = items.findIndex(i => i.id === id);
        
        if (existingIndex >= 0) {
          // Item already exists, increase quantity
          const updatedItems = [...items];
          const existingItem = updatedItems[existingIndex];
          existingItem.quantity += item.quantity;
          existingItem.subtotal = calculateSubtotal(
            existingItem.sizePrice,
            existingItem.modifiers,
            existingItem.quantity
          );
          set({ items: updatedItems });
        } else {
          // New item, add to cart
          set({ items: [...items, newItem] });
        }
      },
      
      // Remove item from cart
      removeItem: (itemId) => {
        set({ items: get().items.filter(item => item.id !== itemId) });
      },
      
      // Update item quantity
      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        
        const items = get().items;
        const updatedItems = items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              quantity,
              subtotal: calculateSubtotal(item.sizePrice, item.modifiers, quantity),
            };
          }
          return item;
        });
        
        set({ items: updatedItems });
      },
      
      // Clear cart
      clearCart: () => {
        set({
          restaurantId: null,
          restaurantName: null,
          restaurantSlug: null,
          restaurantAddress: null,
          deliveryFee: 0,
          minOrder: 0,
          orderType: 'delivery',
          pickupTime: { type: 'asap' },
          items: [],
          appliedPromo: null,
        });
      },
      
      // Apply promo code
      applyPromo: (promo) => {
        set({ appliedPromo: promo });
      },
      
      // Clear promo code
      clearPromo: () => {
        set({ appliedPromo: null });
      },
      
      // Get total item count
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
      
      // Get subtotal (sum of all item subtotals)
      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.subtotal, 0);
      },
      
      // Get discount amount from applied promo
      getDiscount: () => {
        const promo = get().appliedPromo;
        if (!promo) return 0;
        
        const subtotal = get().getSubtotal();
        const deliveryFee = get().orderType === 'pickup' ? 0 : get().deliveryFee;
        
        switch (promo.type) {
          case 'percent':
            // Percentage off subtotal
            return Math.min(subtotal * (promo.value / 100), subtotal);
          case 'currency':
            // Fixed amount off (can't exceed subtotal)
            return Math.min(promo.value, subtotal);
          case 'delivery':
            // Free delivery
            return deliveryFee;
          case 'item':
            // Free item - value represents item price
            return promo.value;
          default:
            return 0;
        }
      },
      
      // Get effective delivery fee (0 for pickup orders)
      getEffectiveDeliveryFee: () => {
        const orderType = get().orderType;
        const promo = get().appliedPromo;
        
        // Free delivery promo
        if (promo?.type === 'delivery') {
          return 0;
        }
        
        return orderType === 'pickup' ? 0 : get().deliveryFee;
      },
      
      // Get tax (13% HST Ontario) - calculated after discount
      getTax: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscount();
        const effectiveDeliveryFee = get().getEffectiveDeliveryFee();
        const promo = get().appliedPromo;
        
        // Don't include delivery discount in tax calc if it's a delivery promo
        const taxableDiscount = promo?.type === 'delivery' ? 0 : discount;
        
        return Math.max(0, (subtotal - taxableDiscount + effectiveDeliveryFee) * 0.13);
      },
      
      // Get total (subtotal + delivery fee - discount + tax)
      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscount();
        const effectiveDeliveryFee = get().getEffectiveDeliveryFee();
        const tax = get().getTax();
        const promo = get().appliedPromo;
        
        // Don't double-count delivery discount
        const nonDeliveryDiscount = promo?.type === 'delivery' ? 0 : discount;
        
        return Math.max(0, subtotal + effectiveDeliveryFee - nonDeliveryDiscount + tax);
      },
    }),
    {
      name: 'menu-ca-cart',
      storage: createJSONStorage(() => getStorage()),
    }
  )
);
