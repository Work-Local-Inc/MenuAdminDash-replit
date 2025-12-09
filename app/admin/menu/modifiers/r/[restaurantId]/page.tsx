"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { 
  Pizza, 
  Utensils, 
  Package, 
  Search, 
  Settings,
  Layers,
  Edit,
  Plus,
  ArrowLeft,
  Check,
  X,
  ChevronRight,
  Grid3X3,
  List,
  CircleDot,
  MapPin,
  Trash2,
  GripVertical,
  DollarSign,
  AlertCircle,
  Archive
} from "lucide-react"
import { useRestaurant } from "@/lib/hooks/use-restaurants"
import Link from "next/link"

interface ModifierGroupListItem {
  id: number
  name: string
  source: 'simple' | 'combo'
  is_required: boolean
  min_selections: number
  max_selections: number
  modifier_count: number
  linked_dish_count: number
  supports_placements: boolean
  supports_size_pricing: boolean
}

interface DishListItem {
  id: number
  name: string
  category: string
  category_id: number | null
  dish_type: 'simple' | 'pizza' | 'combo'
  has_modifiers: boolean
  modifier_count: number
}

interface ModifierOption {
  id: number
  name: string
  price: number
  is_default: boolean
  is_included: boolean
  display_order: number
  modifier_type: string | null
  size_prices?: Array<{ size: string; price: number }>
  placements?: Array<{ placement: string; price_modifier: number }>
}

const SourceIcon = ({ source }: { source: 'simple' | 'combo' }) => {
  if (source === 'combo') {
    return <Pizza className="h-4 w-4 text-orange-500" />
  }
  return <Utensils className="h-4 w-4 text-blue-500" />
}

