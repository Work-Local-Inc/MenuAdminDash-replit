"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  UtensilsCrossed,
  Eye,
  EyeOff,
  Star,
  Search,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import {
  useMenuCourses,
  useMenuDishes,
  useCreateDish,
  useUpdateDish,
  useDeleteDish,
  useToggleDishAvailability,
  MenuDish,
} from "@/lib/hooks/use-menu"
import { PackageX } from "lucide-react"

export default function MenuDishesPage() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<MenuDish | null>(null)
  const [deletingDishId, setDeletingDishId] = useState<number | null>(null)

  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants()
  const { data: courses = [] } = useMenuCourses(
    selectedRestaurantId ? parseInt(selectedRestaurantId) : 0
  )
  const { data: dishes = [], isLoading: loadingDishes } = useMenuDishes({
    restaurant_id: selectedRestaurantId ? parseInt(selectedRestaurantId) : 0,
  })

  const createDish = useCreateDish()
  const updateDish = useUpdateDish()
  const deleteDish = useDeleteDish()
  const toggleAvailability = useToggleDishAvailability()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    course_id: '',
    image_url: '',
    is_active: true,
    is_featured: false,
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      course_id: '',
      image_url: '',
      is_active: true,
      is_featured: false,
    })
  }

  const handleCreate = () => {
    setEditingDish(null)
    resetForm()
    setCreateDialogOpen(true)
  }

  const handleEdit = (dish: MenuDish) => {
    setEditingDish(dish)
    setFormData({
      name: dish.name,
      description: dish.description || '',
      price: dish.price.toString(),
      course_id: dish.course_id?.toString() || '',
      image_url: dish.image_url || '',
      is_active: dish.is_active,
      is_featured: dish.is_featured,
    })
    setCreateDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRestaurantId) return

    const dishData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      course_id: formData.course_id ? parseInt(formData.course_id) : null,
      image_url: formData.image_url || null,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
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

    setCreateDialogOpen(false)
    resetForm()
    setEditingDish(null)
  }

  const handleDelete = async () => {
    if (deletingDishId && selectedRestaurantId) {
      await deleteDish.mutateAsync({
        id: deletingDishId,
        restaurant_id: parseInt(selectedRestaurantId),
      })
      setDeletingDishId(null)
    }
  }

  const handleToggleActive = async (dish: MenuDish) => {
    if (!selectedRestaurantId) return
    
    await updateDish.mutateAsync({
      id: dish.id,
      restaurant_id: parseInt(selectedRestaurantId),
      data: { is_active: !dish.is_active },
    })
  }

  const handleToggleFeatured = async (dish: MenuDish) => {
    if (!selectedRestaurantId) return
    
    await updateDish.mutateAsync({
      id: dish.id,
      restaurant_id: parseInt(selectedRestaurantId),
      data: { is_featured: !dish.is_featured },
    })
  }

  const handleToggleAvailability = async (dish: MenuDish) => {
    const currentlyAvailable = (dish as any).is_available !== false
    await toggleAvailability.mutateAsync({
      dishId: dish.id,
      isAvailable: !currentlyAvailable,
    })
  }

  // Filter dishes
  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!dish.name.toLowerCase().includes(query) &&
            !(dish.description?.toLowerCase().includes(query))) {
          return false
        }
      }

      // Course filter
      if (selectedCourseFilter !== 'all') {
        if (selectedCourseFilter === 'uncategorized') {
          if (dish.course_id !== null) return false
        } else {
          if (dish.course_id !== parseInt(selectedCourseFilter)) return false
        }
      }

      // Active filter
      if (activeFilter !== 'all') {
        if (activeFilter === 'active' && !dish.is_active) return false
        if (activeFilter === 'inactive' && dish.is_active) return false
      }

      return true
    })
  }, [dishes, searchQuery, selectedCourseFilter, activeFilter])

  // Group dishes by course
  const dishesByCourse = useMemo(() => {
    const grouped = new Map<string, MenuDish[]>()
    
    filteredDishes.forEach((dish) => {
      const courseKey = dish.course_id ? dish.course_id.toString() : 'uncategorized'
      if (!grouped.has(courseKey)) {
        grouped.set(courseKey, [])
      }
      grouped.get(courseKey)!.push(dish)
    })

    return grouped
  }, [filteredDishes])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Menu Dishes
        </h1>
        <p className="text-muted-foreground">
          Manage dishes and menu items for your restaurants
        </p>
      </div>

      {/* Restaurant Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Restaurant</CardTitle>
          <CardDescription>Choose a restaurant to manage its menu dishes</CardDescription>
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

      {/* Dishes List */}
      {selectedRestaurantId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle>Dishes</CardTitle>
                <CardDescription>
                  {filteredDishes.length} {filteredDishes.length === 1 ? 'dish' : 'dishes'}
                </CardDescription>
              </div>
              <Button onClick={handleCreate} data-testid="button-create-dish">
                <Plus className="h-4 w-4 mr-2" />
                Add Dish
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-course-filter">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger className="w-full sm:w-36" data-testid="select-active-filter">
                  <SelectValue placeholder="All dishes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All dishes</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="inactive">Inactive only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingDishes ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-20 w-20 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}
              </div>
            ) : filteredDishes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  {dishes.length === 0 ? 'No dishes yet' : 'No dishes match your filters'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {dishes.length === 0
                    ? 'Create your first dish to get started'
                    : 'Try adjusting your search or filters'}
                </p>
                {dishes.length === 0 && (
                  <Button onClick={handleCreate} variant="outline" data-testid="button-create-first">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Dish
                  </Button>
                )}
              </div>
            ) : (
              <Tabs defaultValue="grid" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="grid">Grid View</TabsTrigger>
                  <TabsTrigger value="list">List View</TabsTrigger>
                  <TabsTrigger value="by-category">By Category</TabsTrigger>
                </TabsList>

                {/* Grid View */}
                <TabsContent value="grid" className="space-y-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDishes.map((dish) => (
                      <Card key={dish.id} className="overflow-hidden" data-testid={`dish-card-${dish.id}`}>
                        {dish.image_url && (
                          <div className="aspect-video bg-muted">
                            <img
                              src={dish.image_url}
                              alt={dish.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium line-clamp-1" data-testid={`text-dish-name-${dish.id}`}>
                              {dish.name}
                            </h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-menu-${dish.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleToggleAvailability(dish)}>
                                  <PackageX className="h-4 w-4 mr-2" />
                                  {(dish as any).is_available === false ? 'Mark In Stock' : 'Mark Sold Out'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleActive(dish)}>
                                  {dish.is_active ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                  {dish.is_active ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleFeatured(dish)}>
                                  <Star className={`h-4 w-4 mr-2 ${dish.is_featured ? 'fill-current' : ''}`} />
                                  {dish.is_featured ? 'Unfeature' : 'Feature'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(dish)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingDishId(dish.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {dish.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {dish.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold" data-testid={`text-dish-price-${dish.id}`}>
                              {formatPrice(dish.price)}
                            </span>
                            <div className="flex gap-1">
                              {(dish as any).is_available === false && (
                                <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                              )}
                              {!dish.is_active && (
                                <Badge variant="secondary" className="text-xs">Inactive</Badge>
                              )}
                              {dish.is_featured && (
                                <Badge variant="default" className="text-xs">Featured</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* List View */}
                <TabsContent value="list" className="space-y-2">
                  {filteredDishes.map((dish) => (
                    <div
                      key={dish.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover-elevate"
                      data-testid={`dish-item-${dish.id}`}
                    >
                      {dish.image_url ? (
                        <img
                          src={dish.image_url}
                          alt={dish.name}
                          className="h-16 w-16 object-cover rounded"
                        />
                      ) : (
                        <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                          <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{dish.name}</h4>
                          {(dish as any).is_available === false && <Badge variant="destructive" className="text-xs">Sold Out</Badge>}
                          {!dish.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                          {dish.is_featured && <Badge variant="default" className="text-xs">Featured</Badge>}
                        </div>
                        {dish.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{dish.description}</p>
                        )}
                        <div className="text-sm text-muted-foreground mt-1">
                          {courses.find(c => c.id === dish.course_id)?.name || 'Uncategorized'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold">{formatPrice(dish.price)}</div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleAvailability(dish)}>
                            <PackageX className="h-4 w-4 mr-2" />
                            {(dish as any).is_available === false ? 'Mark In Stock' : 'Mark Sold Out'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleActive(dish)}>
                            {dish.is_active ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                            {dish.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleFeatured(dish)}>
                            <Star className={`h-4 w-4 mr-2 ${dish.is_featured ? 'fill-current' : ''}`} />
                            {dish.is_featured ? 'Unfeature' : 'Feature'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(dish)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingDishId(dish.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </TabsContent>

                {/* By Category View */}
                <TabsContent value="by-category" className="space-y-6">
                  {/* Uncategorized dishes */}
                  {dishesByCourse.has('uncategorized') && (
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Uncategorized</h3>
                      <div className="space-y-2">
                        {dishesByCourse.get('uncategorized')!.map((dish) => (
                          <div
                            key={dish.id}
                            className="flex items-center gap-4 p-3 border rounded-lg hover-elevate"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{dish.name}</span>
                                {(dish as any).is_available === false && <Badge variant="destructive" className="text-xs">Sold Out</Badge>}
                                {!dish.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                                {dish.is_featured && <Badge variant="default" className="text-xs">Featured</Badge>}
                              </div>
                              {dish.description && (
                                <p className="text-sm text-muted-foreground mt-1">{dish.description}</p>
                              )}
                            </div>
                            <span className="font-bold">{formatPrice(dish.price)}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(dish)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeletingDishId(dish.id)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categorized dishes */}
                  {courses.map((course) => {
                    const courseDishes = dishesByCourse.get(course.id.toString())
                    if (!courseDishes || courseDishes.length === 0) return null

                    return (
                      <div key={course.id}>
                        <h3 className="font-semibold text-lg mb-3">{course.name}</h3>
                        <div className="space-y-2">
                          {courseDishes.map((dish) => (
                            <div
                              key={dish.id}
                              className="flex items-center gap-4 p-3 border rounded-lg hover-elevate"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{dish.name}</span>
                                  {(dish as any).is_available === false && <Badge variant="destructive" className="text-xs">Sold Out</Badge>}
                                  {!dish.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                                  {dish.is_featured && <Badge variant="default" className="text-xs">Featured</Badge>}
                                </div>
                                {dish.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{dish.description}</p>
                                )}
                              </div>
                              <span className="font-bold">{formatPrice(dish.price)}</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(dish)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDeletingDishId(dish.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-dish-form">
          <DialogHeader>
            <DialogTitle>
              {editingDish ? 'Edit Dish' : 'Create Dish'}
            </DialogTitle>
            <DialogDescription>
              {editingDish ? 'Update dish details' : 'Add a new dish to your menu'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Margherita Pizza"
                  required
                  data-testid="input-dish-name"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the dish, ingredients, etc."
                  rows={3}
                  data-testid="input-dish-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (CAD) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="12.99"
                  required
                  data-testid="input-dish-price"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course_id">Category</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                >
                  <SelectTrigger id="course_id" data-testid="select-dish-course">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Uncategorized</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  data-testid="input-dish-image"
                />
                <p className="text-xs text-muted-foreground">
                  Paste a URL to an image of this dish
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Show on menu
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  data-testid="switch-dish-active"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_featured">Featured</Label>
                  <p className="text-sm text-muted-foreground">
                    Highlight this dish
                  </p>
                </div>
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  data-testid="switch-dish-featured"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false)
                  resetForm()
                  setEditingDish(null)
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createDish.isPending || updateDish.isPending}
                data-testid="button-submit"
              >
                {editingDish ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingDishId} onOpenChange={() => setDeletingDishId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dish?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this dish. This action cannot be undone.
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
