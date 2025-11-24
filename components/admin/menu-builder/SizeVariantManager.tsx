"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, GripVertical, Pencil, X, Check } from 'lucide-react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd'
import {
  useDishPrices,
  useCreateDishPrice,
  useUpdateDishPrice,
  useDeleteDishPrice,
  DishPrice,
} from '@/lib/hooks/use-menu-builder'

interface SizeVariantManagerProps {
  dishId: number
}

export function SizeVariantManager({ dishId }: SizeVariantManagerProps) {
  const { data: variants = [], isLoading } = useDishPrices(dishId)
  const createVariant = useCreateDishPrice()
  const updateVariant = useUpdateDishPrice()
  const deleteVariant = useDeleteDishPrice()

  const [localVariants, setLocalVariants] = useState<DishPrice[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const [newVariant, setNewVariant] = useState({
    size_variant: '',
    price: 0,
  })
  const [editForm, setEditForm] = useState({
    size_variant: '',
    price: 0,
  })

  // Sync localVariants with server data whenever it changes, but preserve in-flight edits
  // This ensures UI updates after create/delete/update mutations while preventing overwrites during editing
  useEffect(() => {
    // Only sync when not actively editing, adding, or reordering to preserve user's in-flight changes
    if (!editingId && !isAdding && !isReordering) {
      setLocalVariants(variants)
    }
  }, [variants, editingId, isAdding, isReordering])

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    // Set reordering flag to prevent useEffect from resetting localVariants during mutations
    setIsReordering(true)

    const items = Array.from(localVariants)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setLocalVariants(items)

    try {
      // Update display_order for all affected items
      for (let i = 0; i < items.length; i++) {
        if (items[i].display_order !== i) {
          await updateVariant.mutateAsync({
            id: items[i].id,
            dish_id: dishId,
            display_order: i,
          })
        }
      }
    } finally {
      // Clear reordering flag after all mutations complete
      setIsReordering(false)
    }
  }

  const handleAddVariant = async () => {
    if (!newVariant.size_variant.trim()) return

    await createVariant.mutateAsync({
      dish_id: dishId,
      size_variant: newVariant.size_variant.trim() || null,
      price: newVariant.price,
      display_order: localVariants.length,
    })

    setNewVariant({ size_variant: '', price: 0 })
    setIsAdding(false)
  }

  const handleStartEdit = (variant: DishPrice) => {
    setEditingId(variant.id)
    setEditForm({
      size_variant: variant.size_variant || '',
      price: variant.price,
    })
  }

  const handleSaveEdit = async (variantId: number) => {
    await updateVariant.mutateAsync({
      id: variantId,
      dish_id: dishId,
      size_variant: editForm.size_variant.trim() || null,
      price: editForm.price,
    })

    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ size_variant: '', price: 0 })
  }

  const handleDelete = async (variantId: number) => {
    if (!confirm('Delete this price variant?')) return
    await deleteVariant.mutateAsync({ id: variantId, dish_id: dishId })
  }

  const handleToggleActive = async (variant: DishPrice) => {
    await updateVariant.mutateAsync({
      id: variant.id,
      dish_id: dishId,
      is_active: !variant.is_active,
    })
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading price variants...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Size/Price Variants</h4>
          <p className="text-xs text-muted-foreground">
            Manage multiple size options with different prices (e.g., Small, Medium, Large)
          </p>
        </div>
        {!isAdding && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAdding(true)}
            data-testid="button-add-variant"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Variant
          </Button>
        )}
      </div>

      {/* Add new variant form */}
      {isAdding && (
        <Card className="border-primary">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="new-size-variant" className="text-xs">
                    Size Name
                  </Label>
                  <Input
                    id="new-size-variant"
                    placeholder='e.g., "Small", "Medium(12\")"'
                    value={newVariant.size_variant}
                    onChange={(e) =>
                      setNewVariant((prev) => ({
                        ...prev,
                        size_variant: e.target.value,
                      }))
                    }
                    data-testid="input-new-size-variant"
                  />
                </div>
                <div>
                  <Label htmlFor="new-price" className="text-xs">
                    Price ($)
                  </Label>
                  <Input
                    id="new-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newVariant.price || ''}
                    onChange={(e) =>
                      setNewVariant((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    data-testid="input-new-price"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddVariant}
                  disabled={createVariant.isPending}
                  data-testid="button-save-variant"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAdding(false)
                    setNewVariant({ size_variant: '', price: 0 })
                  }}
                  data-testid="button-cancel-variant"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing variants list */}
      {localVariants.length > 0 ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="price-variants">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {localVariants.map((variant, index) => (
                  <Draggable
                    key={variant.id}
                    draggableId={`variant-${variant.id}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={snapshot.isDragging ? 'shadow-lg' : ''}
                        data-testid={`variant-${variant.id}`}
                      >
                        <CardContent className="p-3">
                          {editingId === variant.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor={`edit-size-${variant.id}`} className="text-xs">
                                    Size Name
                                  </Label>
                                  <Input
                                    id={`edit-size-${variant.id}`}
                                    value={editForm.size_variant}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        size_variant: e.target.value,
                                      }))
                                    }
                                    data-testid={`input-edit-size-${variant.id}`}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`edit-price-${variant.id}`} className="text-xs">
                                    Price ($)
                                  </Label>
                                  <Input
                                    id={`edit-price-${variant.id}`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editForm.price}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        price: parseFloat(e.target.value) || 0,
                                      }))
                                    }
                                    data-testid={`input-edit-price-${variant.id}`}
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(variant.id)}
                                  disabled={updateVariant.isPending}
                                  data-testid={`button-save-edit-${variant.id}`}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  data-testid={`button-cancel-edit-${variant.id}`}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps} className="cursor-grab">
                                <GripVertical className="w-5 h-5 text-muted-foreground" />
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {variant.size_variant || 'Default'}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    ${variant.price.toFixed(2)}
                                  </Badge>
                                  {!variant.is_active && (
                                    <Badge variant="outline" className="text-xs">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Label htmlFor={`active-${variant.id}`} className="text-xs sr-only">
                                    Active
                                  </Label>
                                  <Switch
                                    id={`active-${variant.id}`}
                                    checked={variant.is_active}
                                    onCheckedChange={() => handleToggleActive(variant)}
                                    data-testid={`switch-active-${variant.id}`}
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartEdit(variant)}
                                  data-testid={`button-edit-${variant.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(variant.id)}
                                  disabled={deleteVariant.isPending}
                                  data-testid={`button-delete-${variant.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No price variants added yet. Add variants for dishes with multiple sizes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
