'use client';

import { useState } from 'react';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DishModal } from './dish-modal';
import { useCartStore } from '@/lib/stores/cart-store';

interface DishCardProps {
  dish: any;
  restaurantId: number;
  buttonStyle?: 'rounded' | 'square' | null;
}

export function DishCard({ dish, restaurantId, buttonStyle }: DishCardProps) {
  // Apply button style based on branding
  const buttonClassName = buttonStyle === 'square' 
    ? 'rounded-none' 
    : buttonStyle === 'rounded' 
    ? 'rounded-full' 
    : '';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  
  // Extract price from prices array or use base_price fallback
  const getDisplayPrice = () => {
    if (dish.base_price) {
      return Number(dish.base_price).toFixed(2);
    }
    if (dish.prices && Array.isArray(dish.prices) && dish.prices.length > 0) {
      const lowestPrice = Math.min(...dish.prices.map((p: any) => Number(p.price)));
      return Number(lowestPrice).toFixed(2);
    }
    return '0.00';
  };
  
  const displayPrice = getDisplayPrice();
  const hasMultiplePrices = dish.prices && dish.prices.length > 1;
  
  const handleQuickAdd = () => {
    // Always open modal to ensure modifiers are handled correctly
    // The modal will handle the add-to-cart flow and enforce required modifiers
    setIsModalOpen(true);
  };
  
  return (
    <>
      <Card 
        className="hover-elevate active-elevate-2 cursor-pointer"
        onClick={() => setIsModalOpen(true)}
        data-testid={`card-dish-${dish.id}`}
      >
        <CardContent className="p-0">
          {/* Compact List Layout: Always horizontal (image left, text right) */}
          <div className="flex gap-3 p-2 sm:p-3">
            {/* Dish Image - 80x80px fixed, rounded, no background wrapper */}
            {dish.image_url ? (
              <img
                src={dish.image_url}
                alt={dish.name}
                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                data-testid={`img-dish-${dish.id}`}
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            
            {/* Dish Info - flex-1 to fill remaining space */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                {/* Name and Price - same line, wrap if needed */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 flex-1" data-testid={`text-dish-name-${dish.id}`}>
                    {dish.name}
                  </h3>
                  <span className="text-sm sm:text-base font-bold text-primary flex-shrink-0" data-testid={`text-dish-price-${dish.id}`}>
                    {hasMultiplePrices && <span className="text-xs font-normal">From </span>}
                    ${displayPrice}
                  </span>
                </div>
                
                {/* Description - only show if exists, line-clamp-1 for single line */}
                {dish.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mb-1" data-testid={`text-dish-description-${dish.id}`}>
                    {dish.description}
                  </p>
                )}
              </div>
              
              {/* Bottom Row - Badge and Add Button */}
              <div className="flex items-center justify-between gap-2 mt-1">
                {dish.has_customization && (
                  <Badge variant="outline" className="text-xs" data-testid={`badge-customizable-${dish.id}`}>
                    Customizable
                  </Badge>
                )}
                
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickAdd();
                  }}
                  className={`ml-auto text-xs sm:text-sm ${buttonClassName}`}
                  data-testid={`button-add-dish-${dish.id}`}
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <DishModal
        dish={dish}
        restaurantId={restaurantId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        buttonStyle={buttonStyle}
      />
    </>
  );
}
