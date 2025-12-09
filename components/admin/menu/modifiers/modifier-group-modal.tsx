"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { 
  Pizza, 
  Utensils, 
  Settings,
  X,
  GripVertical,
  Plus,
  Edit,
  Trash2,
  Copy,
  CornerDownRight,
  Zap,
  Link2,
  Layers,
} from "lucide-react"

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
  active?: boolean
}

interface CategoryAssignment {
  id: number
  name: string
  count: number
  checked: boolean
}

interface DishAssignment {
  id: number
  name: string
  category: string
  category_id: number | null
  inherited: boolean
  override: boolean
  overrideReason?: string
}

interface ModifierGroupModalProps {
  group: ModifierGroupListItem | null
  restaurantId: string
  open: boolean
  onClose: () => void
}

const SourceIcon = ({ source, size = "default" }: { source: 'simple' | 'combo', size?: 'default' | 'large' }) => {
  const className = size === 'large' ? "h-6 w-6" : "h-4 w-4"
  if (source === 'combo') {
    return <Pizza className={`${className} text-orange-500`} />
  }
  return <Utensils className={`${className} text-blue-500`} />
}

export function ModifierGroupModal({ group, restaurantId, open, onClose }: ModifierGroupModalProps) {
  const [activeTab, setActiveTab] = useState<'options' | 'assignment' | 'settings'>('options')
  const [editingOption, setEditingOption] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [categoryStates, setCategoryStates] = useState<Record<number, boolean>>({})
  const [optionActiveStates, setOptionActiveStates] = useState<Record<number, boolean>>({})
  const [dishStates, setDishStates] = useState<Record<number, boolean>>({})

  const { data: modifierOptions, isLoading: loadingOptions } = useQuery<{ options: ModifierOption[], source: string, groupId: number }>({
    queryKey: ['modifier-options', group?.id, group?.source],
    queryFn: async () => {
      const res = await fetch(`/api/admin/menu/unified-modifiers/groups/${group?.id}/options?source=${group?.source}`)
      if (!res.ok) throw new Error('Failed to fetch modifier options')
      return res.json()
    },
    enabled: !!group && open,
  })

  const { data: categories = [] } = useQuery<CategoryAssignment[]>({
    queryKey: ['modifier-categories', restaurantId, group?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/menu/unified-modifiers/categories?restaurant_id=${restaurantId}&group_id=${group?.id}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!group && open,
  })

  const { data: dishes = [], isLoading: loadingDishes } = useQuery<DishAssignment[]>({
    queryKey: ['modifier-dish-assignments', restaurantId, group?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/menu/unified-modifiers/dish-assignments?restaurant_id=${restaurantId}&group_id=${group?.id}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!group && open,
  })

  if (!group) return null

  const options = modifierOptions?.options || []

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="max-w-[1100px] w-[95vw] h-[90vh] max-h-[900px] p-0 gap-0 overflow-hidden flex flex-col"
        data-testid="modal-modifier-group"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-8 py-5 border-b bg-gradient-to-b from-muted/30 to-transparent">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-muted">
                <SourceIcon source={group.source} size="large" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-modal-title">{group.name}</h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge 
                    variant="outline" 
                    className={group.source === 'combo' 
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    }
                  >
                    {group.source === 'combo' ? 'Combo' : 'Standard'}
                  </Badge>
                  <span className="text-sm text-muted-foreground font-mono">
                    {group.modifier_count} options
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {group.linked_dish_count} dishes
                  </span>
                  {group.is_required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" data-testid="button-duplicate-group">
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button size="sm" data-testid="button-save-changes">
                Save Changes
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                data-testid="button-close-modal"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-8 border-b">
              <TabsList className="h-12 bg-transparent gap-6 p-0">
                <TabsTrigger 
                  value="options" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3"
                  data-testid="tab-options"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Options
                </TabsTrigger>
                <TabsTrigger 
                  value="assignment"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3"
                  data-testid="tab-assignment"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Assignment
                </TabsTrigger>
                <TabsTrigger 
                  value="settings"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3"
                  data-testid="tab-settings"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <TabsContent value="options" className="m-0 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Modifier Options</h2>
                  <Button size="sm" data-testid="button-add-option">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>

                {loadingOptions ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : options.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Layers className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No options in this group yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Add options that customers can select</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {options.map((option) => (
                      <div
                        key={option.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors ${
                          option.active === false ? 'opacity-60' : ''
                        }`}
                        data-testid={`option-row-${option.id}`}
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab flex-shrink-0" />
                        
                        <div className="flex-1 min-w-0">
                          {editingOption === option.id ? (
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="max-w-xs"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  setEditingOption(null)
                                }
                              }}
                              onBlur={() => setEditingOption(null)}
                              data-testid={`input-option-name-${option.id}`}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{option.name}</span>
                              {option.is_default && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                              {option.active === false && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-right font-mono text-sm min-w-[80px]">
                          {option.price > 0 ? `$${option.price.toFixed(2)}` : 'Free'}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditingOption(option.id)
                              setEditingName(option.name)
                            }}
                            data-testid={`button-edit-option-${option.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-option-${option.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Switch 
                            checked={optionActiveStates[option.id] ?? (option.active !== false)}
                            onCheckedChange={(checked) => {
                              setOptionActiveStates(prev => ({ ...prev, [option.id]: checked }))
                            }}
                            data-testid={`switch-option-active-${option.id}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {group.supports_size_pricing && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
                    <span className="text-blue-600 dark:text-blue-400">ℹ️</span>
                    <span className="text-blue-700 dark:text-blue-300">
                      This group has size-based pricing. Prices may vary by pizza size.
                    </span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="assignment" className="m-0 space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        📁 Apply to Categories
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Check a category to apply this modifier to ALL its dishes
                      </p>
                    </div>
                  </div>
                  
                  {categories.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg bg-muted/20">
                      <p className="text-muted-foreground">No categories found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {categories.map((cat) => {
                        const isChecked = categoryStates[cat.id] ?? cat.checked
                        return (
                          <label 
                            key={cat.id}
                            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                              isChecked 
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                                : 'hover:bg-muted/50'
                            }`}
                            data-testid={`category-checkbox-${cat.id}`}
                          >
                            <Checkbox 
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setCategoryStates(prev => ({ ...prev, [cat.id]: !!checked }))
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{cat.name}</p>
                              <p className="text-xs text-muted-foreground">{cat.count} items</p>
                            </div>
                            {isChecked && (
                              <span className="text-primary text-lg">✓</span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        🍽️ Individual Dishes
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Override category settings for specific dishes
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const newStates: Record<number, boolean> = {}
                          dishes.forEach(d => { newStates[d.id] = true })
                          setDishStates(newStates)
                        }}
                      >
                        Select All
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setDishStates({})}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {loadingDishes ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : dishes.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg bg-muted/20">
                      <p className="text-muted-foreground">No dishes found</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {dishes.map((dish) => {
                        const isChecked = dishStates[dish.id] ?? (dish.inherited || dish.override)
                        return (
                          <div 
                            key={dish.id}
                            className={`flex items-center gap-4 p-4 rounded-lg border ${
                              dish.override ? 'border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20' : ''
                            }`}
                            data-testid={`dish-row-${dish.id}`}
                          >
                            <Checkbox 
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setDishStates(prev => ({ ...prev, [dish.id]: !!checked }))
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{dish.name}</p>
                              <p className="text-xs text-muted-foreground">{dish.category}</p>
                            </div>
                            
                            {dish.inherited && !dish.override && (
                              <Badge variant="outline" className="text-xs gap-1 bg-muted/50">
                                <CornerDownRight className="h-3 w-3" />
                                From {dish.category}
                              </Badge>
                            )}
                            
                            {dish.override && (
                              <Badge variant="outline" className="text-xs gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700">
                                <Zap className="h-3 w-3" />
                                {dish.overrideReason || 'Override'}
                              </Badge>
                            )}
                            
                            <Button variant="outline" size="sm" data-testid={`button-override-${dish.id}`}>
                              Override
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="m-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                  <div className="p-6 rounded-lg border space-y-4">
                    <h3 className="font-semibold">Selection Type</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="radio" 
                          name="selectionType" 
                          value="single"
                          defaultChecked={group.max_selections === 1}
                          className="w-4 h-4"
                        />
                        <span>Single Select</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="radio" 
                          name="selectionType" 
                          value="multi"
                          defaultChecked={group.max_selections > 1}
                          className="w-4 h-4"
                        />
                        <span>Multi Select</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg border space-y-4">
                    <h3 className="font-semibold">Required?</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="radio" 
                          name="required" 
                          value="optional"
                          defaultChecked={!group.is_required}
                          className="w-4 h-4"
                        />
                        <span>Optional</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="radio" 
                          name="required" 
                          value="required"
                          defaultChecked={group.is_required}
                          className="w-4 h-4"
                        />
                        <span>Required</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg border space-y-4">
                    <h3 className="font-semibold">Display Order</h3>
                    <p className="text-sm text-muted-foreground">Order shown to customers (1 = first)</p>
                    <Input type="number" defaultValue={1} min={1} className="w-24" />
                  </div>

                  <div className="p-6 rounded-lg border space-y-4">
                    <h3 className="font-semibold">Free Items Allowed</h3>
                    <p className="text-sm text-muted-foreground">How many options customer gets free</p>
                    <Input type="number" defaultValue={0} min={0} className="w-24" />
                  </div>

                  <div className="md:col-span-2 p-6 rounded-lg border space-y-4">
                    <h3 className="font-semibold">Selection Limits</h3>
                    <p className="text-sm text-muted-foreground">How many options can customer select?</p>
                    <div className="flex gap-6">
                      <div className="space-y-2">
                        <Label>Minimum</Label>
                        <Input 
                          type="number" 
                          defaultValue={group.min_selections} 
                          min={0} 
                          className="w-24" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Maximum</Label>
                        <Input 
                          type="number" 
                          defaultValue={group.max_selections} 
                          min={1} 
                          className="w-24" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
