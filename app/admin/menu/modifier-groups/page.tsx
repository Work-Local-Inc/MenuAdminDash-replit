"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Tag,
  DollarSign,
  Info
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import {
  useRestaurantModifierGroups,
  useCreateCategoryTemplate,
  useUpdateCategoryTemplate,
  useDeleteCategoryTemplate,
  RestaurantModifierGroup,
  CreateModifierGroupData,
} from "@/lib/hooks/use-menu-builder"
import { useMenuCourses } from "@/lib/hooks/use-menu"

export default function ModifierGroupsPage() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<RestaurantModifierGroup | null>(null)
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null)

  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants()
  const { data: modifierGroups = [], isLoading: loadingGroups } = useRestaurantModifierGroups(
    selectedRestaurantId ? parseInt(selectedRestaurantId) : 0
  )
  const { data: courses = [], isLoading: loadingCourses } = useMenuCourses(
    selectedRestaurantId ? parseInt(selectedRestaurantId) : 0
  )

  const createGroup = useCreateCategoryTemplate()
  const updateGroup = useUpdateCategoryTemplate()
  const deleteGroup = useDeleteCategoryTemplate()

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    is_required: false,
    min_selections: 0,
    max_selections: 1,
    modifiers: [{ name: '', price: 0, is_included: false }]
  })

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: '',
      is_required: false,
      min_selections: 0,
      max_selections: 1,
      modifiers: [{ name: '', price: 0, is_included: false }]
    })
  }

  const handleCreate = () => {
    setEditingGroup(null)
    resetForm()
    setCreateDialogOpen(true)
  }

  const handleEdit = (group: RestaurantModifierGroup) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      category_id: group.course_id.toString(),
      is_required: group.is_required,
      min_selections: group.min_selections,
      max_selections: group.max_selections,
      modifiers: group.modifiers.map(m => ({
        name: m.name,
        price: m.price,
        is_included: m.is_included
      }))
    })
    setCreateDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.category_id || formData.modifiers.length === 0) return

    const data: CreateModifierGroupData = {
      course_id: parseInt(formData.category_id),
      name: formData.name,
      is_required: formData.is_required,
      min_selections: formData.min_selections,
      max_selections: formData.max_selections,
      modifiers: formData.modifiers.filter(m => m.name.trim() !== '')
    }

    if (editingGroup) {
      await updateGroup.mutateAsync({
        id: editingGroup.id,
        data
      })
    } else {
      await createGroup.mutateAsync(data)
    }

    setCreateDialogOpen(false)
    resetForm()
  }

  const handleDelete = async () => {
    if (!deletingGroupId) return
    await deleteGroup.mutateAsync(deletingGroupId)
    setDeletingGroupId(null)
  }

  const addModifier = () => {
    setFormData(prev => ({
      ...prev,
      modifiers: [...prev.modifiers, { name: '', price: 0, is_included: false }]
    }))
  }

  const removeModifier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.filter((_, i) => i !== index)
    }))
  }

  const updateModifier = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.map((m, i) => 
        i === index ? { ...m, [field]: value } : m
      )
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Modifier Groups
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Manage modifier groups that can be associated with categories
          </p>
        </div>
        {selectedRestaurantId && (
          <Button 
            onClick={handleCreate}
            data-testid="button-create-group"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Modifier Group
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Restaurant</CardTitle>
          <CardDescription>
            Choose a restaurant to manage its modifier groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRestaurants ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={selectedRestaurantId}
              onValueChange={setSelectedRestaurantId}
              data-testid="select-restaurant"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select restaurant..." />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((restaurant: any) => (
                  <SelectItem 
                    key={restaurant.id} 
                    value={restaurant.id.toString()}
                    data-testid={`select-restaurant-${restaurant.id}`}
                  >
                    {restaurant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedRestaurantId && (
        <>
          {loadingGroups ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : modifierGroups.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold" data-testid="text-no-groups">
                  No Modifier Groups
                </h3>
                <p className="text-muted-foreground" data-testid="text-no-groups-description">
                  Create your first modifier group to get started
                </p>
                <Button onClick={handleCreate} className="mt-4" data-testid="button-create-first">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Modifier Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {modifierGroups.map((group) => (
                <Card key={group.id} data-testid={`card-group-${group.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg" data-testid={`text-group-name-${group.id}`}>
                          {group.name}
                        </CardTitle>
                        <CardDescription data-testid={`text-group-category-${group.id}`}>
                          {group.course_name}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            data-testid={`button-group-menu-${group.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleEdit(group)}
                            data-testid={`button-edit-group-${group.id}`}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeletingGroupId(group.id)}
                            className="text-destructive"
                            data-testid={`button-delete-group-${group.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Modifiers</span>
                        <Badge variant="secondary" data-testid={`text-modifier-count-${group.id}`}>
                          {group.modifiers.length}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        {group.modifiers.slice(0, 3).map((modifier, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between text-sm"
                            data-testid={`text-modifier-${group.id}-${idx}`}
                          >
                            <span className="truncate">{modifier.name}</span>
                            <span className="text-muted-foreground">
                              {modifier.is_included ? 'Included' : `+$${modifier.price.toFixed(2)}`}
                            </span>
                          </div>
                        ))}
                        {group.modifiers.length > 3 && (
                          <div className="text-sm text-muted-foreground">
                            +{group.modifiers.length - 3} more
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {group.is_required && (
                          <Badge variant="outline" data-testid={`badge-required-${group.id}`}>
                            Required
                          </Badge>
                        )}
                        <Badge 
                          variant="outline"
                          data-testid={`badge-selections-${group.id}`}
                        >
                          {group.min_selections}-{group.max_selections} selections
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingGroup ? 'Edit Modifier Group' : 'Create Modifier Group'}
            </DialogTitle>
            <DialogDescription>
              {editingGroup 
                ? 'Update the modifier group details and options'
                : 'Create a new modifier group that can be associated with categories'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Sauces, Toppings, Cooking Style"
                  required
                  data-testid="input-group-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                  required
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem 
                        key={course.id} 
                        value={course.id.toString()}
                        data-testid={`select-category-${course.id}`}
                      >
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="required">Required Selection</Label>
                <Switch
                  id="required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
                  data-testid="switch-required"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min">Min Selections</Label>
                  <Input
                    id="min"
                    type="number"
                    min="0"
                    value={formData.min_selections}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_selections: parseInt(e.target.value) || 0 }))}
                    data-testid="input-min-selections"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max">Max Selections</Label>
                  <Input
                    id="max"
                    type="number"
                    min="1"
                    value={formData.max_selections}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_selections: parseInt(e.target.value) || 1 }))}
                    data-testid="input-max-selections"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Modifiers</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addModifier}
                  data-testid="button-add-modifier"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Modifier
                </Button>
              </div>

              <div className="space-y-3">
                {formData.modifiers.map((modifier, index) => (
                  <Card key={index} data-testid={`card-modifier-${index}`}>
                    <CardContent className="pt-4">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Modifier name"
                            value={modifier.name}
                            onChange={(e) => updateModifier(index, 'name', e.target.value)}
                            required
                            data-testid={`input-modifier-name-${index}`}
                          />
                        </div>
                        <div className="w-32 space-y-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Price"
                            value={modifier.price}
                            onChange={(e) => updateModifier(index, 'price', parseFloat(e.target.value) || 0)}
                            data-testid={`input-modifier-price-${index}`}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={modifier.is_included}
                            onCheckedChange={(checked) => updateModifier(index, 'is_included', checked)}
                            data-testid={`switch-modifier-included-${index}`}
                          />
                          <Label className="text-xs">Free</Label>
                        </div>
                        {formData.modifiers.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeModifier(index)}
                            data-testid={`button-remove-modifier-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createGroup.isPending || updateGroup.isPending}
                data-testid="button-save"
              >
                {editingGroup ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingGroupId} onOpenChange={() => setDeletingGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Modifier Group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the modifier group. Dishes currently using this group will keep their current modifiers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