const SourceBadge = ({ source }: { source: 'simple' | 'combo' }) => {
  const config = {
    combo: { label: 'Pizza/Combo', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
    simple: { label: 'Standard', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' }
  }
  const { label, className } = config[source]
  return <Badge variant="outline" className={className}>{label}</Badge>
}

interface ModifierGroupGridProps {
  groups: ModifierGroupListItem[]
  viewMode: 'grid' | 'list'
  getSelectionLabel: (group: ModifierGroupListItem) => string
  onSelectGroup: (id: number) => void
  isInactive?: boolean
}

const ModifierGroupGrid = ({ groups, viewMode, getSelectionLabel, onSelectGroup, isInactive }: ModifierGroupGridProps) => {
  if (viewMode === 'list') {
    return (
      <div className="space-y-1">
        {groups.map(group => (
          <div
            key={group.id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover-elevate transition-all ${isInactive ? 'opacity-60' : ''}`}
            onClick={() => onSelectGroup(group.id)}
            data-testid={`row-modifier-group-${group.id}`}
          >
            <SourceIcon source={group.source} />
            <div className="flex-1 min-w-0">
              <span className="font-medium truncate">{group.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{group.modifier_count} options</span>
              <span>•</span>
              <span>{group.linked_dish_count} dishes</span>
            </div>
            {group.is_required && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map(group => (
        <Card 
          key={group.id} 
          className={`cursor-pointer hover-elevate transition-all ${isInactive ? 'opacity-60' : ''}`}
          onClick={() => onSelectGroup(group.id)}
          data-testid={`card-modifier-group-${group.id}`}
        >
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-muted">
                  <SourceIcon source={group.source} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{group.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {getSelectionLabel(group)}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {group.modifier_count} option{group.modifier_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <SourceBadge source={group.source} />
              {group.is_required && (
                <Badge variant="destructive" className="text-xs">Required</Badge>
              )}
              {group.supports_placements && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  Placements
                </Badge>
              )}
              {group.supports_size_pricing && (
                <Badge variant="outline" className="text-xs">
                  Size Pricing
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <span className="text-sm text-muted-foreground">
                {group.linked_dish_count === 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">Not linked to any dishes</span>
                ) : (
                  `Linked to ${group.linked_dish_count} dish${group.linked_dish_count !== 1 ? 'es' : ''}`
                )}
              </span>
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation()
                onSelectGroup(group.id)
              }}>
                <Edit className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function RestaurantModifiersPage() {
  const params = useParams()
  const router = useRouter()
  const restaurantId = params.restaurantId as string
  
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedDishIds, setSelectedDishIds] = useState<Set<number>>(new Set())
  const [editingOption, setEditingOption] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  const { data: restaurant, isLoading: loadingRestaurant } = useRestaurant(restaurantId)

  const { data: modifierGroups = [], isLoading: loadingGroups } = useQuery<ModifierGroupListItem[]>({
    queryKey: ['modifier-groups', restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/menu/unified-modifiers/groups?restaurant_id=${restaurantId}`)
      if (!res.ok) throw new Error('Failed to fetch modifier groups')
      return res.json()
    },
    enabled: !!restaurantId,
  })

  const { data: dishes = [], isLoading: loadingDishes } = useQuery<DishListItem[]>({
    queryKey: ['unified-modifiers-dishes', restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/menu/unified-modifiers/dishes?restaurant_id=${restaurantId}`)
      if (!res.ok) throw new Error('Failed to fetch dishes')
      return res.json()
    },
    enabled: !!restaurantId,
  })

  const selectedGroup = modifierGroups.find(g => g.id === selectedGroupId)

  const { data: modifierOptions, isLoading: loadingOptions, refetch: refetchOptions } = useQuery<{ options: ModifierOption[], source: string, groupId: number }>({
    queryKey: ['modifier-options', selectedGroupId, selectedGroup?.source],
    queryFn: async () => {
      const res = await fetch(`/api/admin/menu/unified-modifiers/groups/${selectedGroupId}/options?source=${selectedGroup?.source}`)
      if (!res.ok) throw new Error('Failed to fetch modifier options')
      return res.json()
    },
    enabled: !!selectedGroupId && !!selectedGroup,
  })

  const filteredGroups = modifierGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSource = sourceFilter === 'all' || group.source === sourceFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && group.linked_dish_count > 0) ||
      (statusFilter === 'inactive' && group.linked_dish_count === 0)
    return matchesSearch && matchesSource && matchesStatus
  })

  const activeGroups = filteredGroups.filter(g => g.linked_dish_count > 0)
  const inactiveGroups = filteredGroups.filter(g => g.linked_dish_count === 0)

  const getSelectionLabel = (group: ModifierGroupListItem) => {
    if (group.is_required) {
      if (group.min_selections === group.max_selections) {
        return `Pick ${group.min_selections}`
      }
      return `Pick ${group.min_selections}-${group.max_selections}`
    }
    return group.max_selections > 0 ? `Up to ${group.max_selections}` : 'Optional'
  }

  const toggleDishSelection = (dishId: number) => {
    setSelectedDishIds(prev => {
      const next = new Set(prev)
      if (next.has(dishId)) {
        next.delete(dishId)
      } else {
        next.add(dishId)
      }
      return next
    })
  }

  const selectAllDishes = () => {
    setSelectedDishIds(new Set(dishes.map(d => d.id)))
  }

  const clearDishSelection = () => {
    setSelectedDishIds(new Set())
  }

  if (loadingRestaurant) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/menu/modifiers">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              Modifier Library
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-restaurant-name">
              {restaurant?.name || 'Loading...'}
            </p>
          </div>
        </div>
        <Button data-testid="button-create-modifier">
          <Plus className="mr-2 h-4 w-4" />
          Create Modifier Group
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search modifier groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-modifiers"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40" data-testid="select-source-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="simple">Standard</SelectItem>
                <SelectItem value="combo">Pizza/Combo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive (0 dishes)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                data-testid="button-view-grid"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingGroups ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Modifier Groups Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || sourceFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'This restaurant has no modifier groups yet'}
            </p>
            <Button data-testid="button-create-first-modifier">
              <Plus className="mr-2 h-4 w-4" />
              Create First Modifier Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {statusFilter === 'all' && inactiveGroups.length > 0 && activeGroups.length > 0 ? (
            <>
              <ModifierGroupGrid
                groups={activeGroups}
                viewMode={viewMode}
                getSelectionLabel={getSelectionLabel}
                onSelectGroup={setSelectedGroupId}
              />
              
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Inactive ({inactiveGroups.length} not linked to any dishes)
                  </h3>
                </div>
                <ModifierGroupGrid
                  groups={inactiveGroups}
                  viewMode={viewMode}
                  getSelectionLabel={getSelectionLabel}
                  onSelectGroup={setSelectedGroupId}
                  isInactive
                />
              </div>
            </>
          ) : (
            <ModifierGroupGrid
              groups={filteredGroups}
              viewMode={viewMode}
              getSelectionLabel={getSelectionLabel}
              onSelectGroup={setSelectedGroupId}
              isInactive={statusFilter === 'inactive'}
            />
          )}
        </div>
      )}

      <Sheet open={!!selectedGroupId} onOpenChange={(open) => !open && setSelectedGroupId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedGroup && (
                <>
                  <SourceIcon source={selectedGroup.source} />
                  {selectedGroup.name}
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              Manage modifier options and dish assignments
            </SheetDescription>
          </SheetHeader>

          {selectedGroup && (
            <Tabs defaultValue="overview" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="modifiers">Options</TabsTrigger>
                <TabsTrigger value="dishes">Dishes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-semibold capitalize">{selectedGroup.source}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Selection</p>
                    <p className="font-semibold">{getSelectionLabel(selectedGroup)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Options</p>
                    <p className="font-semibold">{selectedGroup.modifier_count}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Linked Dishes</p>
                    <p className="font-semibold">{selectedGroup.linked_dish_count}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedGroup.is_required && (
                    <Badge variant="destructive">Required</Badge>
                  )}
                  {selectedGroup.supports_placements && (
                    <Badge variant="outline">
                      <CircleDot className="h-3 w-3 mr-1" />
                      Pizza Placements
                    </Badge>
                  )}
                  {selectedGroup.supports_size_pricing && (
                    <Badge variant="outline">Size-based Pricing</Badge>
                  )}
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline" data-testid="button-edit-group">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Details
                  </Button>
                  <Button className="flex-1" data-testid="button-manage-options">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Options
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="modifiers" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {modifierOptions?.options?.length || 0} options in this group
                  </p>
                  <Button size="sm" data-testid="button-add-option">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>

                {loadingOptions ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : !modifierOptions?.options?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No options in this group yet</p>
                    <p className="text-sm mt-2">Add options that customers can select</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {modifierOptions.options.map((option, index) => (
                      <div
                        key={option.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50"
                        data-testid={`option-row-${option.id}`}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        
                        {editingOption === option.id ? (
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingOption(null)
                              } else if (e.key === 'Escape') {
                                setEditingOption(null)
                              }
                            }}
                            data-testid={`input-option-name-${option.id}`}
                          />
                        ) : (
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => {
                              setEditingOption(option.id)
                              setEditingName(option.name)
                            }}
                          >
                            <p className="font-medium">{option.name}</p>
                            {option.is_default && (
                              <span className="text-xs text-muted-foreground">Default selection</span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {option.price > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <DollarSign className="h-3 w-3" />
                              {option.price.toFixed(2)}
                            </Badge>
                          )}
                          {option.is_included && (
                            <Badge variant="secondary" className="text-xs">Included</Badge>
                          )}
                        </div>

                        {editingOption === option.id ? (
                          <div className="flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => setEditingOption(null)}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => setEditingOption(null)}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => {
                                setEditingOption(option.id)
                                setEditingName(option.name)
                              }}
                              data-testid={`button-edit-option-${option.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              data-testid={`button-delete-option-${option.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedGroup.source === 'combo' && modifierOptions?.options?.some(o => o.size_prices?.length) && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>This group has size-based pricing. Prices vary by pizza size.</span>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="dishes" className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Select dishes to link this modifier group
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllDishes}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearDishSelection}>
                      Clear
                    </Button>
                  </div>
                </div>

                {loadingDishes ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : dishes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No dishes found for this restaurant</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {dishes.map(dish => (
                      <div
                        key={dish.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50"
                        data-testid={`dish-checkbox-${dish.id}`}
                      >
                        <Checkbox
                          id={`dish-${dish.id}`}
                          checked={selectedDishIds.has(dish.id)}
                          onCheckedChange={() => toggleDishSelection(dish.id)}
                        />
                        <label 
                          htmlFor={`dish-${dish.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <p className="font-medium">{dish.name}</p>
                          <p className="text-xs text-muted-foreground">{dish.category}</p>
                        </label>
                        {dish.has_modifiers && (
                          <Badge variant="secondary" className="text-xs">
                            {dish.modifier_count} groups
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedDishIds.size > 0 && (
                  <div className="sticky bottom-0 pt-4 border-t bg-background">
                    <Button className="w-full" data-testid="button-apply-assignments">
                      <Check className="h-4 w-4 mr-2" />
                      Link to {selectedDishIds.size} Dish{selectedDishIds.size !== 1 ? 'es' : ''}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
