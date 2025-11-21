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
import { CategoryModifierTemplate, useDeleteCategoryTemplate, useApplyTemplate } from '@/lib/hooks/use-menu-builder'
import { ModifierGroupEditor } from './ModifierGroupEditor'

interface ModifierTemplateSectionProps {
  courseId: number
  templates: CategoryModifierTemplate[]
  selectedDishIds: Set<number>
  onEditTemplate: (template: CategoryModifierTemplate) => void
}

export function ModifierTemplateSection({ 
  courseId, 
  templates, 
  selectedDishIds,
  onEditTemplate 
}: ModifierTemplateSectionProps) {
  const [expandedTemplates, setExpandedTemplates] = useState<Set<number>>(new Set())
  const [deletingTemplate, setDeletingTemplate] = useState<number | null>(null)
  const [applyingTemplateId, setApplyingTemplateId] = useState<number | null>(null)

  const deleteTemplate = useDeleteCategoryTemplate()
  const applyTemplate = useApplyTemplate()

  const toggleTemplate = (templateId: number) => {
    const newExpanded = new Set(expandedTemplates)
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId)
    } else {
      newExpanded.add(templateId)
    }
    setExpandedTemplates(newExpanded)
  }

  const handleDelete = async () => {
    if (deletingTemplate) {
      await deleteTemplate.mutateAsync(deletingTemplate)
      setDeletingTemplate(null)
    }
  }

  // ISSUE 5 FIX: Add loading state and feedback for bulk operations
  const handleApplyToSelected = async (templateId: number) => {
    if (selectedDishIds.size === 0) return

    try {
      await applyTemplate.mutateAsync({
        template_id: templateId,
        dish_ids: Array.from(selectedDishIds),
      })
      setApplyingTemplateId(null)
    } catch (error) {
      console.error('[BULK-ACTION] Failed to apply template to selected dishes:', error)
    }
  }

  const handleApplyToAll = async (templateId: number) => {
    try {
      await applyTemplate.mutateAsync({
        template_id: templateId,
        course_id: courseId,
      })
      setApplyingTemplateId(null)
    } catch (error) {
      console.error('[BULK-ACTION] Failed to apply template to all dishes:', error)
    }
  }

  return (
    <>
      <div className="pl-8 space-y-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Category Modifier Groups</h4>
            {templates.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {templates.length}
              </Badge>
            )}
          </div>
          {templates.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Create reusable modifier groups to apply to dishes
            </p>
          )}
        </div>

        {templates.length === 0 ? (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No modifier groups yet. Create one to apply the same options to multiple dishes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <Card key={template.id} className="bg-card border hover-elevate">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Collapsible
                      open={expandedTemplates.has(template.id)}
                      onOpenChange={() => toggleTemplate(template.id)}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            data-testid={`button-toggle-template-${template.id}`}
                          >
                            {expandedTemplates.has(template.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate" data-testid={`text-template-name-${template.id}`}>
                              {template.name}
                            </span>
                            <Badge variant={template.is_required ? "default" : "secondary"} className="text-xs shrink-0">
                              {template.is_required ? 'Required' : 'Optional'}
                            </Badge>
                            {template.min_selections !== undefined && template.max_selections !== undefined && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {template.min_selections === template.max_selections 
                                  ? `Choose ${template.min_selections}`
                                  : `Choose ${template.min_selections}-${template.max_selections}`
                                }
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground shrink-0">
                              • {template.course_template_modifiers?.length || 0} options
                            </span>
                          </div>
                        </div>
                      </div>

                      <CollapsibleContent className="mt-3 space-y-1">
                        {template.course_template_modifiers?.map((modifier, idx) => (
                          <div
                            key={modifier.id || idx}
                            className="flex items-center justify-between text-sm pl-9 py-1.5 rounded hover:bg-muted/50"
                            data-testid={`modifier-${template.id}-${idx}`}
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
                          data-testid={`button-template-menu-${template.id}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onClick={() => onEditTemplate(template)}
                          data-testid={`button-edit-template-${template.id}`}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Modifier Group
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {selectedDishIds.size > 0 && (
                          <DropdownMenuItem
                            onClick={() => setApplyingTemplateId(template.id)}
                            data-testid={`button-apply-to-selected-${template.id}`}
                          >
                            Apply to {selectedDishIds.size} Selected Dish{selectedDishIds.size > 1 ? 'es' : ''}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setApplyingTemplateId(template.id)
                          }}
                          data-testid={`button-apply-to-all-${template.id}`}
                        >
                          Apply to All Dishes in Category
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingTemplate(template.id)}
                          className="text-destructive"
                          data-testid={`button-delete-template-${template.id}`}
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
      <AlertDialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
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

      {/* Apply Template Confirmation */}
      <AlertDialog open={!!applyingTemplateId} onOpenChange={(open) => !open && setApplyingTemplateId(null)}>
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
                  onClick={() => applyingTemplateId && handleApplyToSelected(applyingTemplateId)}
                  disabled={applyTemplate.isPending}
                  data-testid="button-apply-selected"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">
                      {applyTemplate.isPending 
                        ? `Applying to ${selectedDishIds.size} dish${selectedDishIds.size > 1 ? 'es' : ''}...`
                        : `Apply to ${selectedDishIds.size} Selected Dish${selectedDishIds.size > 1 ? 'es' : ''}`
                      }
                    </span>
                    {!applyTemplate.isPending && (
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
                onClick={() => applyingTemplateId && handleApplyToAll(applyingTemplateId)}
                disabled={applyTemplate.isPending}
                data-testid="button-apply-all-category"
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium">
                    {applyTemplate.isPending 
                      ? 'Applying to all dishes...'
                      : 'Apply to All Dishes in This Category'
                    }
                  </span>
                  {!applyTemplate.isPending && (
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
              disabled={applyTemplate.isPending}
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
