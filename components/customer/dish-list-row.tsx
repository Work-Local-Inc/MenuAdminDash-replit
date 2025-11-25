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
  isEven?: boolean;
}

export function DishListRow({ dish, restaurantId, buttonStyle, priceColor, isEven }: DishListRowProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  
  // Button style class
  const buttonClassName = buttonStyle === 'square' 
    ? 'rounded-none' 
    : buttonStyle === 'rounded' 
    ? 'rounded-full' 
    : '';
  
  // Get all prices to display
  const getPriceDisplay = () => {
    // If we have a prices array with variations
    if (dish.prices && Array.isArray(dish.prices) && dish.prices.length > 0) {
      if (dish.prices.length === 1) {
        return `$${Number(dish.prices[0].price).toFixed(2)}`;
      }
      // Multiple prices - show inline
      return dish.prices
        .map((p: any) => {
          const label = p.label || p.size || '';
          const price = `$${Number(p.price).toFixed(2)}`;
          return label ? `${label} ${price}` : price;
        })
        .join(' • ');
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
        <Button
          size="icon"
          variant="default"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          className={`h-7 w-7 flex-shrink-0 ${buttonClassName}`}
          data-testid={`button-add-dish-${dish.id}`}
        >
          <Plus className="w-4 h-4" />
        </Button>
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

