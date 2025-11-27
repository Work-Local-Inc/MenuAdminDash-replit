'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DishModal } from './dish-modal';
import { useCartStore } from '@/lib/stores/cart-store';

interface DishCardProps {
  dish: any;
  restaurantId: number;
  buttonStyle?: 'rounded' | 'square' | null;
  priceColor?: string | null;
  buttonColor?: string | null;
}

export function DishCard({ dish, restaurantId, buttonStyle, priceColor, buttonColor }: DishCardProps) {
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
          {/* No-Image-First Design: Layout optimized for text, image is optional bonus */}
          <div className="flex gap-2 sm:gap-3 p-2 sm:p-3">
            {/* Optional Dish Image - Only show if exists, 64x64px */}
            {dish.image_url && (
              <img
                src={dish.image_url}
                alt={dish.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                data-testid={`img-dish-${dish.id}`}
              />
            )}
            
            {/* Dish Info - Takes full width when no image */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                {/* Name and Price - same line, wrap if needed */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 flex-1 min-w-0" data-testid={`text-dish-name-${dish.id}`}>
                    {dish.name}
                  </h3>
                  <span 
                    className={`text-sm sm:text-base font-bold flex-shrink-0 whitespace-nowrap ${!priceColor ? 'text-primary' : ''}`}
                    style={priceColor ? { color: priceColor } : undefined}
                    data-testid={`text-dish-price-${dish.id}`}
                  >
                    {hasMultiplePrices && <span className="text-xs font-normal">From </span>}
                    ${displayPrice}
                  </span>
                </div>
                
                {/* Description - only show if meaningful (not empty, not just dash) */}
                {dish.description && dish.description.trim() !== '' && dish.description.trim() !== '-' && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mb-1" data-testid={`text-dish-description-${dish.id}`}>
                    {dish.description}
                  </p>
                )}
              </div>
              
              {/* Bottom Row - Badge and Add Button */}
              <div className="flex items-center justify-between gap-1 sm:gap-2 mt-1">
                {dish.has_customization && (
                  <Badge variant="outline" className="text-xs flex-shrink-0" data-testid={`badge-customizable-${dish.id}`}>
                    Customizable
                  </Badge>
                )}
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickAdd();
                  }}
                  className={`ml-auto text-xs sm:text-sm h-8 px-2 sm:px-3 flex-shrink-0 inline-flex items-center justify-center gap-1 font-medium text-white transition-colors hover:opacity-90 ${buttonClassName || 'rounded-md'}`}
                  style={{ backgroundColor: buttonColor || '#DC2626' }}
                  data-testid={`button-add-dish-${dish.id}`}
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline sm:inline">Add</span>
                </button>
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
