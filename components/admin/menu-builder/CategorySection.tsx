"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { MenuBuilderCategory } from '@/lib/hooks/use-menu-builder'
import { DishItem } from './DishItem'
import { ModifierTemplateSection } from './ModifierTemplateSection'

interface CategorySectionProps {
  category: MenuBuilderCategory
  selectedDishIds: Set<number>
  onToggleSelectDish: (dishId: number) => void
  onEditCategory: () => void
  onDeleteCategory: () => void
  onToggleCategoryActive: () => void
  onAddDish: () => void
  onEditDish: (dishId: number) => void
  onDeleteDish: (dishId: number) => void
  onEditDishPrice: (dishId: number) => void
  onToggleDishActive: (dishId: number) => void
  onToggleDishFeatured: (dishId: number) => void
  onViewDishModifiers: (dishId: number) => void
  onBreakDishInheritance: (dishId: number) => void
  onAddTemplate: () => void
  onEditTemplate: (templateId: number) => void
  onDishReorder: (dishIds: number[]) => void
  dragHandleProps?: any
}

export function CategorySection({
  category,
  selectedDishIds,
  onToggleSelectDish,
  onEditCategory,
  onDeleteCategory,
  onToggleCategoryActive,
  onAddDish,
  onEditDish,
  onDeleteDish,
  onEditDishPrice,
  onToggleDishActive,
  onToggleDishFeatured,
  onViewDishModifiers,
  onBreakDishInheritance,
  onAddTemplate,
  onEditTemplate,
  onDishReorder,
  dragHandleProps,
}: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const handleDishDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const dishes = Array.from(category.dishes)
    const [reordered] = dishes.splice(result.source.index, 1)
    dishes.splice(result.destination.index, 0, reordered)

    onDishReorder(dishes.map(d => d.id))
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div {...dragHandleProps} data-testid={`drag-handle-category-${category.id}`}>
              <GripVertical className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Category Header */}
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto font-normal"
                data-testid={`button-toggle-category-${category.id}`}
              >
                {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </Button>
            </CollapsibleTrigger>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold" data-testid={`text-category-name-${category.id}`}>
                  {category.name}
                </h3>
                {!category.is_active && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {category.dishes.length} dish{category.dishes.length !== 1 ? 'es' : ''} • {category.templates.length} modifier group{category.templates.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Actions */}
            <Button
              size="sm"
              onClick={onAddDish}
              data-testid={`button-add-dish-${category.id}`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Dish
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onAddTemplate}
              data-testid={`button-add-template-${category.id}`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Modifier Group
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid={`button-category-menu-${category.id}`}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEditCategory} data-testid={`button-edit-category-${category.id}`}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Category
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleCategoryActive} data-testid={`button-toggle-category-active-${category.id}`}>
                  {category.is_active ? (
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
                  onClick={onDeleteCategory}
                  className="text-destructive"
                  data-testid={`button-delete-category-${category.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CollapsibleContent className="mt-4">
            <CardContent className="p-0">
              {/* Modifier Groups */}
              {category.templates.length > 0 && (
                <div className="mb-4">
                  <ModifierTemplateSection
                    courseId={category.id}
                    templates={category.templates}
                    selectedDishIds={selectedDishIds}
                    onEditTemplate={(template) => onEditTemplate(template.id)}
                  />
                </div>
              )}

              {/* Dishes List */}
              {category.dishes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No dishes in this category yet.</p>
                  <Button
                    variant="outline"
                    onClick={onAddDish}
                    className="mt-4"
                    data-testid={`button-add-first-dish-${category.id}`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Dish
                  </Button>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDishDragEnd}>
                  <Droppable droppableId={`category-${category.id}-dishes`}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {category.dishes.map((dish, index) => (
                          <Draggable
                            key={dish.id}
                            draggableId={`dish-${dish.id}`}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <DishItem
                                  dish={dish}
                                  selected={selectedDishIds.has(dish.id)}
                                  onToggleSelect={() => onToggleSelectDish(dish.id)}
                                  onEdit={() => onEditDish(dish.id)}
                                  onDelete={() => onDeleteDish(dish.id)}
                                  onEditPrice={() => onEditDishPrice(dish.id)}
                                  onToggleActive={() => onToggleDishActive(dish.id)}
                                  onToggleFeatured={() => onToggleDishFeatured(dish.id)}
                                  onViewModifiers={() => onViewDishModifiers(dish.id)}
                                  onBreakInheritance={() => onBreakDishInheritance(dish.id)}
                                  dragHandleProps={provided.dragHandleProps}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  )
}
