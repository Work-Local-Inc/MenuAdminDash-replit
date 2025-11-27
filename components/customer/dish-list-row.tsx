'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DishModal } from './dish-modal';
import { useCartStore } from '@/lib/stores/cart-store';

interface DishListRowProps {
  dish: any;
  restaurantId: number;
  buttonStyle?: 'rounded' | 'square' | null;
  priceColor?: string | null;
  buttonColor?: string | null;
  isEven?: boolean;
}

export function DishListRow({ dish, restaurantId, buttonStyle, priceColor, buttonColor, isEven }: DishListRowProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  
  // Button style class
  const buttonClassName = buttonStyle === 'square' 
    ? 'rounded-none' 
    : buttonStyle === 'rounded' 
    ? 'rounded-full' 
    : '';
  
  // Get price display - show "From $X.XX" for multiple prices
  const getPriceDisplay = () => {
    // If we have a prices array with variations
    if (dish.prices && Array.isArray(dish.prices) && dish.prices.length > 0) {
      // Sort by price to get the lowest
      const sortedPrices = [...dish.prices].sort((a, b) => Number(a.price) - Number(b.price));
      const lowestPrice = Number(sortedPrices[0].price).toFixed(2);
      
      if (dish.prices.length === 1) {
        return `$${lowestPrice}`;
      }
      // Multiple prices - show "From $X.XX" like grid view
      return `From $${lowestPrice}`;
    }
    // Fallback to base_price
    if (dish.base_price) {
      return `$${Number(dish.base_price).toFixed(2)}`;
    }
    return '$0.00';
  };
  
  const priceDisplay = getPriceDisplay();
  
  const handleClick = () => {
    setIsModalOpen(true);
  };
  
  return (
    <>
      <div 
        className={`flex items-center justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${
          isEven ? 'bg-muted/20' : ''
        }`}
        onClick={handleClick}
        data-testid={`row-dish-${dish.id}`}
      >
        {/* Dish Name */}
        <span 
          className="flex-1 text-sm font-medium truncate"
          data-testid={`text-dish-name-${dish.id}`}
        >
          {dish.name}
        </span>
        
        {/* Price(s) */}
        <span 
          className={`text-sm font-semibold whitespace-nowrap ${!priceColor ? 'text-primary' : ''}`}
          style={priceColor ? { color: priceColor } : undefined}
          data-testid={`text-dish-price-${dish.id}`}
        >
          {priceDisplay}
        </span>
        
        {/* Add Button - Small circle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          className={`h-7 w-7 flex-shrink-0 inline-flex items-center justify-center text-white transition-colors hover:opacity-90 ${buttonClassName || 'rounded-md'}`}
          style={{ backgroundColor: buttonColor || '#DC2626' }}
          data-testid={`button-add-dish-${dish.id}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
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

