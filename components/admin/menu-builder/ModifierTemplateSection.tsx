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

  if (templates.length === 0) {
    return null
  }

  return (
    <>
      <div className="pl-8 space-y-2">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Modifier Templates ({templates.length})
        </p>
        {templates.map((template) => (
          <Card key={template.id} className="bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Collapsible
                  open={expandedTemplates.has(template.id)}
                  onOpenChange={() => toggleTemplate(template.id)}
                  className="flex-1"
                >
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        data-testid={`button-toggle-template-${template.id}`}
                      >
                        {expandedTemplates.has(template.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm" data-testid={`text-template-name-${template.id}`}>
                          {template.name}
                        </span>
                        <Badge variant={template.is_required ? "default" : "secondary"} className="text-xs">
                          {template.is_required ? 'Required' : 'Optional'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {template.course_template_modifiers?.length || 0} modifiers
                        </span>
                      </div>
                    </div>
                  </div>

                  <CollapsibleContent className="mt-3 space-y-1">
                    {template.course_template_modifiers?.map((modifier, idx) => (
                      <div
                        key={modifier.id || idx}
                        className="flex items-center justify-between text-sm pl-8 py-1"
                        data-testid={`modifier-${template.id}-${idx}`}
                      >
                        <span>{modifier.name}</span>
                        <div className="flex items-center gap-2">
                          {modifier.price > 0 && (
                            <span className="text-muted-foreground">+${modifier.price.toFixed(2)}</span>
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
                      className="h-8 w-8"
                      data-testid={`button-template-menu-${template.id}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onEditTemplate(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Template
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
                      Delete Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the template but will NOT affect dishes that are already using it.
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
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply Template Confirmation */}
      <AlertDialog open={!!applyingTemplateId} onOpenChange={(open) => !open && setApplyingTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Modifier Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose how to apply this template:
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* ISSUE 5 FIX: Show loading state during bulk operations */}
          <div className="space-y-2">
            {selectedDishIds.size > 0 && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => applyingTemplateId && handleApplyToSelected(applyingTemplateId)}
                disabled={applyTemplate.isPending}
                data-testid="button-apply-selected"
              >
                {applyTemplate.isPending ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Applying to {selectedDishIds.size} dish{selectedDishIds.size > 1 ? 'es' : ''}...
                  </>
                ) : (
                  <>Apply to {selectedDishIds.size} Selected Dish{selectedDishIds.size > 1 ? 'es' : ''}</>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => applyingTemplateId && handleApplyToAll(applyingTemplateId)}
              disabled={applyTemplate.isPending}
              data-testid="button-apply-all-category"
            >
              {applyTemplate.isPending ? (
                <>
                  <span className="mr-2">⏳</span>
                  Applying to all dishes...
                </>
              ) : (
                <>Apply to All Dishes in This Category</>
              )}
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-apply">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
