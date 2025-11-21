"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Layers, Plus, Edit, Trash2, Copy, ChevronDown, ChevronRight } from 'lucide-react'
import {
  MenuBuilderDish,
  DishModifierGroup,
  DishModifier,
  useBreakInheritance,
} from '@/lib/hooks/use-menu-builder'
import {
  useCreateModifierGroup,
  useUpdateModifierGroup,
  useDeleteModifierGroup,
  useCreateModifier,
  useUpdateModifier,
  useDeleteModifier,
} from '@/lib/hooks/use-modifiers'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { GripVertical } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useQueryClient } from '@tanstack/react-query'

interface DishModifierPanelProps {
  dish: MenuBuilderDish
  restaurantId: number
  onClose: () => void
}

interface ModifierItem {
  id: string
  name: string
  price: number
  is_included: boolean
  is_default: boolean
}

export function DishModifierPanel({ dish, restaurantId, onClose }: DishModifierPanelProps) {
  const queryClient = useQueryClient()
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null)
  const [breakingInheritanceGroupId, setBreakingInheritanceGroupId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<DishModifierGroup | null>(null)

  // Hooks
  const breakInheritance = useBreakInheritance()
  const deleteGroup = useDeleteModifierGroup()

  // Calculate summary stats
  const inheritedCount = dish.modifier_groups.filter(g => g.course_template_id !== null).length
  const customCount = dish.modifier_groups.filter(g => g.is_custom).length
  const totalCount = dish.modifier_groups.length

  // Toggle group expansion
  const toggleGroup = (groupId: number) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  // Handle break inheritance for specific group
  const handleBreakInheritance = async () => {
    if (!breakingInheritanceGroupId) return
    
    await breakInheritance.mutateAsync(breakingInheritanceGroupId)
    // Invalidate both menu builder query AND dish modifier groups query
    queryClient.invalidateQueries({ queryKey: ['/api/menu/builder'] })
    queryClient.invalidateQueries({ queryKey: ['/api/menu/dishes', dish.id, 'modifier-groups'] })
    setBreakingInheritanceGroupId(null)
  }

  // Handle delete group
  const handleDeleteGroup = async () => {
    if (!deletingGroupId) return
    
    await deleteGroup.mutateAsync({
      dishId: dish.id,
      groupId: deletingGroupId,
    })
    // Invalidate both queries so UI updates
    queryClient.invalidateQueries({ queryKey: ['/api/menu/builder'] })
    queryClient.invalidateQueries({ queryKey: ['/api/menu/dishes', dish.id, 'modifier-groups'] })
    setDeletingGroupId(null)
  }

  // Handle add custom group
  const handleAddCustomGroup = () => {
    setEditingGroup(null)
    setEditorOpen(true)
  }

  // Handle edit group
  const handleEditGroup = (group: DishModifierGroup) => {
    setEditingGroup(group)
    setEditorOpen(true)
  }

  // Sort groups by display_order
  const sortedGroups = [...dish.modifier_groups].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="space-y-6" data-testid="dish-modifier-panel">
      {/* Header Section */}
      <div>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold" data-testid="text-dish-name">{dish.name}</h3>
            <p className="text-sm text-muted-foreground" data-testid="text-group-summary">
              {totalCount} modifier group{totalCount !== 1 ? 's' : ''}
              {(inheritedCount > 0 || customCount > 0) && (
                <> • {inheritedCount} inherited, {customCount} custom</>
              )}
            </p>
          </div>
          <Layers className="w-5 h-5 text-muted-foreground" />
        </div>
        <Separator />
      </div>

      {/* Modifier Groups List */}
      <div className="space-y-3">
        {sortedGroups.length === 0 ? (
          <div className="py-12 text-center" data-testid="empty-state">
            <Layers className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No modifier groups yet. Add one below.</p>
          </div>
        ) : (
          sortedGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id)
            const isInherited = group.course_template_id !== null
            const isCustom = group.is_custom

            return (
              <Card
                key={group.id}
                className="hover-elevate active-elevate-2"
                data-testid={`card-modifier-group-${group.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={isInherited ? "secondary" : "default"}
                          data-testid={`badge-${isInherited ? 'inherited' : 'custom'}-${group.id}`}
                        >
                          {isInherited ? 'Inherited' : 'Custom'}
                        </Badge>
                        <CardTitle className="text-base" data-testid={`text-group-name-${group.id}`}>
                          {group.name}
                        </CardTitle>
                      </div>
                      <CardDescription className="flex items-center gap-2 text-xs">
                        <span data-testid={`text-modifier-count-${group.id}`}>
                          {group.dish_modifiers.length} modifier{group.dish_modifiers.length !== 1 ? 's' : ''}
                        </span>
                        <span>•</span>
                        <span data-testid={`text-selection-rules-${group.id}`}>
                          {group.is_required ? 'Required' : 'Optional'}
                          {' • '}
                          Min {group.min_selections}
                          {' • '}
                          Max {group.max_selections}
                        </span>
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Action Buttons */}
                      {isCustom && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditGroup(group)}
                            data-testid={`button-edit-group-${group.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingGroupId(group.id)}
                            data-testid={`button-delete-group-${group.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {isInherited && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setBreakingInheritanceGroupId(group.id)}
                          data-testid={`button-break-inheritance-${group.id}`}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Break Inheritance
                        </Button>
                      )}
                      
                      {/* Expand/Collapse Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleGroup(group.id)}
                        data-testid={`button-toggle-group-${group.id}`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Collapsible Modifiers List */}
                {isExpanded && (
                  <CardContent className="pt-0">
                    <Separator className="mb-3" />
                    <div className="space-y-2">
                      {group.dish_modifiers
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((modifier) => (
                          <div
                            key={modifier.id}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                            data-testid={`modifier-item-${modifier.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium" data-testid={`text-modifier-name-${modifier.id}`}>
                                {modifier.name}
                              </span>
                              {modifier.is_included && (
                                <Badge variant="outline" className="text-xs" data-testid={`badge-included-${modifier.id}`}>
                                  Included
                                </Badge>
                              )}
                              {modifier.is_default && (
                                <Badge variant="outline" className="text-xs" data-testid={`badge-default-${modifier.id}`}>
                                  Default
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground" data-testid={`text-modifier-price-${modifier.id}`}>
                              {modifier.price > 0 ? `+$${modifier.price.toFixed(2)}` : 'Free'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Add Custom Group Button */}
      <div className="pt-4">
        <Button
          onClick={handleAddCustomGroup}
          className="w-full"
          variant="outline"
          data-testid="button-add-custom-group"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Modifier Group
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingGroupId !== null} onOpenChange={(open) => !open && setDeletingGroupId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Modifier Group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this modifier group from the dish. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Break Inheritance Confirmation Dialog */}
      <AlertDialog
        open={breakingInheritanceGroupId !== null}
        onOpenChange={(open) => !open && setBreakingInheritanceGroupId(null)}
      >
        <AlertDialogContent data-testid="dialog-break-inheritance-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Break Inheritance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an editable copy of the inherited group. The dish will no longer receive
              updates when the category template changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-break-inheritance">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBreakInheritance}
              data-testid="button-confirm-break-inheritance"
            >
              Break Inheritance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modifier Group Editor Dialog */}
      <DishModifierGroupEditor
        dishId={dish.id}
        group={editingGroup}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
    </div>
  )
}

// Dish Modifier Group Editor Component
interface DishModifierGroupEditorProps {
  dishId: number
  group?: DishModifierGroup | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DishModifierGroupEditor({ dishId, group, open, onOpenChange }: DishModifierGroupEditorProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [minSelections, setMinSelections] = useState(0)
  const [maxSelections, setMaxSelections] = useState(1)
  const [modifiers, setModifiers] = useState<ModifierItem[]>([])
  const [originalModifiers, setOriginalModifiers] = useState<ModifierItem[]>([])

  const createGroup = useCreateModifierGroup()
  const updateGroup = useUpdateModifierGroup()
  const createModifierMutation = useCreateModifier()
  const updateModifierMutation = useUpdateModifier()
  const deleteModifierMutation = useDeleteModifier()

  // Reset form when dialog opens/closes or group changes
  useEffect(() => {
    if (group) {
      setName(group.name)
      setIsRequired(group.is_required)
      setMinSelections(group.min_selections)
      setMaxSelections(group.max_selections)
      const loadedModifiers = group.dish_modifiers?.map((m, index) => ({
        id: m.id?.toString() || `new-${index}`,
        name: m.name,
        price: m.price,
        is_included: m.is_included,
        is_default: m.is_default,
      })) || []
      setModifiers(loadedModifiers)
      setOriginalModifiers(loadedModifiers)
    } else {
      setName('')
      setIsRequired(false)
      setMinSelections(0)
      setMaxSelections(1)
      setModifiers([])
      setOriginalModifiers([])
    }
  }, [group, open])

  const addModifier = () => {
    setModifiers([
      ...modifiers,
      { id: `new-${Date.now()}`, name: '', price: 0, is_included: false, is_default: false }
    ])
  }

  const removeModifier = (id: string) => {
    setModifiers(modifiers.filter(m => m.id !== id))
  }

  const updateModifier = (id: string, field: keyof ModifierItem, value: any) => {
    setModifiers(modifiers.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ))
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(modifiers)
    const [reordered] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reordered)
    setModifiers(items)
  }

  const hasChanged = (original: ModifierItem, current: ModifierItem) => {
    return original.name !== current.name ||
           original.price !== current.price ||
           original.is_default !== current.is_default ||
           original.is_included !== current.is_included
  }

  const handleSave = async () => {
    const groupData = {
      name,
      is_required: isRequired,
      min_selections: minSelections,
      max_selections: maxSelections,
    }

    let savedGroupId: number

    if (group) {
      await updateGroup.mutateAsync({
        dishId,
        groupId: group.id,
        data: groupData,
      })
      savedGroupId = group.id
    } else {
      const result = await createGroup.mutateAsync({
        dishId,
        data: groupData,
      })
      savedGroupId = result.id
    }

    for (const modifier of modifiers) {
      if (modifier.id.startsWith('new-')) {
        await createModifierMutation.mutateAsync({
          dishId,
          groupId: savedGroupId,
          data: {
            name: modifier.name,
            price: modifier.price,
            is_default: modifier.is_default,
            is_included: modifier.is_included
          }
        })
      } else {
        const original = originalModifiers.find(m => m.id === modifier.id)
        if (original && hasChanged(original, modifier)) {
          await updateModifierMutation.mutateAsync({
            dishId,
            groupId: savedGroupId,
            modifierId: parseInt(modifier.id),
            data: {
              name: modifier.name,
              price: modifier.price,
              is_default: modifier.is_default,
              is_included: modifier.is_included
            }
          })
        }
      }
    }

    for (const original of originalModifiers) {
      if (!modifiers.find(m => m.id === original.id)) {
        await deleteModifierMutation.mutateAsync({
          dishId,
          groupId: savedGroupId,
          modifierId: parseInt(original.id)
        })
      }
    }

    queryClient.invalidateQueries({ queryKey: ['/api/menu/builder'] })
    queryClient.invalidateQueries({ queryKey: ['/api/menu/dishes', dishId, 'modifier-groups'] })
    onOpenChange(false)
  }

  const isValid = name.trim() && modifiers.length > 0 && modifiers.every(m => m.name.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-dish-modifier-group-editor">
        <DialogHeader>
          <DialogTitle>
            {group ? 'Edit' : 'Create'} Modifier Group
          </DialogTitle>
          <DialogDescription>
            Create a custom modifier group for this dish
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Modifier Group Name */}
          <div>
            <Label>Modifier Group Name</Label>
            <Input
              placeholder="e.g., Pizza Toppings, Drink Sizes..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-group-name"
            />
          </div>

          {/* Required Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Required Selection</Label>
              <p className="text-sm text-muted-foreground">
                Customer must select at least one option
              </p>
            </div>
            <Switch
              checked={isRequired}
              onCheckedChange={setIsRequired}
              data-testid="switch-required"
            />
          </div>

          {/* Min/Max Selections */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Selections</Label>
              <Input
                type="number"
                min="0"
                value={minSelections}
                onChange={(e) => setMinSelections(parseInt(e.target.value) || 0)}
                data-testid="input-min-selections"
              />
            </div>
            <div>
              <Label>Max Selections</Label>
              <Input
                type="number"
                min="1"
                value={maxSelections}
                onChange={(e) => setMaxSelections(parseInt(e.target.value) || 1)}
                data-testid="input-max-selections"
              />
            </div>
          </div>

          {/* Modifiers List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Modifiers</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={addModifier}
                data-testid="button-add-modifier"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Modifier
              </Button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="dish-modifiers">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {modifiers.map((modifier, index) => (
                      <Draggable key={modifier.id} draggableId={modifier.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex gap-2 items-center p-3 border rounded-lg bg-card"
                            data-testid={`modifier-item-${index}`}
                          >
                            <div {...provided.dragHandleProps} data-testid={`drag-handle-${index}`}>
                              <GripVertical className="w-5 h-5 text-muted-foreground" />
                            </div>
                            
                            <div className="flex-1">
                              <Input
                                placeholder="Modifier name..."
                                value={modifier.name}
                                onChange={(e) => updateModifier(modifier.id, 'name', e.target.value)}
                                data-testid={`input-modifier-name-${index}`}
                              />
                            </div>
                            
                            <div className="w-28">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="$0.00"
                                value={modifier.price || ''}
                                onChange={(e) => updateModifier(modifier.id, 'price', parseFloat(e.target.value) || 0)}
                                data-testid={`input-modifier-price-${index}`}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={modifier.is_included}
                                onCheckedChange={(checked) => updateModifier(modifier.id, 'is_included', checked)}
                                data-testid={`checkbox-modifier-included-${index}`}
                              />
                              <Label className="text-xs">Included</Label>
                            </div>

                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={modifier.is_default}
                                onCheckedChange={(checked) => updateModifier(modifier.id, 'is_default', checked)}
                                data-testid={`checkbox-modifier-default-${index}`}
                              />
                              <Label className="text-xs">Default</Label>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeModifier(modifier.id)}
                              data-testid={`button-remove-modifier-${index}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {modifiers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No modifiers yet. Click "Add Modifier" to get started.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || createGroup.isPending || updateGroup.isPending || createModifierMutation.isPending || updateModifierMutation.isPending || deleteModifierMutation.isPending}
            data-testid="button-save"
          >
            {group ? 'Update' : 'Create'} Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
