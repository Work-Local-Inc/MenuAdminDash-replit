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
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [isLoadingModifiers, setIsLoadingModifiers] = useState(false);
  
  const addItem = useCartStore((state) => state.addItem);
  
  // Load modifiers when modal opens
  useEffect(() => {
    if (isOpen && dish.has_customization) {
      setIsLoadingModifiers(true);
      fetch(`/api/customer/dishes/${dish.id}/modifiers`)
        .then(res => res.json())
        .then(data => {
          setModifiers(data || []);
          setIsLoadingModifiers(false);
        })
        .catch(err => {
          console.error('Error loading modifiers:', err);
          setIsLoadingModifiers(false);
        });
    }
  }, [isOpen, dish.id, dish.has_customization]);
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedSize('Regular');
      setSelectedModifiers([]);
      setQuantity(1);
      setSpecialInstructions('');
    }
  }, [isOpen]);
  
  // Parse size options (if exists as JSON)
  const sizeOptions = dish.size_options || [{ name: 'Regular', price: dish.base_price }];
  const selectedSizeOption = sizeOptions.find((s: any) => s.name === selectedSize) || sizeOptions[0];
  const sizePrice = selectedSizeOption?.price || dish.base_price || 0;
  
  const handleModifierToggle = (modifier: any, checked: boolean) => {
    if (checked) {
      setSelectedModifiers([...selectedModifiers, {
        id: modifier.id,
        name: modifier.name,
        price: modifier.price || 0,
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
                        ${(option.price / 100).toFixed(2)}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
          
          {/* Modifiers */}
          {dish.has_customization && modifiers.length > 0 && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Customize Your Order</Label>
              <div className="space-y-3">
                {modifiers.map((modifier: any) => (
                  <div key={modifier.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={`modifier-${modifier.id}`}
                      checked={selectedModifiers.some(m => m.id === modifier.id)}
                      onCheckedChange={(checked) => handleModifierToggle(modifier, checked as boolean)}
                      data-testid={`checkbox-modifier-${modifier.id}`}
                    />
                    <Label 
                      htmlFor={`modifier-${modifier.id}`} 
                      className="flex-1 cursor-pointer font-normal"
                    >
                      <div className="flex items-center justify-between">
                        <span>{modifier.name}</span>
                        {modifier.price > 0 && (
                          <span className="text-sm text-muted-foreground">
                            +${(modifier.price / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {modifier.is_required && (
                        <Badge variant="outline" className="text-xs mt-1">Required</Badge>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
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
              Add to Cart - ${(itemTotal / 100).toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
