'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCartStore } from '@/lib/stores/cart-store';
import type { CartModifier } from '@/lib/stores/cart-store';
import type { ModifierGroupWithModifiers } from '@/lib/types/menu';

interface DishModalProps {
  dish: any;
  restaurantId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function DishModal({ dish, restaurantId, isOpen, onClose }: DishModalProps) {
  const [selectedSize, setSelectedSize] = useState<string>('Regular');
  const [selectedModifiers, setSelectedModifiers] = useState<CartModifier[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupWithModifiers[]>([]);
  const [isLoadingModifiers, setIsLoadingModifiers] = useState(false);
  const [groupSelections, setGroupSelections] = useState<Record<number, number[]>>({});
  
  const addItem = useCartStore((state) => state.addItem);
  
  // Load modifiers when modal opens
  useEffect(() => {
    if (isOpen && dish.id) {
      setIsLoadingModifiers(true);
      console.log(`[DishModal] Fetching modifiers for dish ${dish.id}...`);
      fetch(`/api/customer/dishes/${dish.id}/modifiers`)
        .then(res => res.json())
        .then(data => {
          console.log(`[DishModal] Received ${data?.length || 0} modifier groups for dish ${dish.id}:`, data);
          setModifierGroups(data || []);
          setIsLoadingModifiers(false);
        })
        .catch(err => {
          console.error('Error loading modifiers:', err);
          setIsLoadingModifiers(false);
        });
    }
  }, [isOpen, dish.id]);
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Set default size to first available option
      const defaultSize = dish.prices?.[0]?.size_variant || 'Regular';
      setSelectedSize(defaultSize);
      setSelectedModifiers([]);
      setQuantity(1);
      setSpecialInstructions('');
      setGroupSelections({});
    }
  }, [isOpen, dish.prices]);
  
  // Parse size options from prices array or fallback to base_price
  const getSizeOptions = () => {
    if (dish.prices && Array.isArray(dish.prices) && dish.prices.length > 0) {
      return dish.prices.map((p: any) => ({
        name: p.size_variant,
        price: p.price
      }));
    }
    if (dish.size_options) {
      return dish.size_options;
    }
    return [{ name: 'Regular', price: dish.base_price || 0 }];
  };
  
  const sizeOptions = getSizeOptions();
  const selectedSizeOption = sizeOptions.find((s: any) => s.name === selectedSize) || sizeOptions[0];
  const sizePrice = selectedSizeOption?.price || 0;
  
  // Get modifier price for selected size
  const getModifierPrice = (modifier: any): number => {
    if (!modifier.prices || modifier.prices.length === 0) return 0;
    const priceForSize = modifier.prices.find((p: any) => p.size_variant === selectedSize);
    return priceForSize?.price || modifier.prices[0]?.price || 0;
  };

  // Handle modifier selection/deselection
  const handleModifierToggle = (group: ModifierGroupWithModifiers, modifierId: number, checked: boolean) => {
    const currentSelections = groupSelections[group.id] || [];
    let newSelections: number[];

    if (group.max_selections === 1) {
      newSelections = checked ? [modifierId] : [];
    } else {
      if (checked) {
        if (group.max_selections === 0 || currentSelections.length < group.max_selections) {
          newSelections = [...currentSelections, modifierId];
        } else {
          return;
        }
      } else {
        newSelections = currentSelections.filter(id => id !== modifierId);
      }
    }

    setGroupSelections({ ...groupSelections, [group.id]: newSelections });

    const modifier = group.modifiers.find(m => m.id === modifierId);
    if (!modifier) return;

    const price = getModifierPrice(modifier);

    if (checked) {
      setSelectedModifiers([...selectedModifiers, {
        id: modifier.id,
        name: modifier.name,
        price,
      }]);
    } else {
      setSelectedModifiers(selectedModifiers.filter(m => m.id !== modifier.id));
    }
  };
  
  const handleAddToCart = () => {
    addItem({
      dishId: dish.id,
      dishName: dish.name,
      dishImage: dish.image_url,
      size: selectedSize,
      sizePrice,
      quantity,
      modifiers: selectedModifiers,
      specialInstructions: specialInstructions.trim(),
    });
    
    onClose();
  };
  
  const itemTotal = (sizePrice + selectedModifiers.reduce((sum, m) => sum + m.price, 0)) * quantity;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid={`modal-dish-${dish.id}`}>
        <DialogHeader>
          <DialogTitle className="text-2xl" data-testid={`text-modal-title-${dish.id}`}>
            {dish.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Dish Image */}
          {dish.image_url && (
            <div className="w-full h-64 bg-muted rounded-md overflow-hidden">
              <img
                src={dish.image_url}
                alt={dish.name}
                className="w-full h-full object-cover"
                data-testid={`img-modal-dish-${dish.id}`}
              />
            </div>
          )}
          
          {/* Description */}
          {dish.description && (
            <p className="text-muted-foreground" data-testid={`text-modal-description-${dish.id}`}>
              {dish.description}
            </p>
          )}
          
          {/* Size Selection */}
          {Array.isArray(sizeOptions) && sizeOptions.length > 1 && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Size</Label>
              <RadioGroup value={selectedSize} onValueChange={setSelectedSize}>
                {sizeOptions.map((option: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem 
                      value={option.name} 
                      id={`size-${idx}`}
                      data-testid={`radio-size-${option.name}`}
                    />
                    <Label htmlFor={`size-${idx}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">{option.name}</span>
                      <span className="text-muted-foreground ml-2">
                        ${Number(option.price).toFixed(2)}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
          
          {/* Modifier Groups */}
          {modifierGroups.length > 0 ? (
            <div className="space-y-6">
              {modifierGroups.map((group) => {
                const groupSelected = groupSelections[group.id] || [];
                const isMaxSelections = group.max_selections > 0 && groupSelected.length >= group.max_selections;

                return (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">
                        {group.name}
                        {group.is_required && (
                          <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                        )}
                      </Label>
                      {group.max_selections > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {group.max_selections === 1 ? 'Choose 1' : `Choose up to ${group.max_selections}`}
                        </span>
                      )}
                    </div>
                    
                    {group.instructions && (
                      <p className="text-sm text-muted-foreground">{group.instructions}</p>
                    )}
                    
                    {group.max_selections === 1 ? (
                      <RadioGroup
                        value={groupSelected[0]?.toString() || ''}
                        onValueChange={(value) => {
                          const modifierId = parseInt(value);
                          const oldSelection = groupSelected[0];
                          if (oldSelection) {
                            handleModifierToggle(group, oldSelection, false);
                          }
                          handleModifierToggle(group, modifierId, true);
                        }}
                      >
                        {group.modifiers.map((modifier) => {
                          const price = getModifierPrice(modifier);
                          return (
                            <div key={modifier.id} className="flex items-center space-x-2 mb-2">
                              <RadioGroupItem
                                value={modifier.id.toString()}
                                id={`modifier-${modifier.id}`}
                                data-testid={`radio-modifier-${modifier.id}`}
                              />
                              <Label htmlFor={`modifier-${modifier.id}`} className="flex-1 cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <span>{modifier.name}</span>
                                  {price > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                      +${Number(price).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-2">
                        {group.modifiers.map((modifier) => {
                          const price = getModifierPrice(modifier);
                          const isSelected = groupSelected.includes(modifier.id);
                          const isDisabled = !isSelected && isMaxSelections;
                          
                          return (
                            <div key={modifier.id} className="flex items-start space-x-3">
                              <Checkbox
                                id={`modifier-${modifier.id}`}
                                checked={isSelected}
                                disabled={isDisabled}
                                onCheckedChange={(checked) => handleModifierToggle(group, modifier.id, checked as boolean)}
                                data-testid={`checkbox-modifier-${modifier.id}`}
                              />
                              <Label 
                                htmlFor={`modifier-${modifier.id}`} 
                                className={`flex-1 cursor-pointer font-normal ${isDisabled ? 'opacity-50' : ''}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{modifier.name}</span>
                                  {price > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                      +${Number(price).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            isLoadingModifiers ? (
              <div className="text-center py-4 text-muted-foreground">Loading modifiers...</div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                {console.log('[DishModal] No modifier groups to display')}
              </div>
            )
          )}
          
          {/* Special Instructions */}
          <div>
            <Label htmlFor="special-instructions" className="text-base font-semibold mb-3 block">
              Special Instructions (Optional)
            </Label>
            <Textarea
              id="special-instructions"
              placeholder="e.g., No onions, extra sauce..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
              data-testid="input-special-instructions"
            />
          </div>
          
          {/* Quantity and Add to Cart */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Label className="font-semibold">Quantity:</Label>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  data-testid="button-decrease-quantity"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                
                <span className="w-12 text-center font-semibold text-lg" data-testid="text-quantity">
                  {quantity}
                </span>
                
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setQuantity(quantity + 1)}
                  data-testid="button-increase-quantity"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Button
              size="lg"
              onClick={handleAddToCart}
              className="px-8"
              data-testid="button-add-to-cart"
            >
              Add to Cart - ${Number(itemTotal).toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
