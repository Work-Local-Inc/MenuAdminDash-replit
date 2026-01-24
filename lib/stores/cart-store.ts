import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { trackAddToCart, trackRemoveFromCart } from '@/lib/analytics';
import { TaxConfig, TaxLineItem, calculateTaxes, getTotalTax, getTaxLabel } from '@/lib/types/tax';

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
  instanceIndex?: number; // For combo per-item sections: which item instance this modifier belongs to (0=first, 1=second, etc.)
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

// Discount tier for tiered coupons
export interface DiscountTier {
  threshold_amount: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  description?: string;
}

// Applied promo code details
export interface AppliedPromo {
  code: string;
  type: 'percent' | 'currency' | 'item' | 'delivery';
  value: number; // Percent or fixed amount
  description: string;
  promoId?: number; // ID from promotional_coupons or promotional_deals
  promoType?: 'coupon' | 'deal';
  // Tiered discount info
  isTiered?: boolean;
  activeTier?: DiscountTier | null;
  nextTier?: DiscountTier | null;
  allTiers?: DiscountTier[];
  // Targeting info for item-specific coupons
  targeting?: {
    type: string;
    mode: string;
    eligible_subtotal: number;
    total_subtotal: number;
    eligible_items_count: number;
    total_items_count: number;
  } | null;
}

interface CartStore {
  // Restaurant info
  restaurantId: number | null;
  restaurantName: string | null;
  restaurantSlug: string | null;
  restaurantAddress: string | null; // For pickup display
  restaurantPrimaryColor: string | null; // For branded checkout
  gaMeasurementId: string | null; // For GA tracking on checkout
  deliveryFee: number;
  minOrder: number;
  
  // Order type
  orderType: OrderType;
  orderTypeSelected: boolean; // Has user explicitly chosen delivery/pickup?
  pickupTime: PickupTime;
  
  // Cart items
  items: CartItem[];
  
  // Promo code
  appliedPromo: AppliedPromo | null;
  
  // Tax configuration (fetched per restaurant)
  taxConfig: TaxConfig[];
  
  // Actions
  setRestaurant: (id: number, name: string, slug: string, deliveryFee: number, minOrder: number, address?: string, primaryColor?: string, gaMeasurementId?: string | null) => void;
  setGaMeasurementId: (id: string | null) => void;
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
  
  // Tax config actions
  setTaxConfig: (config: TaxConfig[]) => void;
  
  // Computed values
  getItemCount: () => number;
  getSubtotal: () => number;
  getDiscount: () => number; // Discount amount from promo
  getTax: () => number; // Total tax amount
  getTaxBreakdown: () => TaxLineItem[]; // Itemized tax breakdown (e.g., TPS + TVQ for Quebec)
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
      gaMeasurementId: null,
      deliveryFee: 0,
      minOrder: 0,
      orderType: 'delivery' as OrderType,
      orderTypeSelected: false, // Not explicitly chosen yet
      pickupTime: { type: 'asap' } as PickupTime,
      items: [],
      appliedPromo: null,
      taxConfig: [{ type: 'HST', rate: 0.13 }] as TaxConfig[], // Default: Ontario HST 13%
      
      // Set restaurant info
      setRestaurant: (id, name, slug, deliveryFee, minOrder, address, primaryColor, gaMeasurementId) => {
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
            gaMeasurementId: gaMeasurementId ?? null,
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
            gaMeasurementId: gaMeasurementId ?? get().gaMeasurementId,
            deliveryFee,
            minOrder,
          });
        }
      },
      
      // Set GA measurement ID
      setGaMeasurementId: (id) => {
        set({ gaMeasurementId: id });
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
          set({ orderType: type, orderTypeSelected: true, pickupTime: { type: 'asap' } });
        } else {
          set({ orderType: type, orderTypeSelected: true });
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
        
        // Track add to cart event for GA
        trackAddToCart(item.dishId, item.dishName, item.sizePrice, item.quantity);
      },
      
      // Remove item from cart
      removeItem: (itemId) => {
        const itemToRemove = get().items.find(item => item.id === itemId);
        if (itemToRemove) {
          trackRemoveFromCart(itemToRemove.dishId, itemToRemove.dishName, itemToRemove.sizePrice, itemToRemove.quantity);
        }
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
          gaMeasurementId: null,
          deliveryFee: 0,
          minOrder: 0,
          orderType: 'delivery',
          orderTypeSelected: false,
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
      
      // Set tax config (called when restaurant is loaded)
      setTaxConfig: (config: TaxConfig[]) => {
        set({ taxConfig: config.length > 0 ? config : [{ type: 'HST', rate: 0.13 }] });
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
        const orderTypeSelected = get().orderTypeSelected;
        const promo = get().appliedPromo;
        
        // Don't show delivery fee until user has explicitly chosen delivery/pickup
        if (!orderTypeSelected) {
          return 0;
        }
        
        // Free delivery promo
        if (promo?.type === 'delivery') {
          return 0;
        }
        
        return orderType === 'pickup' ? 0 : get().deliveryFee;
      },
      
      // Get itemized tax breakdown - calculated after discount
      getTaxBreakdown: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscount();
        const effectiveDeliveryFee = get().getEffectiveDeliveryFee();
        const promo = get().appliedPromo;
        const taxConfig = get().taxConfig;
        
        // Don't include delivery discount in tax calc if it's a delivery promo
        const taxableDiscount = promo?.type === 'delivery' ? 0 : discount;
        const taxableAmount = Math.max(0, subtotal - taxableDiscount + effectiveDeliveryFee);
        
        return calculateTaxes(taxableAmount, taxConfig);
      },
      
      // Get total tax amount - sum of all tax lines
      getTax: () => {
        const taxBreakdown = get().getTaxBreakdown();
        return getTotalTax(taxBreakdown);
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
