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
}

export function DishCard({ dish, restaurantId }: DishCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  
  // Determine price to display - prices are already in dollars in the database
  const displayPrice = dish.base_price ? Number(dish.base_price).toFixed(2) : '0.00';
  
  const handleQuickAdd = () => {
    // If dish has customizations, open modal; otherwise add directly to cart
    if (dish.has_customization) {
      setIsModalOpen(true);
    } else {
      addItem({
        dishId: dish.id,
        dishName: dish.name,
        dishImage: dish.image_url,
        size: 'Regular',
        sizePrice: dish.base_price || 0,
        quantity: 1,
        modifiers: [],
        specialInstructions: '',
      });
    }
  };
  
  return (
    <>
      <Card 
        className="hover-elevate active-elevate-2 cursor-pointer overflow-hidden"
        onClick={() => setIsModalOpen(true)}
        data-testid={`card-dish-${dish.id}`}
      >
        <CardContent className="p-0">
          <div className="flex gap-4">
            {/* Dish Image */}
            {dish.image_url && (
              <div className="w-32 h-32 flex-shrink-0 bg-muted">
                <img
                  src={dish.image_url}
                  alt={dish.name}
                  className="w-full h-full object-cover"
                  data-testid={`img-dish-${dish.id}`}
                />
              </div>
            )}
            
            {/* Dish Info */}
            <div className="flex-1 p-4 flex flex-col justify-between min-h-[128px]">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-base leading-tight" data-testid={`text-dish-name-${dish.id}`}>
                    {dish.name}
                  </h3>
                  <span className="text-base font-bold whitespace-nowrap" data-testid={`text-dish-price-${dish.id}`}>
                    ${displayPrice}
                  </span>
                </div>
                
                {dish.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2" data-testid={`text-dish-description-${dish.id}`}>
                    {dish.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-between gap-2">
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
                  className="ml-auto"
                  data-testid={`button-add-dish-${dish.id}`}
                >
                  <Plus className="w-4 h-4 mr-1" />
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
      />
    </>
  );
}
