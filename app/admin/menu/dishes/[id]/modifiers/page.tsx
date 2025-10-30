'use client';

import { useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, GripVertical, Trash2, Edit, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  useModifierGroups,
  useModifiers,
  useCreateModifierGroup,
  useUpdateModifierGroup,
  useDeleteModifierGroup,
  useReorderModifierGroups,
  useCreateModifier,
  useUpdateModifier,
  useDeleteModifier,
  useReorderModifiers,
  type ModifierGroup,
  type Modifier,
} from '@/lib/hooks/use-modifiers';

const modifierGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  is_required: z.boolean(),
  min_selections: z.number().min(0),
  max_selections: z.number().min(1),
});

const modifierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number().min(0, 'Price cannot be negative'),
  is_default: z.boolean(),
});

export default function DishModifiersPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const dishId = parseInt(resolvedParams.id);
  const router = useRouter();

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [modifierDialogOpen, setModifierDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [editingModifier, setEditingModifier] = useState<{ modifier: Modifier; groupId: number } | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);

  const { data: groups = [], isLoading: groupsLoading } = useModifierGroups(dishId);
  const createGroupMutation = useCreateModifierGroup();
  const updateGroupMutation = useUpdateModifierGroup();
  const deleteGroupMutation = useDeleteModifierGroup();
  const reorderGroupsMutation = useReorderModifierGroups();

  const createModifierMutation = useCreateModifier();
  const updateModifierMutation = useUpdateModifier();
  const deleteModifierMutation = useDeleteModifier();
  const reorderModifiersMutation = useReorderModifiers();

  const groupForm = useForm<z.infer<typeof modifierGroupSchema>>({
    resolver: zodResolver(modifierGroupSchema),
    defaultValues: {
      name: '',
      is_required: false,
      min_selections: 0,
      max_selections: 1,
    },
  });

  const modifierForm = useForm<z.infer<typeof modifierSchema>>({
    resolver: zodResolver(modifierSchema),
    defaultValues: {
      name: '',
      price: 0,
      is_default: false,
    },
  });

  const handleGroupDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(groups);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const groupIds = items.map((group) => group.id);
    reorderGroupsMutation.mutate({ dishId, groupIds });
  };

  const handleModifierDragEnd = (result: DropResult, groupId: number, currentModifiers: Modifier[]) => {
    if (!result.destination) return;

    const items = Array.from(currentModifiers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const modifierIds = items.map((mod) => mod.id);
    reorderModifiersMutation.mutate({ dishId, groupId, modifierIds });
  };

  const handleGroupSubmit = groupForm.handleSubmit((data) => {
    if (editingGroup) {
      updateGroupMutation.mutate(
        { dishId, groupId: editingGroup.id, data },
        {
          onSuccess: () => {
            setGroupDialogOpen(false);
            setEditingGroup(null);
            groupForm.reset();
          },
        }
      );
    } else {
      createGroupMutation.mutate(
        { dishId, data },
        {
          onSuccess: () => {
            setGroupDialogOpen(false);
            groupForm.reset();
          },
        }
      );
    }
  });

  const handleModifierSubmit = modifierForm.handleSubmit((data) => {
    if (editingModifier) {
      updateModifierMutation.mutate(
        {
          dishId,
          groupId: editingModifier.groupId,
          modifierId: editingModifier.modifier.id,
          data,
        },
        {
          onSuccess: () => {
            setModifierDialogOpen(false);
            setEditingModifier(null);
            modifierForm.reset();
          },
        }
      );
    } else if (expandedGroupId) {
      createModifierMutation.mutate(
        { dishId, groupId: expandedGroupId, data },
        {
          onSuccess: () => {
            setModifierDialogOpen(false);
            modifierForm.reset();
          },
        }
      );
    }
  });

  const openGroupDialog = (group?: ModifierGroup) => {
    if (group) {
      setEditingGroup(group);
      groupForm.reset({
        name: group.name,
        is_required: group.is_required,
        min_selections: group.min_selections,
        max_selections: group.max_selections,
      });
    } else {
      setEditingGroup(null);
      groupForm.reset({
        name: '',
        is_required: false,
        min_selections: 0,
        max_selections: 1,
      });
    }
    setGroupDialogOpen(true);
  };

  const openModifierDialog = (groupId: number, modifier?: Modifier) => {
    setExpandedGroupId(groupId);
    if (modifier) {
      setEditingModifier({ modifier, groupId });
      modifierForm.reset({
        name: modifier.name,
        price: modifier.price,
        is_default: modifier.is_default,
      });
    } else {
      setEditingModifier(null);
      modifierForm.reset({
        name: '',
        price: 0,
        is_default: false,
      });
    }
    setModifierDialogOpen(true);
  };

  if (groupsLoading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading modifiers...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/menu/dishes')}
          className="mb-4"
          data-testid="button-back-to-dishes"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dishes
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dish Modifiers</h1>
            <p className="text-muted-foreground mt-1">
              Manage modifier groups and options for this dish
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                groupForm.reset({
                  name: 'Size',
                  is_required: true,
                  min_selections: 1,
                  max_selections: 1,
                });
                setEditingGroup(null);
                setGroupDialogOpen(true);
              }}
              data-testid="button-quick-create-size"
            >
              Quick Create: Size
            </Button>
            <Button onClick={() => openGroupDialog()} data-testid="button-create-modifier-group">
              <Plus className="mr-2 h-4 w-4" />
              Add Modifier Group
            </Button>
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No modifier groups yet</p>
            <Button onClick={() => openGroupDialog()} data-testid="button-create-first-group">
              <Plus className="mr-2 h-4 w-4" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleGroupDragEnd}>
          <Droppable droppableId="modifier-groups">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {groups.map((group, index) => (
                  <Draggable key={group.id} draggableId={String(group.id)} index={index}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}>
                        <ModifierGroupCard
                          group={group}
                          dishId={dishId}
                          dragHandleProps={provided.dragHandleProps}
                          onEdit={() => openGroupDialog(group)}
                          onDelete={() => deleteGroupMutation.mutate({ dishId, groupId: group.id })}
                          onAddModifier={() => openModifierDialog(group.id)}
                          onEditModifier={(modifier) => openModifierDialog(group.id, modifier)}
                          onDeleteModifier={(modifierId) =>
                            deleteModifierMutation.mutate({ dishId, groupId: group.id, modifierId })
                          }
                          onModifierDragEnd={(result, modifiers) => handleModifierDragEnd(result, group.id, modifiers)}
                          expanded={expandedGroupId === group.id}
                          onToggleExpand={() =>
                            setExpandedGroupId(expandedGroupId === group.id ? null : group.id)
                          }
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

      {/* Modifier Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent data-testid="dialog-modifier-group">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit' : 'Create'} Modifier Group</DialogTitle>
            <DialogDescription>
              {editingGroup
                ? 'Update the modifier group details'
                : 'Create a new modifier group for this dish'}
            </DialogDescription>
          </DialogHeader>
          <Form {...groupForm}>
            <form onSubmit={handleGroupSubmit} className="space-y-4">
              <FormField
                control={groupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Size, Toppings, Protein" {...field} data-testid="input-group-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={groupForm.control}
                name="is_required"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Required</FormLabel>
                      <FormDescription>Customer must select from this group</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-group-required"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={groupForm.control}
                  name="min_selections"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Selections</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-group-min"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={groupForm.control}
                  name="max_selections"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Selections</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-group-max"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setGroupDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-save-group">
                  {editingGroup ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modifier Dialog */}
      <Dialog open={modifierDialogOpen} onOpenChange={setModifierDialogOpen}>
        <DialogContent data-testid="dialog-modifier">
          <DialogHeader>
            <DialogTitle>{editingModifier ? 'Edit' : 'Create'} Modifier</DialogTitle>
            <DialogDescription>
              {editingModifier ? 'Update the modifier details' : 'Add a new modifier option'}
            </DialogDescription>
          </DialogHeader>
          <Form {...modifierForm}>
            <form onSubmit={handleModifierSubmit} className="space-y-4">
              <FormField
                control={modifierForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Large, Extra Cheese"
                        {...field}
                        data-testid="input-modifier-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={modifierForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Adjustment (CAD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-modifier-price"
                      />
                    </FormControl>
                    <FormDescription>Additional cost for this option (use 0 for free)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={modifierForm.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Default Selection</FormLabel>
                      <FormDescription>Pre-select this option</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-modifier-default"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModifierDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-save-modifier">
                  {editingModifier ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModifierGroupCard({
  group,
  dishId,
  dragHandleProps,
  onEdit,
  onDelete,
  onAddModifier,
  onEditModifier,
  onDeleteModifier,
  onModifierDragEnd,
  expanded,
  onToggleExpand,
}: {
  group: ModifierGroup;
  dishId: number;
  dragHandleProps: any;
  onEdit: () => void;
  onDelete: () => void;
  onAddModifier: () => void;
  onEditModifier: (modifier: Modifier) => void;
  onDeleteModifier: (modifierId: number) => void;
  onModifierDragEnd: (result: DropResult, modifiers: Modifier[]) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const { data: modifiers = [], isLoading } = useModifiers(dishId, group.id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {group.name}
                {group.is_required && <Badge variant="destructive">Required</Badge>}
              </CardTitle>
              <CardDescription>
                Choose {group.min_selections === group.max_selections
                  ? group.max_selections
                  : `${group.min_selections}-${group.max_selections}`}{' '}
                • {modifiers.length} option{modifiers.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onToggleExpand} data-testid={`button-toggle-group-${group.id}`}>
              {expanded ? 'Hide' : 'Show'} Options
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-group-${group.id}`}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              data-testid={`button-delete-group-${group.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <Separator className="mb-4" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Modifier Options</h3>
            <Button size="sm" onClick={onAddModifier} data-testid={`button-add-modifier-${group.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading modifiers...</p>
          ) : modifiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No modifier options yet</p>
          ) : (
            <DragDropContext onDragEnd={(result) => onModifierDragEnd(result, modifiers)}>
              <Droppable droppableId={`modifiers-${group.id}`}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {modifiers.map((modifier, index) => (
                      <Draggable key={modifier.id} draggableId={`mod-${modifier.id}`} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex items-center gap-2 flex-1">
                                <span className="font-medium">{modifier.name}</span>
                                {modifier.price > 0 && (
                                  <span className="text-sm text-muted-foreground">
                                    +${modifier.price.toFixed(2)}
                                  </span>
                                )}
                                {modifier.price === 0 && (
                                  <span className="text-sm text-muted-foreground">Free</span>
                                )}
                                {modifier.is_default && <Badge variant="secondary">Default</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEditModifier(modifier)}
                                data-testid={`button-edit-modifier-${modifier.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDeleteModifier(modifier.id)}
                                data-testid={`button-delete-modifier-${modifier.id}`}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
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
      )}
    </Card>
  );
}
