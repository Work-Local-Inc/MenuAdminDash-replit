'use client';

import { useState } from 'react';
import { Plus, ImageOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DishModal } from './dish-modal';

interface DishImageCardProps {
  dish: any;
  restaurantId: number;
  buttonStyle?: 'rounded' | 'square' | null;
  priceColor?: string | null;
  buttonColor?: string | null;
}

export function DishImageCard({ dish, restaurantId, buttonStyle, priceColor, buttonColor }: DishImageCardProps) {
  const buttonClassName = buttonStyle === 'square' 
    ? 'rounded-none' 
    : buttonStyle === 'rounded' 
    ? 'rounded-full' 
    : '';
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
    setIsModalOpen(true);
  };
  
  return (
    <>
      <Card 
        className="hover-elevate active-elevate-2 cursor-pointer overflow-hidden group"
        onClick={() => setIsModalOpen(true)}
        data-testid={`card-dish-image-${dish.id}`}
      >
        <CardContent className="p-0">
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            {dish.image_url ? (
              <img
                src={dish.image_url}
                alt={dish.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                data-testid={`img-dish-hero-${dish.id}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <ImageOff className="w-12 h-12 text-muted-foreground/40" />
              </div>
            )}
            
            {dish.has_customization && (
              <Badge 
                variant="secondary" 
                className="absolute top-2 left-2 text-xs bg-background/90 backdrop-blur-sm"
                data-testid={`badge-customizable-${dish.id}`}
              >
                Customizable
              </Badge>
            )}
            
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickAdd();
              }}
              className={`absolute bottom-3 right-3 h-10 w-10 flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 ${buttonClassName || 'rounded-full'}`}
              style={{ backgroundColor: buttonColor || '#DC2626' }}
              data-testid={`button-add-dish-${dish.id}`}
              aria-label={`Add ${dish.name} to cart`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 
                className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 flex-1"
                data-testid={`text-dish-name-${dish.id}`}
              >
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
            
            {dish.description && dish.description.trim() !== '' && dish.description.trim() !== '-' && (
              <p 
                className="text-xs sm:text-sm text-muted-foreground line-clamp-2"
                data-testid={`text-dish-description-${dish.id}`}
              >
                {dish.description}
              </p>
            )}
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
