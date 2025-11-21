"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Pencil, 
  Trash2, 
  Layers, 
  Star, 
  Image as ImageIcon, 
  GripVertical,
  DollarSign,
  Eye,
  EyeOff,
  Unlink
} from 'lucide-react'
import { MenuBuilderDish } from '@/lib/hooks/use-menu-builder'

interface DishItemProps {
  dish: MenuBuilderDish
  selected: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onEditPrice: () => void
  onToggleActive: () => void
  onToggleFeatured: () => void
  onViewModifiers: () => void
  onBreakInheritance: () => void
  dragHandleProps?: any
}

export function DishItem({
  dish,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  onEditPrice,
  onToggleActive,
  onToggleFeatured,
  onViewModifiers,
  onBreakInheritance,
  dragHandleProps,
}: DishItemProps) {
  const hasInheritedModifiers = dish.modifier_groups?.some(g => !g.is_custom)
  const hasCustomModifiers = dish.modifier_groups?.some(g => g.is_custom)
  const modifierCount = dish.modifier_groups?.length || 0

  return (
    <Card 
      className="group relative overflow-visible hover-elevate transition-all duration-200"
      data-testid={`card-dish-${dish.id}`}
    >
      {/* Checkbox - Top Left */}
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          className="bg-background/90 backdrop-blur-sm border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          data-testid={`checkbox-dish-${dish.id}`}
        />
      </div>

      {/* Hover Controls - Top Right (hidden on touch devices, shown on hover for desktop) */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="p-2 rounded-md bg-background/90 backdrop-blur-sm hover-elevate active-elevate-2 cursor-grab active:cursor-grabbing touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0"
          data-testid={`drag-handle-dish-${dish.id}`}
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5 md:w-4 md:h-4" />
        </div>

        {/* Edit Button */}
        <button
          onClick={onEdit}
          className="p-2 rounded-md bg-background/90 backdrop-blur-sm hover-elevate active-elevate-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0"
          data-testid={`button-edit-dish-${dish.id}`}
          aria-label="Edit dish"
        >
          <Pencil className="w-5 h-5 md:w-4 md:h-4" />
        </button>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="p-2 rounded-md bg-destructive/90 text-destructive-foreground backdrop-blur-sm hover-elevate active-elevate-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0"
          data-testid={`button-delete-dish-${dish.id}`}
          aria-label="Delete dish"
        >
          <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      </div>

      {/* Status Badges - Below Checkbox */}
      {(dish.is_featured || !dish.is_active) && (
        <div className="absolute top-12 left-3 z-10 flex flex-col gap-1">
          {dish.is_featured && (
            <Badge variant="default" className="text-xs backdrop-blur-sm bg-primary/90 w-fit">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          )}
          {!dish.is_active && (
            <Badge variant="secondary" className="text-xs backdrop-blur-sm bg-secondary/90 w-fit">
              Inactive
            </Badge>
          )}
        </div>
      )}

      {/* Dish Image */}
      <div className="relative w-full aspect-[4/3] bg-muted rounded-t-lg overflow-hidden">
        {dish.image_url ? (
          <img
            src={dish.image_url}
            alt={dish.name}
            className="w-full h-full object-cover"
            data-testid={`img-dish-${dish.id}`}
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            data-testid={`img-placeholder-dish-${dish.id}`}
          >
            <ImageIcon className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Dish Info */}
      <CardContent className="p-4">
        {/* Name and Price */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 
            className="font-semibold text-base line-clamp-2 flex-1" 
            data-testid={`text-dish-name-${dish.id}`}
          >
            {dish.name}
          </h4>
          <span 
            className="font-bold text-primary text-lg flex-shrink-0" 
            data-testid={`text-dish-price-${dish.id}`}
          >
            ${dish.price.toFixed(2)}
          </span>
        </div>

        {/* Description */}
        {dish.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {dish.description}
          </p>
        )}

        {/* Modifier Info */}
        {modifierCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 border-t">
            <Layers className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs">
              {modifierCount} modifier group{modifierCount > 1 ? 's' : ''}
            </span>
            {hasInheritedModifiers && !hasCustomModifiers && (
              <Badge variant="outline" className="text-xs ml-auto">Inherited</Badge>
            )}
            {hasCustomModifiers && (
              <Badge variant="outline" className="text-xs ml-auto">Custom</Badge>
            )}
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-center gap-1 pt-3 mt-3 border-t">
          {/* Edit Price */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onEditPrice}
                className="p-2 rounded-md hover-elevate active-elevate-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0"
                data-testid={`button-edit-price-${dish.id}`}
                aria-label="Edit price"
              >
                <DollarSign className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Edit Price</TooltipContent>
          </Tooltip>

          {/* Toggle Active Status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleActive}
                className="p-2 rounded-md hover-elevate active-elevate-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0"
                data-testid={`button-toggle-active-${dish.id}`}
                aria-label={dish.is_active ? "Mark as inactive" : "Mark as active"}
              >
                {dish.is_active ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {dish.is_active ? "Mark as Inactive" : "Mark as Active"}
            </TooltipContent>
          </Tooltip>

          {/* Toggle Featured Status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleFeatured}
                className="p-2 rounded-md hover-elevate active-elevate-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0"
                data-testid={`button-toggle-featured-${dish.id}`}
                aria-label={dish.is_featured ? "Remove from featured" : "Mark as featured"}
              >
                <Star 
                  className={`w-4 h-4 ${dish.is_featured ? 'fill-primary text-primary' : ''}`}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {dish.is_featured ? "Remove from Featured" : "Mark as Featured"}
            </TooltipContent>
          </Tooltip>

          {/* View Modifiers - Only show if has modifiers */}
          {modifierCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onViewModifiers}
                  className="p-2 rounded-md hover-elevate active-elevate-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0"
                  data-testid={`button-view-modifiers-${dish.id}`}
                  aria-label="View modifiers"
                >
                  <Layers className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>View Modifiers</TooltipContent>
            </Tooltip>
          )}

          {/* Break Inheritance - Only show if has inherited modifiers */}
          {hasInheritedModifiers && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onBreakInheritance}
                  className="p-2 rounded-md hover-elevate active-elevate-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0"
                  data-testid={`button-break-inheritance-${dish.id}`}
                  aria-label="Break modifier inheritance"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Break Modifier Inheritance</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
