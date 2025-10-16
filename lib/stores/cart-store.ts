import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartModifier {
  id: number;
  name: string;
  price: number;
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

interface CartStore {
  // Restaurant info
  restaurantId: number | null;
  restaurantName: string | null;
  restaurantSlug: string | null;
  deliveryFee: number;
  minOrder: number;
  
  // Cart items
  items: CartItem[];
  
  // Actions
  setRestaurant: (id: number, name: string, slug: string, deliveryFee: number, minOrder: number) => void;
  addItem: (item: Omit<CartItem, 'id' | 'subtotal'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Computed values
  getItemCount: () => number;
  getSubtotal: () => number;
  getTax: () => number; // 13% HST (Ontario)
  getTotal: () => number;
}

// Helper function to generate unique cart item ID
function generateCartItemId(
  dishId: number,
  size: string,
  modifiers: CartModifier[],
  specialInstructions?: string
): string {
  const modifierIds = modifiers.map(m => m.id).sort().join('-');
  const instructions = specialInstructions?.trim() || '';
  return `${dishId}-${size}-${modifierIds}-${instructions}`.toLowerCase();
}

// Helper function to calculate item subtotal
function calculateSubtotal(
  sizePrice: number,
  modifiers: CartModifier[],
  quantity: number
): number {
  const modifierTotal = modifiers.reduce((sum, m) => sum + m.price, 0);
  return (sizePrice + modifierTotal) * quantity;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      restaurantId: null,
      restaurantName: null,
      restaurantSlug: null,
      deliveryFee: 0,
      minOrder: 0,
      items: [],
      
      // Set restaurant info
      setRestaurant: (id, name, slug, deliveryFee, minOrder) => {
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
            deliveryFee,
            minOrder,
            items: [],
          });
        } else {
          // No conflict, just update restaurant info
          set({
            restaurantId: id,
            restaurantName: name,
            restaurantSlug: slug,
            deliveryFee,
            minOrder,
          });
        }
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
          deliveryFee: 0,
          minOrder: 0,
          items: [],
        });
      },
      
      // Get total item count
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
      
      // Get subtotal (sum of all item subtotals)
      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.subtotal, 0);
      },
      
      // Get tax (13% HST Ontario)
      getTax: () => {
        const subtotal = get().getSubtotal();
        const deliveryFee = get().deliveryFee;
        return (subtotal + deliveryFee) * 0.13;
      },
      
      // Get total (subtotal + delivery fee + tax)
      getTotal: () => {
        const subtotal = get().getSubtotal();
        const deliveryFee = get().deliveryFee;
        const tax = get().getTax();
        return subtotal + deliveryFee + tax;
      },
    }),
    {
      name: 'menu-ca-cart', // localStorage key
    }
  )
);
