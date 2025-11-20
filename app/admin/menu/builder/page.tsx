"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Search, X, CheckSquare, Square } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useRestaurants } from '@/lib/hooks/use-restaurants'
import {
  useMenuBuilder,
  MenuBuilderCategory,
  MenuBuilderDish,
  CategoryModifierTemplate,
  useBreakInheritance,
  useReorderMenuItems,
} from '@/lib/hooks/use-menu-builder'
import {
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useCreateDish,
  useUpdateDish,
  useDeleteDish,
  useReorderCourses,
} from '@/lib/hooks/use-menu'
import { MenuBuilderLayout } from '@/components/admin/menu-builder/MenuBuilderLayout'
import { CategorySection } from '@/components/admin/menu-builder/CategorySection'
import { ModifierGroupEditor } from '@/components/admin/menu-builder/ModifierGroupEditor'
import { LiveMenuPreview } from '@/components/admin/menu-builder/LiveMenuPreview'
import { InlinePriceEditor } from '@/components/admin/menu-builder/InlinePriceEditor'
import { useRouter } from 'next/navigation'

export default function MenuBuilderPage() {
  const router = useRouter()
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showPreview, setShowPreview] = useState(true)
  const [selectedDishIds, setSelectedDishIds] = useState<Set<number>>(new Set())

  // Dialogs
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuBuilderCategory | null>(null)
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null)

  const [dishDialogOpen, setDishDialogOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<MenuBuilderDish | null>(null)
  const [dishCategoryId, setDishCategoryId] = useState<number | null>(null)
  const [deletingDishId, setDeletingDishId] = useState<number | null>(null)

  const [priceEditorOpen, setPriceEditorOpen] = useState(false)
  const [editingPriceDish, setEditingPriceDish] = useState<MenuBuilderDish | null>(null)

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateCourseId, setTemplateCourseId] = useState<number | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<CategoryModifierTemplate | null>(null)

  // Hooks
  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants()
  
  // ISSUE 1 FIX: Only call useMenuBuilder when valid restaurant selected
  const { data: categories = [], isLoading: loadingCategories } = useMenuBuilder(
    selectedRestaurantId && parseInt(selectedRestaurantId) > 0 ? parseInt(selectedRestaurantId) : null
  )

  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const deleteCourse = useDeleteCourse()
  const reorderCourses = useReorderCourses()

  const createDish = useCreateDish()
  const updateDish = useUpdateDish()
  const deleteDish = useDeleteDish()

  const breakInheritance = useBreakInheritance()

  // Category Form
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    is_active: true,
  })

  // Dish Form
  const [dishForm, setDishForm] = useState({
    name: '',
    description: '',
    price: '',
    is_active: true,
    is_featured: false,
  })

  // Find restaurant data for preview
  const selectedRestaurant = restaurants.find(
    r => r.id.toString() === selectedRestaurantId
  )

  // Filter categories and dishes
  const filteredCategories = categories
    .map(category => {
      let dishes = category.dishes

      // Apply search
      if (searchQuery) {
        dishes = dishes.filter(dish =>
          dish.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      // Apply status filter
      if (statusFilter === 'active') {
        dishes = dishes.filter(dish => dish.is_active)
      } else if (statusFilter === 'inactive') {
        dishes = dishes.filter(dish => !dish.is_active)
      }

      return { ...category, dishes }
    })
    .filter(category => {
      // Apply category filter
      if (categoryFilter !== 'all' && category.id.toString() !== categoryFilter) {
        return false
      }
      // Show category if it has dishes or no filters applied
      return category.dishes.length > 0 || (!searchQuery && statusFilter === 'all')
    })

  // Selection handlers
  const toggleSelectDish = (dishId: number) => {
    const newSelection = new Set(selectedDishIds)
    if (newSelection.has(dishId)) {
      newSelection.delete(dishId)
    } else {
      newSelection.add(dishId)
    }
    setSelectedDishIds(newSelection)
  }

  const toggleSelectAll = () => {
    const allDishIds = filteredCategories.flatMap(c => c.dishes.map(d => d.id))
    if (selectedDishIds.size === allDishIds.length) {
      setSelectedDishIds(new Set())
    } else {
      setSelectedDishIds(new Set(allDishIds))
    }
  }

  const clearSelection = () => setSelectedDishIds(new Set())

  // Category handlers
  const handleCreateCategory = () => {
    setEditingCategory(null)
    setCategoryForm({ name: '', description: '', is_active: true })
    setCategoryDialogOpen(true)
  }

  const handleEditCategory = (category: MenuBuilderCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active,
    })
    setCategoryDialogOpen(true)
  }

  const handleSaveCategory = async () => {
    if (!selectedRestaurantId) return

    if (editingCategory) {
      await updateCourse.mutateAsync({
        id: editingCategory.id,
        restaurant_id: parseInt(selectedRestaurantId),
        data: categoryForm,
      })
    } else {
      await createCourse.mutateAsync({
        restaurant_id: parseInt(selectedRestaurantId),
        ...categoryForm,
      })
    }

    setCategoryDialogOpen(false)
  }

  const handleDeleteCategory = async () => {
    if (deletingCategoryId && selectedRestaurantId) {
      await deleteCourse.mutateAsync({
        id: deletingCategoryId,
        restaurant_id: parseInt(selectedRestaurantId),
      })
      setDeletingCategoryId(null)
    }
  }

  const handleToggleCategoryActive = async (category: MenuBuilderCategory) => {
    if (!selectedRestaurantId) return
    await updateCourse.mutateAsync({
      id: category.id,
      restaurant_id: parseInt(selectedRestaurantId),
      data: { is_active: !category.is_active },
    })
  }

  // Dish handlers
  const handleAddDish = (categoryId: number) => {
    setDishCategoryId(categoryId)
    setEditingDish(null)
    setDishForm({
      name: '',
      description: '',
      price: '',
      is_active: true,
      is_featured: false,
    })
    setDishDialogOpen(true)
  }

  const handleEditDish = (dish: MenuBuilderDish) => {
    setDishCategoryId(dish.course_id)
    setEditingDish(dish)
    setDishForm({
      name: dish.name,
      description: dish.description || '',
      price: dish.price.toString(),
      is_active: dish.is_active,
      is_featured: dish.is_featured,
    })
    setDishDialogOpen(true)
  }

  const handleSaveDish = async () => {
    if (!selectedRestaurantId) return

    const dishData = {
      name: dishForm.name,
      description: dishForm.description || null,
      price: parseFloat(dishForm.price),
      course_id: dishCategoryId,
      is_active: dishForm.is_active,
      is_featured: dishForm.is_featured,
    }

    if (editingDish) {
      await updateDish.mutateAsync({
        id: editingDish.id,
        restaurant_id: parseInt(selectedRestaurantId),
        data: dishData,
      })
    } else {
      await createDish.mutateAsync({
        restaurant_id: parseInt(selectedRestaurantId),
        ...dishData,
      })
    }

    setDishDialogOpen(false)
  }

  const handleDeleteDish = async () => {
    if (deletingDishId && selectedRestaurantId) {
      await deleteDish.mutateAsync({
        id: deletingDishId,
        restaurant_id: parseInt(selectedRestaurantId),
      })
      setDeletingDishId(null)
      // Remove from selection if selected
      const newSelection = new Set(selectedDishIds)
      newSelection.delete(deletingDishId)
      setSelectedDishIds(newSelection)
    }
  }

  const handleToggleDishActive = async (dish: MenuBuilderDish) => {
    if (!selectedRestaurantId) return
    await updateDish.mutateAsync({
      id: dish.id,
      restaurant_id: parseInt(selectedRestaurantId),
      data: { is_active: !dish.is_active },
    })
  }

  const handleToggleDishFeatured = async (dish: MenuBuilderDish) => {
    if (!selectedRestaurantId) return
    await updateDish.mutateAsync({
      id: dish.id,
      restaurant_id: parseInt(selectedRestaurantId),
      data: { is_featured: !dish.is_featured },
    })
  }

  const handleEditDishPrice = (dish: MenuBuilderDish) => {
    setEditingPriceDish(dish)
    setPriceEditorOpen(true)
  }

  const handleViewDishModifiers = (dishId: number) => {
    router.push(`/admin/menu/dishes/${dishId}/modifiers`)
  }

  const handleBreakDishInheritance = async (dishId: number) => {
    await breakInheritance.mutateAsync(dishId)
  }

  // Template handlers
  const handleAddTemplate = (courseId: number) => {
    setTemplateCourseId(courseId)
    setEditingTemplate(null)
    setTemplateDialogOpen(true)
  }

  const handleEditTemplate = (categoryId: number, templateId: number) => {
    const category = categories.find(c => c.id === categoryId)
    const template = category?.templates.find(t => t.id === templateId)
    if (template) {
      setTemplateCourseId(categoryId)
      setEditingTemplate(template)
      setTemplateDialogOpen(true)
    }
  }

  // ISSUE 2 FIX: Category drag and drop handlers
  const handleCategoryDragEnd = async (result: DropResult) => {
    if (!result.destination || !selectedRestaurantId) return

    console.log('[DRAG-DROP] Category reorder:', {
      from: result.source.index,
      to: result.destination.index,
    })

    const items = Array.from(categories)
    const [reordered] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reordered)

    await reorderCourses.mutateAsync({
      restaurant_id: parseInt(selectedRestaurantId),
      course_ids: items.map(c => c.id),
    })
  }

  // ISSUE 2 FIX: Implement dish reordering
  const reorderMenuItems = useReorderMenuItems()
  
  const handleDishReorder = async (categoryId: number, dishIds: number[]) => {
    if (!selectedRestaurantId) return
    
    console.log('[DRAG-DROP] Dish reorder within category:', { categoryId, dishIds })
    
    await reorderMenuItems.mutateAsync({
      restaurant_id: parseInt(selectedRestaurantId),
      dish_ids: dishIds,
    })
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Menu Builder
        </h1>
        <p className="text-muted-foreground">
          Manage your complete menu in one place - categories, dishes, and modifier templates
        </p>
      </div>

      {/* Restaurant Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Restaurant</CardTitle>
          <CardDescription>Choose a restaurant to manage its menu</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRestaurants ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
              <SelectTrigger data-testid="select-restaurant">
                <SelectValue placeholder="Select a restaurant" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((restaurant: any) => (
                  <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                    {restaurant.name} - {restaurant.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Toolbar */}
      {selectedRestaurantId && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
                {searchQuery && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                    data-testid="button-clear-search"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Add Category */}
              <Button onClick={handleCreateCategory} data-testid="button-create-category">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>

            {/* Selection Toolbar */}
            {selectedDishIds.size > 0 && (
              <div className="flex items-center gap-3 mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleSelectAll}
                  data-testid="button-toggle-select-all"
                >
                  {selectedDishIds.size === filteredCategories.flatMap(c => c.dishes).length ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
                <span className="text-sm font-medium" data-testid="text-selection-count">
                  {selectedDishIds.size} dish{selectedDishIds.size > 1 ? 'es' : ''} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearSelection}
                  data-testid="button-clear-selection"
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ISSUE 1 & 6 FIX: Only show builder when restaurant selected */}
      {!selectedRestaurantId && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium mb-2">No Restaurant Selected</p>
            <p className="text-muted-foreground">
              Please select a restaurant above to start building your menu
            </p>
          </CardContent>
        </Card>
      )}

      {/* Menu Builder Layout */}
      {selectedRestaurantId && parseInt(selectedRestaurantId) > 0 && (
        <MenuBuilderLayout
          showPreview={showPreview}
          leftPanel={
            loadingCategories ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-8 w-64" />
                      <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-lg font-medium mb-2">No categories yet</p>
                  <p className="text-muted-foreground mb-4">
                    Create your first category to start building your menu
                  </p>
                  <Button onClick={handleCreateCategory} data-testid="button-create-first-category">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Category
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <DragDropContext onDragEnd={handleCategoryDragEnd}>
                <Droppable droppableId="categories">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {filteredCategories.map((category, index) => (
                        <Draggable
                          key={category.id}
                          draggableId={`category-${category.id}`}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <CategorySection
                                category={category}
                                selectedDishIds={selectedDishIds}
                                onToggleSelectDish={toggleSelectDish}
                                onEditCategory={() => handleEditCategory(category)}
                                onDeleteCategory={() => setDeletingCategoryId(category.id)}
                                onToggleCategoryActive={() => handleToggleCategoryActive(category)}
                                onAddDish={() => handleAddDish(category.id)}
                                onEditDish={(dishId) => {
                                  const dish = category.dishes.find(d => d.id === dishId)
                                  if (dish) handleEditDish(dish)
                                }}
                                onDeleteDish={setDeletingDishId}
                                onEditDishPrice={(dishId) => {
                                  const dish = category.dishes.find(d => d.id === dishId)
                                  if (dish) handleEditDishPrice(dish)
                                }}
                                onToggleDishActive={(dishId) => {
                                  const dish = category.dishes.find(d => d.id === dishId)
                                  if (dish) handleToggleDishActive(dish)
                                }}
                                onToggleDishFeatured={(dishId) => {
                                  const dish = category.dishes.find(d => d.id === dishId)
                                  if (dish) handleToggleDishFeatured(dish)
                                }}
                                onViewDishModifiers={handleViewDishModifiers}
                                onBreakDishInheritance={handleBreakDishInheritance}
                                onAddTemplate={() => handleAddTemplate(category.id)}
                                onEditTemplate={(templateId) => handleEditTemplate(category.id, templateId)}
                                onDishReorder={(dishIds) => handleDishReorder(category.id, dishIds)}
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
            )
          }
          rightPanel={
            // ISSUE 6 FIX: Only render preview with valid restaurant
            selectedRestaurant && parseInt(selectedRestaurantId) > 0 ? (
              <LiveMenuPreview
                restaurant={selectedRestaurant}
                categories={categories}
                visible={showPreview}
                onToggleVisible={() => setShowPreview(!showPreview)}
              />
            ) : null
          }
        />
      )}

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent data-testid="dialog-category">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit' : 'Create'} Category</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update category details' : 'Add a new menu category'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                placeholder="e.g., Appetizers, Main Courses..."
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                data-testid="input-category-name"
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Brief description of this category..."
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                data-testid="textarea-category-description"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={categoryForm.is_active}
                onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, is_active: checked })}
                data-testid="switch-category-active"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCategoryDialogOpen(false)}
              data-testid="button-cancel-category"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={!categoryForm.name || createCourse.isPending || updateCourse.isPending}
              data-testid="button-save-category"
            >
              {(createCourse.isPending || updateCourse.isPending) ? 'Saving...' : 'Save Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={!!deletingCategoryId} onOpenChange={(open) => !open && setDeletingCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the category and all dishes in it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-category">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete-category"
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dish Dialog */}
      <Dialog open={dishDialogOpen} onOpenChange={setDishDialogOpen}>
        <DialogContent data-testid="dialog-dish">
          <DialogHeader>
            <DialogTitle>{editingDish ? 'Edit' : 'Create'} Dish</DialogTitle>
            <DialogDescription>
              {editingDish ? 'Update dish details' : 'Add a new dish to the menu'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                placeholder="Dish name..."
                value={dishForm.name}
                onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                data-testid="input-dish-name"
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Brief description..."
                value={dishForm.description}
                onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                data-testid="textarea-dish-description"
              />
            </div>
            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={dishForm.price}
                onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                data-testid="input-dish-price"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={dishForm.is_active}
                onCheckedChange={(checked) => setDishForm({ ...dishForm, is_active: checked })}
                data-testid="switch-dish-active"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Featured</Label>
              <Switch
                checked={dishForm.is_featured}
                onCheckedChange={(checked) => setDishForm({ ...dishForm, is_featured: checked })}
                data-testid="switch-dish-featured"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDishDialogOpen(false)}
              data-testid="button-cancel-dish"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDish}
              disabled={!dishForm.name || !dishForm.price || createDish.isPending || updateDish.isPending}
              data-testid="button-save-dish"
            >
              {(createDish.isPending || updateDish.isPending) ? 'Saving...' : 'Save Dish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dish Dialog */}
      <AlertDialog open={!!deletingDishId} onOpenChange={(open) => !open && setDeletingDishId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dish?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this dish. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-dish">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDish}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete-dish"
            >
              Delete Dish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Price Editor Dialog */}
      {editingPriceDish && (
        <InlinePriceEditor
          dish={editingPriceDish}
          restaurantId={parseInt(selectedRestaurantId)}
          open={priceEditorOpen}
          onOpenChange={(open) => {
            setPriceEditorOpen(open)
            if (!open) setEditingPriceDish(null)
          }}
        />
      )}

      {/* Template Editor Dialog */}
      {templateCourseId && (
        <ModifierGroupEditor
          courseId={templateCourseId}
          template={editingTemplate}
          open={templateDialogOpen}
          onOpenChange={(open) => {
            setTemplateDialogOpen(open)
            if (!open) {
              setTemplateCourseId(null)
              setEditingTemplate(null)
            }
          }}
        />
      )}
    </div>
  )
}
