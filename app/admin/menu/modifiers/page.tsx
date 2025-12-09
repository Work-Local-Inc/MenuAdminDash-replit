"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { 
  Pizza, 
  Utensils, 
  Package, 
  Search, 
  ChevronDown,
  ChevronRight,
  Settings,
  Layers,
  CircleDot,
  Circle,
  Edit,
  Plus,
  GripVertical,
  Info
} from "lucide-react"
import { useRestaurants } from "@/lib/hooks/use-restaurants"

interface DishListItem {
  id: number
  name: string
  category: string
  category_id: number | null
  dish_type: 'simple' | 'pizza' | 'combo'
  has_modifiers: boolean
  modifier_count: number
}

interface UnifiedModifier {
  id: number
  name: string
  price: number
  display_order: number
  is_default: boolean
  is_included: boolean
  placements?: string[]
  size_prices?: Array<{ size_variant: string; price: number }>
}

interface UnifiedModifierGroup {
  id: number
  name: string
  display_order: number
  is_required: boolean
  min_selections: number
  max_selections: number
  section_type?: string
  section_header?: string
  source: 'simple' | 'combo' | 'category'
  modifiers: UnifiedModifier[]
}

interface UnifiedDishModifiers {
  dish_id: number
  dish_name: string
  dish_type: 'simple' | 'pizza' | 'combo'
  has_placements: boolean
  has_size_pricing: boolean
  modifier_groups: UnifiedModifierGroup[]
}

const DishTypeIcon = ({ type }: { type: 'simple' | 'pizza' | 'combo' }) => {
  switch (type) {
    case 'pizza':
      return <Pizza className="h-4 w-4 text-orange-500" />
    case 'combo':
      return <Package className="h-4 w-4 text-purple-500" />
    default:
      return <Utensils className="h-4 w-4 text-blue-500" />
  }
}

