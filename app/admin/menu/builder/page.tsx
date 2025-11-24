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
import { Plus, Search, X, Eye, EyeOff, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { ImageUpload } from '@/components/ui/image-upload'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useRestaurants } from '@/lib/hooks/use-restaurants'
import {
  useMenuBuilder,
  useRestaurantModifierGroups,
  MenuBuilderCategory,
  MenuBuilderDish,
  CategoryModifierTemplate,
  useBreakInheritance,
  useReorderMenuItems,
  useCreateCategoryTemplate,
  useUpdateCategoryTemplate,
  useDeleteCategoryTemplate,
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
import { ModifierGroupEditor } from '@/components/admin/menu-builder/ModifierGroupEditor'
import { ModifierTemplateSection } from '@/components/admin/menu-builder/ModifierTemplateSection'
import { InlinePriceEditor } from '@/components/admin/menu-builder/InlinePriceEditor'
import { DishModifierPanel } from '@/components/admin/menu-builder/DishModifierPanel'
import { SizeVariantManager } from '@/components/admin/menu-builder/SizeVariantManager'
import RestaurantMenu from '@/components/customer/restaurant-menu'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useEffect } from 'react'

export default function MenuBuilderPage() {
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  
  // Initialize from URL search params if available
  const initialRestaurantId = searchParams.get('restaurant') || ''
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(initialRestaurantId)
  
  // Update state when URL changes
  useEffect(() => {
    const urlRestaurantId = searchParams.get('restaurant') || ''
    if (urlRestaurantId !== selectedRestaurantId) {
      setSelectedRestaurantId(urlRestaurantId)
    }
  }, [searchParams])
  
  // Handler to update both state and URL
  const handleRestaurantChange = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId)
    if (restaurantId) {
      router.push(`/admin/menu/builder?restaurant=${restaurantId}`)
    } else {
      router.push('/admin/menu/builder')
    }
  }
  
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDishIds, setSelectedDishIds] = useState<Set<number>>(new Set())

  // Dialogs
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuBuilderCategory | null>(null)
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null)

  const [dishDialogOpen, setDishDialogOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<MenuBuilderDish | null>(null)
  const [dishCategoryId, setDishCategoryId] = useState<number | null>(null)
  const [deletingDishId, setDeletingDishId] = useState<number | null>(null)
  const [dishImageFile, setDishImageFile] = useState<File | null>(null)
  const [imageWasRemoved, setImageWasRemoved] = useState(false)

  const [priceEditorOpen, setPriceEditorOpen] = useState(false)
  const [editingPriceDish, setEditingPriceDish] = useState<MenuBuilderDish | null>(null)

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateCourseId, setTemplateCourseId] = useState<number | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<CategoryModifierTemplate | null>(null)

  const [dishModifiersDialogOpen, setDishModifiersDialogOpen] = useState(false)
  const [editingDishModifiers, setEditingDishModifiers] = useState<MenuBuilderDish | null>(null)

  // Track which categories have modifier section expanded
  const [expandedCategoryModifiers, setExpandedCategoryModifiers] = useState<Set<number>>(new Set())

  // Hooks
  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants()
  
  // ISSUE 1 FIX: Only call useMenuBuilder when valid restaurant selected
  const { data: categories = [], isLoading: loadingCategories } = useMenuBuilder(
    selectedRestaurantId && parseInt(selectedRestaurantId) > 0 ? parseInt(selectedRestaurantId) : null
  )
  
  // Fetch global modifier groups library
  const { data: modifierGroups = [] } = useRestaurantModifierGroups()

  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const deleteCourse = useDeleteCourse()
  const reorderCourses = useReorderCourses()

  const createDish = useCreateDish()
  const updateDish = useUpdateDish()
  const deleteDish = useDeleteDish()

  const breakInheritance = useBreakInheritance()

  // Template CRUD hooks
  const createTemplate = useCreateCategoryTemplate()
  const updateTemplate = useUpdateCategoryTemplate()
  const deleteTemplate = useDeleteCategoryTemplate()

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
  })

  // Find restaurant data for preview
  const selectedRestaurant = restaurants.find(
    (r: any) => r.id.toString() === selectedRestaurantId
  )
  
  // Process category associations with global library groups
  // modifierGroups = global library groups (course_id IS NULL)
  // Build map of category -> associated library group IDs from category templates
  const availableModifierGroups = modifierGroups
  const categoryModifierMap = new Map<number, number[]>()
  
  categories.forEach((category) => {
    const associatedLibraryGroupIds = category.templates
      .filter((template: any) => template.library_template_id !== null)
      .map((template: any) => template.library_template_id)
    
    if (associatedLibraryGroupIds.length > 0) {
      categoryModifierMap.set(category.id, associatedLibraryGroupIds)
    }
  })

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
  
  const handleToggleCategoryModifier = async (categoryId: number, modifierGroupId: number, isAssociated: boolean) => {
    if (!selectedRestaurantId) return
    
    try {
      if (isAssociated) {
        // Remove association by finding and deleting the category template
        const category = categories.find(c => c.id === categoryId)
        const categoryTemplate = category?.templates.find(
          (template: any) => template.library_template_id === modifierGroupId
        )
        
        if (categoryTemplate) {
          await deleteTemplate.mutateAsync(categoryTemplate.id)
        }
      } else {
        // Create association by linking to library group
        const response = await fetch('/api/menu/category-modifier-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: categoryId,
            library_template_id: modifierGroupId,
          }),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to associate modifier group')
        }
        
        // Invalidate queries to refetch updated data
        const queryClient = (await import('@/lib/queryClient')).queryClient
        queryClient.invalidateQueries({ queryKey: ['/api/menu/builder'] })
        queryClient.invalidateQueries({ queryKey: ['/api/menu/modifier-groups'] })
      }
    } catch (error: any) {
      console.error('[TOGGLE CATEGORY MODIFIER ERROR]', error)
      alert(error.message || 'Failed to update category modifier association')
    }
  }

  // Dish handlers
  const handleAddDish = (categoryId: number) => {
    setDishCategoryId(categoryId)
    setEditingDish(null)
    setDishImageFile(null)
    setImageWasRemoved(false)
    setDishForm({
      name: '',
      description: '',
      price: '',
      is_active: true,
    })
    setDishDialogOpen(true)
  }

  const handleEditDish = (dish: MenuBuilderDish) => {
    setDishCategoryId(dish.course_id)
    setEditingDish(dish)
    setDishImageFile(null)
    setImageWasRemoved(false)
    
    // Get price from dish_prices array or fallback to computed price field
    const priceValue = dish.price ?? dish.dish_prices?.[0]?.price ?? 0
    
    setDishForm({
      name: dish.name,
      description: dish.description || '',
      price: priceValue.toString(),
      is_active: dish.is_active,
    })
    setDishDialogOpen(true)
  }

  const handleSaveDish = async () => {
    if (!selectedRestaurantId) return

    try {
      let imageUrl: string | null = null

      // Upload image if a new file was selected
      if (dishImageFile) {
        const formData = new FormData()
        formData.append('file', dishImageFile)
        formData.append('bucket', 'dish-images')
        const dishId = editingDish?.id || Date.now()
        formData.append('path', `${selectedRestaurantId}/${dishId}_${Date.now()}_${dishImageFile.name}`)

        const uploadRes = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({ error: 'Failed to upload image' }))
          throw new Error(errorData.error || 'Failed to upload image')
        }

        const uploadData = await uploadRes.json()
        imageUrl = uploadData.url
      }

      const dishData: any = {
        name: dishForm.name,
        description: dishForm.description || null,
        price: parseFloat(dishForm.price),
        course_id: dishCategoryId,
        is_active: dishForm.is_active,
      }

      // ISSUE 1 FIX: Handle image upload/removal
      if (imageUrl) {
        // New image was uploaded
        dishData.image_url = imageUrl
      } else if (imageWasRemoved) {
        // User explicitly removed the existing image
        dishData.image_url = null
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

      // Only close dialog and reset state on SUCCESS
      setDishDialogOpen(false)
      setDishImageFile(null)
      setImageWasRemoved(false)
    } catch (error) {
      // ISSUE 2 FIX: Show error toast and keep dialog open
      console.error('Error saving dish:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save dish. Please try again.',
        variant: 'destructive',
      })
      // DO NOT close dialog on error
    }
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


  const handleEditDishPrice = (dish: MenuBuilderDish) => {
    setEditingPriceDish(dish)
    setPriceEditorOpen(true)
  }

  const handleViewDishModifiers = (dishId: number) => {
    const dish = categories.flatMap(c => c.dishes).find(d => d.id === dishId)
    if (dish) {
      setEditingDishModifiers(dish)
      setDishModifiersDialogOpen(true)
    }
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

  const handleEditTemplate = (template: CategoryModifierTemplate) => {
    setTemplateCourseId(template.course_id)
    setEditingTemplate(template)
    setTemplateDialogOpen(true)
  }

  // Toggle category modifier section expansion
  const toggleCategoryModifiers = (categoryId: number) => {
    const newExpanded = new Set(expandedCategoryModifiers)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategoryModifiers(newExpanded)
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

  // ISSUE 3 FIX: Bulk operation handlers
  const handleBulkMarkActive = async () => {
    if (!selectedRestaurantId) return
    const promises = Array.from(selectedDishIds).map(dishId =>
      updateDish.mutateAsync({
        id: dishId,
        restaurant_id: parseInt(selectedRestaurantId),
        data: { is_active: true },
      })
    )
    await Promise.all(promises)
    toast({
      title: 'Success',
      description: `${selectedDishIds.size} dishes marked as active`,
    })
    clearSelection()
  }

  const handleBulkMarkInactive = async () => {
    if (!selectedRestaurantId) return
    const promises = Array.from(selectedDishIds).map(dishId =>
      updateDish.mutateAsync({
        id: dishId,
        restaurant_id: parseInt(selectedRestaurantId),
        data: { is_active: false },
      })
    )
    await Promise.all(promises)
    toast({
      title: 'Success',
      description: `${selectedDishIds.size} dishes marked as inactive`,
    })
    clearSelection()
  }


  const handleBulkDelete = async () => {
    if (!selectedRestaurantId) return
    const promises = Array.from(selectedDishIds).map(dishId =>
      deleteDish.mutateAsync({
        id: dishId,
        restaurant_id: parseInt(selectedRestaurantId),
      })
    )
    await Promise.all(promises)
    toast({
      title: 'Success',
      description: `${selectedDishIds.size} dishes deleted`,
    })
    clearSelection()
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Menu Builder
        </h1>
        <p className="text-muted-foreground">
          Manage your complete menu in one place - categories, dishes, and modifier groups
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
            <Select value={selectedRestaurantId} onValueChange={handleRestaurantChange}>
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
          </CardContent>
        </Card>
      )}

      {/* Bulk Selection Toolbar */}
      {selectedRestaurantId && selectedDishIds.size > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary shadow-lg">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-semibold text-sm" data-testid="text-selected-count">
                  {selectedDishIds.size} {selectedDishIds.size === 1 ? 'dish' : 'dishes'}
                </div>
                <span className="text-sm text-muted-foreground">selected</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                  data-testid="button-clear-selection"
                  className="ml-2"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleBulkMarkActive}
                    data-testid="button-bulk-mark-active"
                    className="bg-emerald-600 text-white"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Active
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkMarkInactive}
                    data-testid="button-bulk-mark-inactive"
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Inactive
                  </Button>
                </div>
                
                <div className="h-6 w-px bg-border mx-1" />
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Only show menu when restaurant selected */}
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

      {/* Unified Menu Builder View */}
      {selectedRestaurantId && parseInt(selectedRestaurantId) > 0 && (
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
        ) : selectedRestaurant ? (
          <RestaurantMenu
            restaurant={selectedRestaurant}
            courses={filteredCategories.map(category => ({
              id: category.id,
              name: category.name,
              description: category.description,
              is_active: category.is_active,
              display_order: category.display_order,
              dishes: category.dishes.map(dish => ({
                id: dish.id,
                name: dish.name,
                description: dish.description,
                price: dish.price,
                image_url: dish.image_url,
                is_active: dish.is_active,
                course_id: dish.course_id,
                display_order: dish.display_order,
                modifier_groups: dish.modifier_groups,
              })),
            }))}
            hasMenu={filteredCategories.length > 0}
            editorMode={true}
            availableModifierGroups={availableModifierGroups}
            getCategoryModifierIds={(categoryId) => categoryModifierMap.get(categoryId) || []}
            onToggleCategoryModifier={handleToggleCategoryModifier}
            onEditCategory={(categoryId) => {
              const category = categories.find(c => c.id === categoryId)
              if (category) handleEditCategory(category)
            }}
            onDeleteCategory={(categoryId) => setDeletingCategoryId(categoryId)}
            onToggleCategoryActive={(categoryId) => {
              const category = categories.find(c => c.id === categoryId)
              if (category) handleToggleCategoryActive(category)
            }}
            onAddDish={handleAddDish}
            onEditDish={(dishId) => {
              const dish = categories.flatMap(c => c.dishes).find(d => d.id === dishId)
              if (dish) handleEditDish(dish)
            }}
            onDeleteDish={setDeletingDishId}
            onToggleDishActive={(dishId) => {
              const dish = categories.flatMap(c => c.dishes).find(d => d.id === dishId)
              if (dish) handleToggleDishActive(dish)
            }}
            onViewDishModifiers={handleViewDishModifiers}
            onEditDishPrice={(dishId) => {
              const dish = categories.flatMap(c => c.dishes).find(d => d.id === dishId)
              if (dish) handleEditDishPrice(dish)
            }}
            onBreakDishInheritance={handleBreakDishInheritance}
            onReorderCategories={(categoryIds) => {
              reorderCourses.mutateAsync({
                restaurant_id: parseInt(selectedRestaurantId),
                course_ids: categoryIds,
              })
            }}
            onReorderDishes={(categoryId, dishIds) => handleDishReorder(categoryId, dishIds)}
            selectedDishIds={selectedDishIds}
            onToggleSelectDish={toggleSelectDish}
          />
        ) : null
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
      <Dialog 
        open={dishDialogOpen} 
        onOpenChange={(open) => {
          setDishDialogOpen(open)
          if (!open) {
            setDishImageFile(null)
            setImageWasRemoved(false)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-dish">
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
              <Label>Image (Optional)</Label>
              <ImageUpload
                value={editingDish?.image_url}
                onChange={setDishImageFile}
                onRemove={() => setImageWasRemoved(true)}
                data-testid="image-upload-dish"
              />
            </div>
            <div>
              <Label>Base Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={dishForm.price}
                onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                data-testid="input-dish-price"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is the default price. Add size variants below for multiple price options.
              </p>
            </div>

            {/* Size/Price Variants - Only show when editing existing dish */}
            {editingDish && (
              <div className="pt-4 border-t">
                <SizeVariantManager dishId={editingDish.id} />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={dishForm.is_active}
                onCheckedChange={(checked) => setDishForm({ ...dishForm, is_active: checked })}
                data-testid="switch-dish-active"
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

      {/* Dish Modifiers Management Dialog */}
      <Dialog 
        open={dishModifiersDialogOpen} 
        onOpenChange={(open) => {
          setDishModifiersDialogOpen(open)
          if (!open) setEditingDishModifiers(null)
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-dish-modifiers">
          <DialogHeader>
            <DialogTitle>
              Manage Modifiers
            </DialogTitle>
            <DialogDescription>
              Configure modifier groups for this dish (category templates + custom groups)
            </DialogDescription>
          </DialogHeader>

          {editingDishModifiers && selectedRestaurantId && (
            <DishModifierPanel
              dish={editingDishModifiers}
              restaurantId={parseInt(selectedRestaurantId)}
              onClose={() => setDishModifiersDialogOpen(false)}
            />
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDishModifiersDialogOpen(false)}
              data-testid="button-close-modifiers"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
