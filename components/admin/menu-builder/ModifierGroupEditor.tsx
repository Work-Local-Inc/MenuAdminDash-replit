"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { CategoryModifierTemplate, useCreateCategoryTemplate, useUpdateCategoryTemplate } from '@/lib/hooks/use-menu-builder'
import { Checkbox } from '@/components/ui/checkbox'

interface ModifierItem {
  id: string
  name: string
  price: number
  is_included: boolean
}

interface ModifierGroupEditorProps {
  courseId: number
  template?: CategoryModifierTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModifierGroupEditor({ courseId, template, open, onOpenChange }: ModifierGroupEditorProps) {
  const [name, setName] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [minSelections, setMinSelections] = useState(0)
  const [maxSelections, setMaxSelections] = useState(1)
  const [modifiers, setModifiers] = useState<ModifierItem[]>([])

  const createTemplate = useCreateCategoryTemplate()
  const updateTemplate = useUpdateCategoryTemplate()

  useEffect(() => {
    if (template) {
      setName(template.name)
      setIsRequired(template.is_required)
      setMinSelections(template.min_selections)
      setMaxSelections(template.max_selections)
      setModifiers(
        template.course_template_modifiers?.map((m, index) => ({
          id: m.id?.toString() || `new-${index}`,
          name: m.name,
          price: m.price,
          is_included: m.is_included,
        })) || []
      )
    } else {
      setName('')
      setIsRequired(false)
      setMinSelections(0)
      setMaxSelections(1)
      setModifiers([])
    }
  }, [template, open])

  const addModifier = () => {
    setModifiers([
      ...modifiers,
      { id: `new-${Date.now()}`, name: '', price: 0, is_included: false }
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

  const handleSave = async () => {
    const templateData = {
      course_id: courseId,
      name,
      is_required: isRequired,
      min_selections: minSelections,
      max_selections: maxSelections,
      modifiers: modifiers.map(m => ({
        name: m.name,
        price: m.price,
        is_included: m.is_included,
      })),
    }

    if (template) {
      await updateTemplate.mutateAsync({
        id: template.id,
        data: templateData,
      })
    } else {
      await createTemplate.mutateAsync(templateData)
    }

    onOpenChange(false)
  }

  const isValid = name.trim() && modifiers.length > 0 && modifiers.every(m => m.name.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-modifier-group-editor">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit' : 'Create'} Modifier Group
          </DialogTitle>
          <DialogDescription>
            Create a reusable modifier group for this category
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
              data-testid="input-template-name"
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
              <Droppable droppableId="template-modifiers">
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
                              <Label className="text-sm">Included</Label>
                            </div>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeModifier(modifier.id)}
                              data-testid={`button-remove-modifier-${index}`}
                            >
                              <Trash2 className="w-4 h-4" />
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
              <p className="text-sm text-muted-foreground text-center py-8">
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
            disabled={!isValid || createTemplate.isPending || updateTemplate.isPending}
            data-testid="button-save-template"
          >
            {(createTemplate.isPending || updateTemplate.isPending) ? 'Saving...' : 'Save Modifier Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