const SourceBadge = ({ source }: { source: 'simple' | 'combo' | 'category' }) => {
  const config = {
    category: { label: 'From Category', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    combo: { label: 'Combo System', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
    simple: { label: 'Item-Specific', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' }
  }
  const { label, className } = config[source]
  return <Badge variant="outline" className={className}>{label}</Badge>
}

const PlacementIcon = ({ placement }: { placement: string }) => {
  switch (placement) {
    case 'whole':
      return <CircleDot className="h-3 w-3" />
    case 'left':
      return <Circle className="h-3 w-3" style={{ clipPath: 'inset(0 50% 0 0)' }} />
    case 'right':
      return <Circle className="h-3 w-3" style={{ clipPath: 'inset(0 0 0 50%)' }} />
    default:
      return null
  }
}

export default function UnifiedModifierManagerPage() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('')
  const [selectedDishId, setSelectedDishId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())

  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants()

  const { data: dishes = [], isLoading: loadingDishes } = useQuery<DishListItem[]>({
    queryKey: ['unified-modifiers-dishes', selectedRestaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/menu/unified-modifiers/dishes?restaurant_id=${selectedRestaurantId}`)
      if (!res.ok) throw new Error('Failed to fetch dishes')
      return res.json()
    },
    enabled: !!selectedRestaurantId,
  })

  const { data: modifiersData, isLoading: loadingModifiers } = useQuery<UnifiedDishModifiers>({
    queryKey: ['unified-modifiers', selectedDishId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/menu/unified-modifiers?dish_id=${selectedDishId}`)
      if (!res.ok) throw new Error('Failed to fetch modifiers')
      return res.json()
    },
    enabled: !!selectedDishId,
  })

  const categories = Array.from(new Set(dishes.map(d => d.category))).sort()

  const filteredDishes = dishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || dish.category === categoryFilter
    const matchesType = typeFilter === 'all' || dish.dish_type === typeFilter
    return matchesSearch && matchesCategory && matchesType
  })

  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const expandAllGroups = () => {
    if (modifiersData) {
      setExpandedGroups(new Set(modifiersData.modifier_groups.map(g => g.id)))
    }
  }

  useEffect(() => {
    if (modifiersData) {
      expandAllGroups()
    }
  }, [modifiersData?.dish_id])

  const getSelectionLabel = (group: UnifiedModifierGroup) => {
    if (group.is_required) {
      if (group.min_selections === group.max_selections) {
        return `Pick ${group.min_selections}`
      }
      return `Pick ${group.min_selections}-${group.max_selections}`
    }
    return group.max_selections > 0 ? `Up to ${group.max_selections}` : 'Optional'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Modifier Manager
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Manage all dish modifiers in one place
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="restaurant-select" className="min-w-fit">
              Select Restaurant
            </Label>
            <Select
              value={selectedRestaurantId}
              onValueChange={(value) => {
                setSelectedRestaurantId(value)
                setSelectedDishId(null)
              }}
            >
              <SelectTrigger
                id="restaurant-select"
                className="w-full max-w-md"
                data-testid="select-restaurant"
              >
                <SelectValue placeholder="Choose a restaurant..." />
              </SelectTrigger>
              <SelectContent>
                {loadingRestaurants ? (
                  <SelectItem value="_loading" disabled>
                    Loading restaurants...
                  </SelectItem>
                ) : restaurants.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    No restaurants available
                  </SelectItem>
                ) : (
                  restaurants.map((restaurant: any) => (
                    <SelectItem
                      key={restaurant.id}
                      value={restaurant.id.toString()}
                      data-testid={`option-restaurant-${restaurant.id}`}
                    >
                      {restaurant.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedRestaurantId ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Info className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Select a Restaurant</h3>
            <p className="text-muted-foreground">
              Choose a restaurant above to manage its dish modifiers
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Dishes</CardTitle>
              <CardDescription>Select a dish to manage its modifiers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search dishes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-dishes"
                />
              </div>

              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="flex-1" data-testid="select-category-filter">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-28" data-testid="select-type-filter">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="pizza">Pizza</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="h-[500px] overflow-y-auto">
                {loadingDishes ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredDishes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No dishes found
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    {filteredDishes.map(dish => (
                      <div
                        key={dish.id}
                        onClick={() => setSelectedDishId(dish.id)}
                        className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                          selectedDishId === dish.id
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted border-transparent'
                        }`}
                        data-testid={`dish-item-${dish.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <DishTypeIcon type={dish.dish_type} />
                              <span className="font-medium truncate">{dish.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {dish.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {dish.has_modifiers && (
                              <Badge variant="secondary" className="text-xs">
                                {dish.modifier_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {modifiersData ? (
                      <>
                        <DishTypeIcon type={modifiersData.dish_type} />
                        {modifiersData.dish_name}
                      </>
                    ) : (
                      'Modifier Groups'
                    )}
                  </CardTitle>
                  <CardDescription>
                    {modifiersData ? (
                      <span className="flex items-center gap-2 mt-1">
                        {modifiersData.modifier_groups.length} modifier group(s)
                        {modifiersData.has_placements && (
                          <Badge variant="outline" className="text-xs">
                            Supports Placement
                          </Badge>
                        )}
                        {modifiersData.has_size_pricing && (
                          <Badge variant="outline" className="text-xs">
                            Size Pricing
                          </Badge>
                        )}
                      </span>
                    ) : (
                      'Select a dish to view its modifiers'
                    )}
                  </CardDescription>
                </div>
                {modifiersData && modifiersData.modifier_groups.length > 0 && (
                  <Button variant="outline" size="sm" onClick={expandAllGroups}>
                    Expand All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedDishId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Select a dish from the list to manage its modifiers</p>
                </div>
              ) : loadingModifiers ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : !modifiersData || modifiersData.modifier_groups.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Modifiers</h3>
                  <p className="text-muted-foreground mb-4">
                    This dish doesn't have any modifiers yet
                  </p>
                  <Button data-testid="button-add-first-modifier">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Modifier Group
                  </Button>
                </div>
              ) : (
                <div className="h-[500px] overflow-y-auto">
                  <div className="space-y-4 pr-4">
                    {modifiersData.modifier_groups.map(group => (
                      <Collapsible
                        key={group.id}
                        open={expandedGroups.has(group.id)}
                        onOpenChange={() => toggleGroup(group.id)}
                      >
                        <div className="border rounded-lg">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                              <div className="flex items-center gap-3">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                {expandedGroups.has(group.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{group.name}</span>
                                    {group.is_required && (
                                      <Badge variant="destructive" className="text-xs">
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      {getSelectionLabel(group)} • {group.modifiers.length} options
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <SourceBadge source={group.source} />
                                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <Separator />
                            <div className="p-4 space-y-2">
                              {group.modifiers.map(modifier => (
                                <div
                                  key={modifier.id}
                                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{modifier.name}</span>
                                        {modifier.is_default && (
                                          <Badge variant="secondary" className="text-xs">
                                            Default
                                          </Badge>
                                        )}
                                      </div>
                                      {modifier.placements && modifier.placements.length > 0 && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <span className="text-xs text-muted-foreground">Placement:</span>
                                          {modifier.placements.map(p => (
                                            <Badge 
                                              key={p} 
                                              variant="outline" 
                                              className="text-xs px-1 py-0"
                                            >
                                              <PlacementIcon placement={p} />
                                              <span className="ml-1 capitalize">{p}</span>
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                      {modifier.size_prices && modifier.size_prices.length > 0 && (
                                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                                          {modifier.size_prices.map((sp, idx) => (
                                            <Badge 
                                              key={idx} 
                                              variant="outline" 
                                              className="text-xs"
                                            >
                                              {sp.size_variant}: ${sp.price.toFixed(2)}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm ${modifier.is_included ? 'text-green-600' : ''}`}>
                                      {modifier.is_included ? 'Included' : `+$${modifier.price.toFixed(2)}`}
                                    </span>
                                    <Button variant="ghost" size="icon">
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              <Button variant="outline" size="sm" className="w-full mt-2">
                                <Plus className="mr-2 h-3 w-3" />
                                Add Modifier
                              </Button>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
