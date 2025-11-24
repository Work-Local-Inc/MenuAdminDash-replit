'use client';

import { useState, useEffect } from 'react';
import { Store, MapPin, Clock, Phone, ShoppingCart, GripVertical, Pencil, Trash2, Plus, Eye, EyeOff, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DishCard } from './dish-card';
import { CartDrawer } from './cart-drawer';
import { useCartStore } from '@/lib/stores/cart-store';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { CategoryModifierAssociation } from '@/components/admin/menu-builder/CategoryModifierAssociation';

interface RestaurantMenuProps {
  restaurant: any;
  courses: any[];
  hasMenu?: boolean;
  editorMode?: boolean;
  availableModifierGroups?: any[];
  getCategoryModifierIds?: (categoryId: number) => number[];
  onToggleCategoryModifier?: (categoryId: number, modifierGroupId: number, isAssociated: boolean) => Promise<void>;
  onEditCategory?: (categoryId: number) => void;
  onDeleteCategory?: (categoryId: number) => void;
  onToggleCategoryActive?: (categoryId: number) => void;
  onAddDish?: (categoryId: number) => void;
  onEditDish?: (dishId: number) => void;
  onDeleteDish?: (dishId: number) => void;
  onToggleDishActive?: (dishId: number) => void;
  onToggleDishFeatured?: (dishId: number) => void;
  onReorderCategories?: (categoryIds: number[]) => void;
  onReorderDishes?: (categoryId: number, dishIds: number[]) => void;
  selectedDishIds?: Set<number>;
  onToggleSelectDish?: (dishId: number) => void;
}

