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
  GripVertical,
  UtensilsCrossed,
  Eye,
  EyeOff
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
  DropdownMenuSeparator,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { SearchableRestaurantSelect } from "@/components/admin/searchable-restaurant-select"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import {
  useMenuCourses,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useReorderCourses,
  MenuCourse,
} from "@/lib/hooks/use-menu"
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

export default function MenuCategoriesPage() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<MenuCourse | null>(null)
  const [deletingCourseId, setDeletingCourseId] = useState<number | null>(null)

  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants()
  const { data: courses = [], isLoading: loadingCourses } = useMenuCourses(
    selectedRestaurantId ? parseInt(selectedRestaurantId) : 0
  )

  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const deleteCourse = useDeleteCourse()
  const reorderCourses = useReorderCourses()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
    })
  }

  const handleCreate = () => {
    setEditingCourse(null)
    resetForm()
    setCreateDialogOpen(true)
  }

  const handleEdit = (course: MenuCourse) => {
    setEditingCourse(course)
    setFormData({
      name: course.name,
      description: course.description || '',
      is_active: course.is_active,
    })
    setCreateDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedRestaurantId) return

    if (editingCourse) {
      await updateCourse.mutateAsync({
        id: editingCourse.id,
        restaurant_id: parseInt(selectedRestaurantId),
        data: {
          name: formData.name,
          description: formData.description || null,
          is_active: formData.is_active,
        },
      })
    } else {
      await createCourse.mutateAsync({
        restaurant_id: parseInt(selectedRestaurantId),
        name: formData.name,
        description: formData.description || null,
        is_active: formData.is_active,
      })
    }

    setCreateDialogOpen(false)
    resetForm()
    setEditingCourse(null)
  }

  const handleDelete = async () => {
    if (deletingCourseId && selectedRestaurantId) {
      await deleteCourse.mutateAsync({
        id: deletingCourseId,
        restaurant_id: parseInt(selectedRestaurantId),
      })
      setDeletingCourseId(null)
    }
  }

  const handleToggleActive = async (course: MenuCourse) => {
    if (!selectedRestaurantId) return
    
    await updateCourse.mutateAsync({
      id: course.id,
      restaurant_id: parseInt(selectedRestaurantId),
      data: { is_active: !course.is_active },
    })
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !selectedRestaurantId) return
    
    const items = Array.from(courses)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    
    const courseIds = items.map(item => item.id)
    
    await reorderCourses.mutateAsync({
      restaurant_id: parseInt(selectedRestaurantId),
      course_ids: courseIds,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Menu Categories
        </h1>
        <p className="text-muted-foreground">
          Manage menu categories (courses) for your restaurants
        </p>
      </div>

      {/* Restaurant Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Restaurant</CardTitle>
          <CardDescription>Choose a restaurant to manage its menu categories</CardDescription>
        </CardHeader>
        <CardContent>
          <SearchableRestaurantSelect
            restaurants={restaurants}
            value={selectedRestaurantId}
            onValueChange={setSelectedRestaurantId}
            isLoading={loadingRestaurants}
            placeholder="Select a restaurant"
            data-testid="select-restaurant"
          />
        </CardContent>
      </Card>

      {/* Categories List */}
      {selectedRestaurantId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Drag to reorder categories as they appear on the menu
                </CardDescription>
              </div>
              <Button onClick={handleCreate} data-testid="button-create-category">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCourses ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No categories yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first category to organize your menu
                </p>
                <Button onClick={handleCreate} variant="outline" data-testid="button-create-first">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="courses">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {courses.map((course, index) => (
                        <Draggable
                          key={course.id}
                          draggableId={course.id.toString()}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-3 p-4 border rounded-lg bg-card ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                              data-testid={`category-item-${course.id}`}
                            >
                              <div {...provided.dragHandleProps} className="cursor-grab">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>

                              <div className="flex items-center gap-3 flex-1">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium" data-testid={`text-category-name-${course.id}`}>
                                      {course.name}
                                    </h4>
                                    {!course.is_active && (
                                      <Badge variant="secondary" className="text-xs">
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>
                                  {course.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {course.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-menu-${course.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleToggleActive(course)}
                                    data-testid={`button-toggle-active-${course.id}`}
                                  >
                                    {course.is_active ? (
                                      <>
                                        <EyeOff className="h-4 w-4 mr-2" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(course)}
                                    data-testid={`button-edit-${course.id}`}
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeletingCourseId(course.id)}
                                    className="text-destructive"
                                    data-testid={`button-delete-${course.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-category-form">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCourse
                ? 'Update category details'
                : 'Add a new menu category (e.g., Appetizers, Main Courses, Desserts)'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Appetizers"
                required
                data-testid="input-category-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
                data-testid="input-category-description"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Show this category on the menu
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                data-testid="switch-category-active"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false)
                  resetForm()
                  setEditingCourse(null)
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCourse.isPending || updateCourse.isPending}
                data-testid="button-submit"
              >
                {editingCourse ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCourseId} onOpenChange={() => setDeletingCourseId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category. This action cannot be undone.
              {courses.find(c => c.id === deletingCourseId) && (
                <p className="mt-2 font-medium">
                  Note: Make sure there are no dishes assigned to this category first.
                </p>
              )}
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
