"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MoreVertical, Pencil, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CategoryModifierGroup, useDeleteCategoryModifierGroup, useApplyModifierGroup } from '@/lib/hooks/use-menu-builder'
import { ModifierGroupEditor } from './ModifierGroupEditor'

interface ModifierGroupSectionProps {
  courseId: number
  modifierGroups: CategoryModifierGroup[]
  selectedDishIds: Set<number>
  onEditModifierGroup: (modifierGroup: CategoryModifierGroup) => void
}

export function ModifierGroupSection({ 
  courseId, 
  modifierGroups, 
  selectedDishIds,
  onEditModifierGroup 
}: ModifierGroupSectionProps) {
  const [expandedModifierGroups, setExpandedModifierGroups] = useState<Set<number>>(new Set())
  const [deletingModifierGroup, setDeletingModifierGroup] = useState<number | null>(null)
  const [applyingModifierGroupId, setApplyingModifierGroupId] = useState<number | null>(null)

  const deleteModifierGroup = useDeleteCategoryModifierGroup()
  const applyModifierGroup = useApplyModifierGroup()

  const toggleModifierGroup = (modifierGroupId: number) => {
    const newExpanded = new Set(expandedModifierGroups)
    if (newExpanded.has(modifierGroupId)) {
      newExpanded.delete(modifierGroupId)
    } else {
      newExpanded.add(modifierGroupId)
    }
    setExpandedModifierGroups(newExpanded)
  }

  const handleDelete = async () => {
    if (deletingModifierGroup) {
      await deleteModifierGroup.mutateAsync(deletingModifierGroup)
      setDeletingModifierGroup(null)
    }
  }

  const handleApplyToSelected = async (modifierGroupId: number) => {
    if (selectedDishIds.size === 0) return

    try {
      await applyModifierGroup.mutateAsync({
        template_id: modifierGroupId,
        dish_ids: Array.from(selectedDishIds),
      })
      setApplyingModifierGroupId(null)
    } catch (error) {
      console.error('[BULK-ACTION] Failed to apply modifier group to selected dishes:', error)
    }
  }

  const handleApplyToAll = async (modifierGroupId: number) => {
    try {
      await applyModifierGroup.mutateAsync({
        template_id: modifierGroupId,
        course_id: courseId,
      })
      setApplyingModifierGroupId(null)
    } catch (error) {
      console.error('[BULK-ACTION] Failed to apply modifier group to all dishes:', error)
    }
  }

  return (
    <>
      <div className="pl-8 space-y-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Category Modifier Groups</h4>
            {modifierGroups.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {modifierGroups.length}
              </Badge>
            )}
          </div>
          {modifierGroups.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Create reusable modifier groups to apply to dishes
            </p>
          )}
        </div>

        {modifierGroups.length === 0 ? (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No modifier groups yet. Create one to apply the same options to multiple dishes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {modifierGroups.map((modifierGroup) => (
              <Card key={modifierGroup.id} className="bg-card border hover-elevate">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Collapsible
                      open={expandedModifierGroups.has(modifierGroup.id)}
                      onOpenChange={() => toggleModifierGroup(modifierGroup.id)}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            data-testid={`button-toggle-modifier-group-${modifierGroup.id}`}
                          >
                            {expandedModifierGroups.has(modifierGroup.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate" data-testid={`text-modifier-group-name-${modifierGroup.id}`}>
                              {modifierGroup.name}
                            </span>
                            <Badge variant={modifierGroup.is_required ? "default" : "secondary"} className="text-xs shrink-0">
                              {modifierGroup.is_required ? 'Required' : 'Optional'}
                            </Badge>
                            {modifierGroup.min_selections !== undefined && modifierGroup.max_selections !== undefined && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {modifierGroup.min_selections === modifierGroup.max_selections 
                                  ? `Choose ${modifierGroup.min_selections}`
                                  : `Choose ${modifierGroup.min_selections}-${modifierGroup.max_selections}`
                                }
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground shrink-0">
                              • {modifierGroup.modifier_options?.length || 0} options
                            </span>
                          </div>
                        </div>
                      </div>

                      <CollapsibleContent className="mt-3 space-y-1">
                        {modifierGroup.modifier_options?.map((modifier, idx) => (
                          <div
                            key={modifier.id || idx}
                            className="flex items-center justify-between text-sm pl-9 py-1.5 rounded hover:bg-muted/50"
                            data-testid={`modifier-${modifierGroup.id}-${idx}`}
                          >
                            <span className="truncate">{modifier.name}</span>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {modifier.price > 0 && (
                                <span className="text-xs text-muted-foreground">+${modifier.price.toFixed(2)}</span>
                              )}
                              {modifier.is_included && (
                                <Badge variant="outline" className="text-xs">Included</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          data-testid={`button-modifier-group-menu-${modifierGroup.id}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onClick={() => onEditModifierGroup(modifierGroup)}
                          data-testid={`button-edit-modifier-group-${modifierGroup.id}`}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Modifier Group
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {selectedDishIds.size > 0 && (
                          <DropdownMenuItem
                            onClick={() => setApplyingModifierGroupId(modifierGroup.id)}
                            data-testid={`button-apply-to-selected-${modifierGroup.id}`}
                          >
                            Apply to {selectedDishIds.size} Selected Dish{selectedDishIds.size > 1 ? 'es' : ''}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setApplyingModifierGroupId(modifierGroup.id)
                          }}
                          data-testid={`button-apply-to-all-${modifierGroup.id}`}
                        >
                          Apply to All Dishes in Category
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingModifierGroup(modifierGroup.id)}
                          className="text-destructive"
                          data-testid={`button-delete-modifier-group-${modifierGroup.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Modifier Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingModifierGroup} onOpenChange={(open) => !open && setDeletingModifierGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Modifier Group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the modifier group but will NOT affect dishes that are already using it.
              Dishes will keep their current modifiers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete"
            >
              Delete Modifier Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply Modifier Group Confirmation */}
      <AlertDialog open={!!applyingModifierGroupId} onOpenChange={(open) => !open && setApplyingModifierGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Modifier Group</AlertDialogTitle>
            <AlertDialogDescription>
              This modifier group will be added to the selected dishes. Existing modifiers will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 py-2">
            {selectedDishIds.size > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected Dishes ({selectedDishIds.size})</p>
                <Button
                  variant="default"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => applyingModifierGroupId && handleApplyToSelected(applyingModifierGroupId)}
                  disabled={applyModifierGroup.isPending}
                  data-testid="button-apply-selected"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">
                      {applyModifierGroup.isPending 
                        ? `Applying to ${selectedDishIds.size} dish${selectedDishIds.size > 1 ? 'es' : ''}...`
                        : `Apply to ${selectedDishIds.size} Selected Dish${selectedDishIds.size > 1 ? 'es' : ''}`
                      }
                    </span>
                    {!applyModifierGroup.isPending && (
                      <span className="text-xs font-normal opacity-90">
                        Add this modifier group to your current selection
                      </span>
                    )}
                  </div>
                </Button>
              </div>
            )}
            
            <div className="space-y-2">
              {selectedDishIds.size > 0 && (
                <p className="text-sm font-medium">All Dishes</p>
              )}
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => applyingModifierGroupId && handleApplyToAll(applyingModifierGroupId)}
                disabled={applyModifierGroup.isPending}
                data-testid="button-apply-all-category"
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium">
                    {applyModifierGroup.isPending 
                      ? 'Applying to all dishes...'
                      : 'Apply to All Dishes in This Category'
                    }
                  </span>
                  {!applyModifierGroup.isPending && (
                    <span className="text-xs font-normal text-muted-foreground">
                      Add this modifier group to every dish in the category
                    </span>
                  )}
                </div>
              </Button>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={applyModifierGroup.isPending}
              data-testid="button-cancel-apply"
            >
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