export default function RestaurantMenu({ 
  restaurant, 
  courses, 
  hasMenu = true,
  editorMode = false,
  availableModifierGroups = [],
  getCategoryModifierIds,
  onToggleCategoryModifier,
  onEditCategory,
  onDeleteCategory,
  onToggleCategoryActive,
  onAddDish,
  onEditDish,
  onDeleteDish,
  onToggleDishActive,
  onToggleDishFeatured,
  onReorderCategories,
  onReorderDishes,
  selectedDishIds,
  onToggleSelectDish,
}: RestaurantMenuProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartItemCount = useCartStore((state) => 
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const setRestaurant = useCartStore((state) => state.setRestaurant);
  
  const location = restaurant.restaurant_locations?.[0];
  const serviceConfig = restaurant.restaurant_service_configs?.[0];
  
  // Initialize cart with restaurant details (only in customer mode)
  useEffect(() => {
    if (!editorMode) {
      const activeZone = restaurant.restaurant_delivery_zones?.find(
        (zone: any) => zone.is_active && !zone.deleted_at
      );
      const deliveryFeeCents = activeZone?.delivery_fee_cents ?? 0;
      const deliveryFee = deliveryFeeCents / 100;
      const minOrder = serviceConfig?.delivery_min_order || 0;
      const slug = `${restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${restaurant.id}`;
      
      setRestaurant(restaurant.id, restaurant.name, slug, deliveryFee, minOrder);
    }
  }, [editorMode, restaurant.id, restaurant.name, restaurant.restaurant_delivery_zones, serviceConfig, setRestaurant]);
  
  // Scroll to category section
  const scrollToCategory = (courseId: string) => {
    const element = document.getElementById(`category-${courseId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Unified drag handler for BOTH categories and dishes
  const handleUnifiedDragEnd = (result: DropResult) => {
    if (!result.destination || !editorMode) return;

    // Check the type to determine what's being dragged
    if (result.type === 'CATEGORY') {
      // Category reordering
      if (!onReorderCategories) return;
      
      const items = Array.from(courses);
      const [reordered] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reordered);
      onReorderCategories(items.map(c => c.id));
    } else if (result.type === 'DISH') {
      // Dish reordering
      if (!onReorderDishes) return;
      
      // Extract categoryId from droppableId (format: "category-123-dishes")
      const sourceCategoryId = parseInt(result.source.droppableId.split('-')[1]);
      const destCategoryId = parseInt(result.destination.droppableId.split('-')[1]);
      
      // Check if moving within same category or to different category
      if (sourceCategoryId === destCategoryId) {
        // Reorder within same category (existing logic)
        const category = courses.find(c => c.id === sourceCategoryId);
        if (!category) return;
        
        const items = Array.from(category.dishes || []);
        const [reordered] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reordered);
        onReorderDishes(sourceCategoryId, items.map((d: any) => d.id));
      } else {
        // Moving dish to different category
        // For now, prevent cross-category moves (return early)
        // Backend would need onMoveDishToCategory(dishId, newCategoryId, newIndex)
        return;
      }
    }
  };

  const menuContent = (
    <div className="min-h-screen bg-background">
      {/* Banner Image - Responsive Height */}
      {restaurant.banner_image_url && (
        <div className="w-full h-20 sm:h-24 md:h-32 bg-muted relative overflow-hidden">
          <img
            src={restaurant.banner_image_url}
            alt={`${restaurant.name} banner`}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Restaurant Header - Responsive Layout */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                {restaurant.logo_url ? (
                  <img 
                    src={restaurant.logo_url} 
                    alt={restaurant.name} 
                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded flex-shrink-0"
                  />
                ) : (
                  <Store className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                )}
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate" data-testid="text-restaurant-name">
                  {restaurant.name}
                </h1>
                {editorMode && (
                  <Badge variant="outline" className="ml-2 hidden sm:inline-flex">
                    Editor Mode
                  </Badge>
                )}
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
            
            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 flex-shrink-0">
              {serviceConfig?.has_delivery_enabled && (
                <Badge variant="secondary" className="text-xs sm:text-sm" data-testid="badge-delivery">
                  <span className="hidden sm:inline">Delivery Available</span>
                  <span className="sm:hidden">Delivery</span>
                </Badge>
              )}
              {serviceConfig?.takeout_enabled && (
                <Badge variant="secondary" className="text-xs sm:text-sm" data-testid="badge-takeout">
                  <span className="hidden sm:inline">Takeout Available</span>
                  <span className="sm:hidden">Takeout</span>
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Navigation - Quick Jump Links (Editor Mode Only) */}
      {editorMode && courses && courses.length > 1 && (
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex gap-2 py-2 sm:py-3 overflow-x-auto">
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
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {!hasMenu ? (
          <div className="text-center py-12">
            <p className="text-lg font-medium mb-2">Menu Coming Soon</p>
            <p className="text-muted-foreground">
              This restaurant is setting up their menu. Please check back later.
            </p>
          </div>
        ) : editorMode ? (
          <DragDropContext onDragEnd={handleUnifiedDragEnd}>
            <Droppable droppableId="categories" type="CATEGORY">
              {(provided, dropSnapshot) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className={`space-y-12 transition-all duration-200 ${
                    dropSnapshot.isDraggingOver 
                      ? 'bg-primary/5 p-4 rounded-lg' 
                      : ''
                  }`}
                >
                  {courses?.map((course, courseIndex) => {
                    const courseDishes = course.dishes || [];
                    
                    return (
                      <Draggable
                        key={course.id}
                        draggableId={`category-${course.id}`}
                        index={courseIndex}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            id={`category-${course.id}`}
                            className={`scroll-mt-24 transition-all duration-200 ${
                              snapshot.isDragging 
                                ? 'opacity-90 scale-[1.02] shadow-2xl rotate-1 z-50' 
                                : ''
                            }`}
                          >
                      {/* Category Header with Editor Controls */}
                      <div className="flex items-center gap-3 mb-6 pb-2 border-b">
                        {editorMode && (
                          <div
                            {...provided.dragHandleProps}
                            className="p-2 rounded-md hover-elevate active-elevate-2 cursor-grab active:cursor-grabbing"
                            data-testid={`drag-handle-category-${course.id}`}
                          >
                            <GripVertical className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        
                        <h2 
                          className="text-2xl font-bold flex-1" 
                          data-testid={`heading-category-${course.id}`}
                        >
                          {course.name}
                          {!course.is_active && editorMode && (
                            <Badge variant="secondary" className="ml-2">Inactive</Badge>
                          )}
                        </h2>
                        
                        {editorMode && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => onAddDish?.(course.id)}
                              data-testid={`button-add-dish-${course.id}`}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Dish
                            </Button>
                            
                            {onToggleCategoryModifier && getCategoryModifierIds && (
                              <CategoryModifierAssociation
                                categoryId={course.id}
                                categoryName={course.name}
                                availableGroups={availableModifierGroups}
                                associatedGroupIds={getCategoryModifierIds(course.id)}
                                onToggleAssociation={async (groupId, isAssociated) => {
                                  await onToggleCategoryModifier(course.id, groupId, isAssociated)
                                }}
                              />
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  data-testid={`button-category-menu-${course.id}`}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => onEditCategory?.(course.id)}
                                  data-testid={`button-edit-category-${course.id}`}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit Category
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => onToggleCategoryActive?.(course.id)}
                                  data-testid={`button-toggle-category-active-${course.id}`}
                                >
                                  {course.is_active ? (
                                    <>
                                      <EyeOff className="w-4 h-4 mr-2" />
                                      Mark Inactive
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-4 h-4 mr-2" />
                                      Mark Active
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onDeleteCategory?.(course.id)}
                                  className="text-destructive"
                                  data-testid={`button-delete-category-${course.id}`}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Category
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                      
                      {/* Dishes Grid */}
                      {courseDishes.length === 0 ? (
                        editorMode ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <p>No dishes in this category yet.</p>
                            <Button
                              variant="outline"
                              onClick={() => onAddDish?.(course.id)}
                              className="mt-4"
                              data-testid={`button-add-first-dish-${course.id}`}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add First Dish
                            </Button>
                          </div>
                        ) : null
                      ) : (
                        <Droppable droppableId={`category-${course.id}-dishes`} type="DISH">
                          {(dishProvided, dishDropSnapshot) => (
                            <div
                              {...dishProvided.droppableProps}
                              ref={dishProvided.innerRef}
                              className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-200 rounded-lg ${
                                dishDropSnapshot.isDraggingOver 
                                  ? 'bg-primary/5 ring-2 ring-primary/20 ring-offset-2' 
                                  : ''
                              }`}
                            >
                              {courseDishes.map((dish: any, dishIndex: number) => (
                                <Draggable
                                  key={dish.id}
                                  draggableId={`dish-${dish.id}`}
                                  index={dishIndex}
                                >
                                  {(dishDragProvided, dishSnapshot) => (
                                    <div
                                      ref={dishDragProvided.innerRef}
                                      {...dishDragProvided.draggableProps}
                                      className={`transition-all duration-200 ${
                                        dishSnapshot.isDragging 
                                          ? 'opacity-80 scale-105 shadow-xl rotate-2 z-50' 
                                          : ''
                                      }`}
                                    >
                                      <EditorDishCard
                                        dish={dish}
                                        onEdit={() => onEditDish?.(dish.id)}
                                        onDelete={() => onDeleteDish?.(dish.id)}
                                        onToggleActive={() => onToggleDishActive?.(dish.id)}
                                        onToggleFeatured={() => onToggleDishFeatured?.(dish.id)}
                                        dragHandleProps={dishDragProvided.dragHandleProps}
                                        isSelected={selectedDishIds?.has(dish.id) || false}
                                        onToggleSelect={() => onToggleSelectDish?.(dish.id)}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {dishProvided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  
                  {(!courses || courses.length === 0) && (
                    <div className="text-center py-12 text-muted-foreground">
                      No menu items available
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="space-y-8">
            {courses?.map((course) => {
              const courseDishes = course.dishes || [];
              
              // Determine grid classes based on menu_layout
              const getGridClasses = () => {
                const layout = restaurant.menu_layout || 'list';
                
                if (layout === 'grid') {
                  // Grid: larger cards, max 2 columns on desktop
                  return 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4';
                } else {
                  // List: compact cards, up to 4 columns on wide screens
                  return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3';
                }
              };
              
              return (
                <div
                  key={course.id}
                  id={`category-${course.id}`}
                  className="scroll-mt-24"
                >
                  {/* Category Header - Customer View */}
                  <div className="flex items-center gap-3 mb-4 pb-2 border-b">
                    <h2 
                      className="text-2xl font-bold flex-1" 
                      data-testid={`heading-category-${course.id}`}
                    >
                      {course.name}
                    </h2>
                  </div>
                  
                  {/* Dishes Grid - Customer View with Responsive Columns */}
                  {courseDishes.length > 0 && (
                    <div className={getGridClasses()}>
                      {courseDishes.map((dish: any) => (
                        <DishCard 
                          key={dish.id} 
                          dish={dish} 
                          restaurantId={restaurant.id}
                          buttonStyle={restaurant.button_style}
                        />
                      ))}
                    </div>
                  )}
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
      
      {/* Floating Cart Button - Only in customer mode */}
      {!editorMode && cartItemCount > 0 && (
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
      
      {/* Cart Drawer - Only in customer mode */}
      {!editorMode && (
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          restaurant={restaurant}
        />
      )}
    </div>
  );

  return menuContent;
}

// Editor Dish Card Component - Simplified version with admin controls
function EditorDishCard({
  dish,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleFeatured,
  dragHandleProps,
  isSelected,
  onToggleSelect,
}: {
  dish: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onToggleFeatured: () => void;
  dragHandleProps?: any;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  return (
    <Card className={`group relative hover-elevate ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      {/* Selection Checkbox - Top Left */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="bg-background/90 backdrop-blur-sm"
          data-testid={`checkbox-select-dish-${dish.id}`}
        />
      </div>

      {/* Hover Controls - Top Right */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          {...dragHandleProps}
          className="p-2 rounded-md bg-background/90 backdrop-blur-sm hover-elevate active-elevate-2 cursor-grab active:cursor-grabbing"
          data-testid={`drag-handle-dish-${dish.id}`}
        >
          <GripVertical className="w-4 h-4" />
        </div>
        
        <button
          onClick={onEdit}
          className="p-2 rounded-md bg-background/90 backdrop-blur-sm hover-elevate active-elevate-2"
          data-testid={`button-edit-dish-${dish.id}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        
        <button
          onClick={onDelete}
          className="p-2 rounded-md bg-destructive/90 text-destructive-foreground backdrop-blur-sm hover-elevate active-elevate-2"
          data-testid={`button-delete-dish-${dish.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Status Badges - Moved down to avoid checkbox */}
      {(dish.is_featured || !dish.is_active) && (
        <div className="absolute top-12 left-2 z-10 flex flex-col gap-1">
          {dish.is_featured && (
            <Badge variant="default" className="text-xs">Featured</Badge>
          )}
          {!dish.is_active && (
            <Badge variant="secondary" className="text-xs">Inactive</Badge>
          )}
        </div>
      )}

      {/* Dish Info with Left-Side Thumbnail */}
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Small Thumbnail Image - Left Side */}
          <div className="w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0">
            {dish.image_url ? (
              <img
                src={dish.image_url}
                alt={dish.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                No image
              </div>
            )}
          </div>

          {/* Dish Content - Right Side */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-semibold text-base line-clamp-2 flex-1">
                {dish.name}
              </h4>
              <span className="font-bold text-primary text-base flex-shrink-0">
                ${dish.price.toFixed(2)}
              </span>
            </div>

            {dish.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {dish.description}
              </p>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleActive}
                data-testid={`button-toggle-active-${dish.id}`}
              >
                {dish.is_active ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                {dish.is_active ? 'Active' : 'Inactive'}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleFeatured}
                data-testid={`button-toggle-featured-${dish.id}`}
              >
                {dish.is_featured ? '⭐ Featured' : 'Feature'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
