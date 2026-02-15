'use client';

import { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, Tag, Sparkles, TrendingUp } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCartStore } from '@/lib/stores/cart-store';
import { getTaxLabel } from '@/lib/types/tax';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: any;
  restaurantSlug?: string;
  buttonStyle?: 'rounded' | 'square' | null;
}

export function CartDrawer({ isOpen, onClose, restaurant, restaurantSlug, buttonStyle }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, clearCart, appliedPromo, clearPromo, getDiscount, getEffectiveDeliveryFee, getTaxBreakdown, getTax, orderType } = useCartStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Helper function to get button branding class - only applies to non-icon buttons
  const getButtonClassName = (isIcon: boolean = false) => {
    if (isIcon) return ''; // Icon buttons always keep default ShadCN geometry
    
    return buttonStyle === 'square' 
      ? 'rounded-none' 
      : buttonStyle === 'rounded' 
      ? 'rounded-full' 
      : '';
  };
  
  // Calculate totals - all prices are in dollars
  // Only include delivery fee if user has explicitly selected delivery
  const effectiveDeliveryFee = getEffectiveDeliveryFee();
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = getDiscount();
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const taxBreakdown = getTaxBreakdown();
  const tax = getTax();
  const total = discountedSubtotal + effectiveDeliveryFee + tax;
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl" data-testid="text-cart-title">
              Your Cart
            </SheetTitle>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className={getButtonClassName(false)}
                data-testid="button-clear-cart"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </SheetHeader>
        
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">
              Add items from the menu to get started
            </p>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3"
                    data-testid={`cart-item-${item.dishId}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium mb-1" data-testid={`text-cart-item-name-${item.dishId}`}>
                        {item.dishName}
                      </h4>
                      {item.size && item.size !== 'Regular' && (
                        <p className="text-xs text-muted-foreground mb-1" data-testid={`text-cart-item-size-${item.dishId}`}>
                          {item.size}
                        </p>
                      )}
                      
                      {item.modifiers.length > 0 && (
                        <div className="text-sm text-muted-foreground mb-1">
                          {(() => {
                            // Consolidate duplicate modifiers (same name + placement)
                            const consolidated = new Map<string, {
                              name: string;
                              placement?: string;
                              price: number;
                              totalQty: number;
                              totalPaidQty: number;
                            }>();
                            
                            item.modifiers.forEach((mod) => {
                              const key = `${mod.name}|${mod.placement || 'whole'}`;
                              const qty = mod.quantity || 1;
                              const paidQty = mod.paidQuantity !== undefined ? mod.paidQuantity : qty;
                              
                              if (consolidated.has(key)) {
                                const existing = consolidated.get(key)!;
                                existing.totalQty += qty;
                                existing.totalPaidQty += paidQty;
                              } else {
                                consolidated.set(key, {
                                  name: mod.name,
                                  placement: mod.placement,
                                  price: mod.price,
                                  totalQty: qty,
                                  totalPaidQty: paidQty
                                });
                              }
                            });
                            
                            return Array.from(consolidated.values()).map((mod, idx) => {
                              const placementSuffix = mod.placement === 'left' ? ' (Left Half)' 
                                : mod.placement === 'right' ? ' (Right Half)' 
                                : '';
                              const qtyDisplay = mod.totalQty > 1 ? ` x${mod.totalQty}` : '';
                              const priceDisplay = mod.totalPaidQty === 0 
                                ? '(Free)' 
                                : `(+$${Number(mod.price * mod.totalPaidQty).toFixed(2)})`;
                              return (
                                <div key={idx}>+ {mod.name}{qtyDisplay}{placementSuffix} {priceDisplay}</div>
                              );
                            });
                          })()}
                        </div>
                      )}
                      
                      {item.specialInstructions && (
                        <p className="text-sm text-muted-foreground italic">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                          data-testid={`button-decrease-${item.dishId}`}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        
                        <span className="w-8 text-center font-medium" data-testid={`text-quantity-${item.dishId}`}>
                          {item.quantity}
                        </span>
                        
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          data-testid={`button-increase-${item.dishId}`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 ml-auto"
                          onClick={() => removeItem(item.id)}
                          data-testid={`button-remove-${item.dishId}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium" data-testid={`text-item-total-${item.dishId}`}>
                        ${Number(item.subtotal).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Cart Summary */}
            <div className="border-t px-6 py-4 bg-muted/30">
              {/* Applied Promo Code */}
              {appliedPromo && (
                <div className="mb-3 space-y-2">
                  <div className="p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          {appliedPromo.code} applied
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-green-600 hover:text-green-700"
                        onClick={clearPromo}
                      >
                        Remove
                      </Button>
                    </div>
                    {appliedPromo.targeting && appliedPromo.targeting.type !== 'all' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Applies to {appliedPromo.targeting.eligible_items_count} of {appliedPromo.targeting.total_items_count} items
                        <span className="ml-1">
                          (Discount on ${appliedPromo.targeting.eligible_subtotal.toFixed(2)})
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Show next tier incentive for tiered discounts */}
                  {appliedPromo.isTiered && appliedPromo.nextTier && (appliedPromo.nextTier.threshold_amount > subtotal) && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-xs text-blue-700 dark:text-blue-400">
                          Add ${Math.max(0, appliedPromo.nextTier.threshold_amount - subtotal).toFixed(2)} more to unlock{' '}
                          <strong>
                            {appliedPromo.nextTier.discount_type === 'percentage' 
                              ? `${appliedPromo.nextTier.discount_value}% off` 
                              : `$${appliedPromo.nextTier.discount_value} off`}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span data-testid="text-subtotal">${Number(subtotal).toFixed(2)}</span>
                </div>
                
                {/* Discount line */}
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Discount
                    </span>
                    <span data-testid="text-discount">-${Number(discount).toFixed(2)}</span>
                  </div>
                )}
                
                {effectiveDeliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span data-testid="text-delivery-fee">${Number(effectiveDeliveryFee).toFixed(2)}</span>
                  </div>
                )}
                
                {taxBreakdown.map((taxItem, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{getTaxLabel(taxItem.type, taxItem.rate)}</span>
                    <span data-testid={`text-tax-${taxItem.type.toLowerCase()}`}>${Number(taxItem.amount).toFixed(2)}</span>
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span 
                    data-testid="text-total"
                    style={restaurant.price_color ? { color: restaurant.price_color } : undefined}
                  >
                    ${Number(total).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <Button
                className={`w-full ${getButtonClassName(false)}`}
                size="lg"
                onClick={() => {
                  window.location.href = '/checkout';
                }}
                data-testid="button-checkout"
                style={restaurant.checkout_button_color ? { 
                  backgroundColor: restaurant.checkout_button_color,
                  borderColor: restaurant.checkout_button_color 
                } : undefined}
              >
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-clear-cart-title">Clear Cart?</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-clear-cart-description">
              This will remove all items from your cart.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-clear-cart">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-clear-cart"
              onClick={() => {
                clearCart();
                setShowClearConfirm(false);
              }}
            >
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
