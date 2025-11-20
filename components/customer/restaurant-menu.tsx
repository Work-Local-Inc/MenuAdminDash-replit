'use client';

import { useState, useEffect } from 'react';
import { Store, MapPin, Clock, Phone, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DishCard } from './dish-card';
import { CartDrawer } from './cart-drawer';
import { useCartStore } from '@/lib/stores/cart-store';

interface RestaurantMenuProps {
  restaurant: any;
  courses: any[];
  hasMenu?: boolean;
}

export default function RestaurantMenu({ restaurant, courses, hasMenu = true }: RestaurantMenuProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartItemCount = useCartStore((state) => 
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const setRestaurant = useCartStore((state) => state.setRestaurant);
  
  const location = restaurant.restaurant_locations?.[0];
  const serviceConfig = restaurant.restaurant_service_configs?.[0];
  
  // Initialize cart with restaurant details
  useEffect(() => {
    // Use restaurant_delivery_zones (menuca_v3 schema) to match server-side calculation
    const activeZone = restaurant.restaurant_delivery_zones?.find(
      (zone: any) => zone.is_active && !zone.deleted_at
    );
    const deliveryFeeCents = activeZone?.delivery_fee_cents ?? 0; // Default to $0 like server
    const deliveryFee = deliveryFeeCents / 100; // Convert cents to dollars
    const minOrder = serviceConfig?.delivery_min_order || 0;
    const slug = `${restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${restaurant.id}`;
    
    setRestaurant(restaurant.id, restaurant.name, slug, deliveryFee, minOrder);
  }, [restaurant.id, restaurant.name, restaurant.restaurant_delivery_zones, serviceConfig, setRestaurant]);
  
  // Scroll to category section
  const scrollToCategory = (courseId: string) => {
    const element = document.getElementById(`category-${courseId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Restaurant Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Store className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold" data-testid="text-restaurant-name">
                  {restaurant.name}
                </h1>
              </div>
              
              {location && (
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span data-testid="text-restaurant-address">
                      {location.street_address}, {location.postal_code}
                    </span>
                  </div>
                  
                  {location.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span data-testid="text-restaurant-phone">{location.phone}</span>
                    </div>
                  )}
                  
                  {serviceConfig && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {serviceConfig.has_delivery_enabled && `Delivery: ${serviceConfig.delivery_time_minutes} min`}
                        {serviceConfig.has_delivery_enabled && serviceConfig.takeout_enabled && ' • '}
                        {serviceConfig.takeout_enabled && `Pickup: ${serviceConfig.takeout_time_minutes} min`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              {serviceConfig?.has_delivery_enabled && (
                <Badge variant="secondary" data-testid="badge-delivery">
                  Delivery Available
                </Badge>
              )}
              {serviceConfig?.takeout_enabled && (
                <Badge variant="secondary" data-testid="badge-takeout">
                  Takeout Available
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Navigation - Quick Jump Links */}
      {courses && courses.length > 1 && (
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4">
            <div className="flex gap-2 py-3 overflow-x-auto">
              {courses.map((course) => (
                <Button
                  key={course.id}
                  variant="ghost"
                  onClick={() => scrollToCategory(course.id.toString())}
                  size="sm"
                  data-testid={`button-category-${course.id}`}
                >
                  {course.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Menu Items - All Categories Shown */}
      <div className="container mx-auto px-4 py-8">
        {!hasMenu ? (
          <div className="text-center py-12">
            <p className="text-lg font-medium mb-2">Menu Coming Soon</p>
            <p className="text-muted-foreground">
              This restaurant is setting up their menu. Please check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {courses?.map((course) => {
              const courseDishes = course.dishes || [];
              if (courseDishes.length === 0) return null;
              
              return (
                <div key={course.id} id={`category-${course.id}`} className="scroll-mt-24">
                  <h2 className="text-2xl font-bold mb-6 border-b pb-2" data-testid={`heading-category-${course.id}`}>
                    {course.name}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courseDishes.map((dish: any) => (
                      <DishCard key={dish.id} dish={dish} restaurantId={restaurant.id} />
                    ))}
                  </div>
                </div>
              );
            })}
            
            {(!courses || courses.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                No menu items available
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Floating Cart Button */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-6 right-6 z-20">
          <Button
            size="lg"
            onClick={() => setIsCartOpen(true)}
            className="rounded-full shadow-lg px-6"
            data-testid="button-open-cart"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Cart ({cartItemCount})
          </Button>
        </div>
      )}
      
      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        restaurant={restaurant}
      />
    </div>
  );
}
