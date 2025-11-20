"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { MoreVertical, Pencil, Trash2, DollarSign, Layers, Eye, EyeOff, GripVertical, Star } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-card hover-elevate">
      {/* Drag Handle */}
      <div {...dragHandleProps} data-testid={`drag-handle-dish-${dish.id}`}>
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Select Checkbox */}
      <Checkbox
        checked={selected}
        onCheckedChange={onToggleSelect}
        data-testid={`checkbox-dish-${dish.id}`}
      />

      {/* Dish Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate" data-testid={`text-dish-name-${dish.id}`}>
            {dish.name}
          </span>
          
          {dish.is_featured && (
            <Badge variant="default" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          )}
          
          {!dish.is_active && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          {/* Price Display */}
          <span className="font-semibold text-primary" data-testid={`text-dish-price-${dish.id}`}>
            ${dish.price.toFixed(2)}
          </span>

          {/* Modifier Indicators */}
          {modifierCount > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Layers className="w-3 h-3" />
              <span className="text-xs">
                {modifierCount} group{modifierCount > 1 ? 's' : ''}
              </span>
              {hasInheritedModifiers && !hasCustomModifiers && (
                <Badge variant="outline" className="text-xs">Inherited</Badge>
              )}
              {hasCustomModifiers && (
                <Badge variant="outline" className="text-xs">Custom</Badge>
              )}
            </div>
          )}
        </div>

        {dish.description && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {dish.description}
          </p>
        )}
      </div>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            data-testid={`button-dish-menu-${dish.id}`}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit} data-testid={`button-edit-dish-${dish.id}`}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Dish
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEditPrice} data-testid={`button-edit-price-${dish.id}`}>
            <DollarSign className="w-4 h-4 mr-2" />
            Edit Price
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onViewModifiers} data-testid={`button-view-modifiers-${dish.id}`}>
            <Layers className="w-4 h-4 mr-2" />
            Manage Modifiers ({modifierCount})
          </DropdownMenuItem>
          {hasInheritedModifiers && !hasCustomModifiers && (
            <DropdownMenuItem onClick={onBreakInheritance} data-testid={`button-break-inheritance-${dish.id}`}>
              Break Inheritance (Customize)
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onToggleActive} data-testid={`button-toggle-active-${dish.id}`}>
            {dish.is_active ? (
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
          <DropdownMenuItem onClick={onToggleFeatured} data-testid={`button-toggle-featured-${dish.id}`}>
            <Star className="w-4 h-4 mr-2" />
            {dish.is_featured ? 'Remove from Featured' : 'Mark as Featured'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive"
            data-testid={`button-delete-dish-${dish.id}`}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Dish
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
