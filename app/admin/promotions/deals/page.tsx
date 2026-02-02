
"use client"
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableRestaurantSelect } from "@/components/admin/searchable-restaurant-select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import { useDeals, useCreateDeal, useUpdateDeal, useToggleDeal, useDeleteDeal } from "@/lib/hooks/use-promotions"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  Search, 
  Gift, 
  Clock,
  Calendar,
  Percent,
  Package,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  Pause,
  Play,
  Store,
  Building2,
  ArrowLeft,
  Languages,
  ChevronDown,
  Target,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const dealSchema = z.object({
  name: z.string().min(1, "Name is required"),
  name_fr: z.string().optional(),
  deal_type: z.enum(["bogo", "combo", "happy_hour", "bundle", "limited_time"]),
  description: z.string().optional(),
  description_fr: z.string().optional(),
  discount_type: z.enum(["percentage", "fixed", "free_item"]),
  discount_value: z.coerce.number().min(0),
  conditions: z.object({
    min_quantity: z.coerce.number().optional(),
    min_order_value: z.coerce.number().optional(),
    required_items: z.array(z.string()).optional(),
  }).optional(),
  schedule: z.object({
    days: z.array(z.string()).optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
  }).optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  is_active: z.boolean(),
  is_first_order_only: z.boolean().optional(),
  included_items: z.array(z.number()).optional(),
})

type DealFormValues = z.infer<typeof dealSchema>

type DishItem = {
  id: number
  name: string
  course_id: number | null
}

type CourseItem = {
  id: number
  name: string
}

const dealTypes = [
  { value: 'bogo', label: 'Buy One Get One', icon: Package, color: 'bg-green-500' },
  { value: 'combo', label: 'Combo Deal', icon: Gift, color: 'bg-purple-500' },
  { value: 'happy_hour', label: 'Happy Hour', icon: Clock, color: 'bg-orange-500' },
  { value: 'bundle', label: 'Bundle Discount', icon: Package, color: 'bg-blue-500' },
  { value: 'limited_time', label: 'Limited Time Offer', icon: Calendar, color: 'bg-red-500' },
]

// Deal type mapping for display
const dealTypeMap: Record<string, { value: string; label: string }> = {
  'percent': { value: 'percentage', label: 'Percentage Off' },
  'percentTotal': { value: 'percentage', label: 'Percentage Off Total' },
  'value': { value: 'fixed', label: 'Fixed Amount Off' },
  'valueTotal': { value: 'fixed', label: 'Fixed Amount Off Total' },
  'freeItem': { value: 'bogo', label: 'Free Item / BOGO' },
  'priced': { value: 'combo', label: 'Special Price' },
}

function DealCard({ deal, onEdit, onDelete, onToggle }: { deal: any; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  // Map database deal_type to UI deal type
  const mappedType = dealTypeMap[deal.deal_type]?.value || deal.deal_type
  const dealType = dealTypes.find(t => t.value === mappedType)
  const Icon = dealType?.icon || Gift
  const isActive = deal.is_enabled

  return (
    <Card className={`transition-all ${!isActive ? 'opacity-60' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${dealType?.color || 'bg-gray-500'}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{deal.name}</h3>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Active" : "Paused"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{deal.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {deal.discount_percent && (
                  <span className="font-medium text-primary">{deal.discount_percent}% off</span>
                )}
                {deal.discount_amount && (
                  <span className="font-medium text-primary">${deal.discount_amount} off</span>
                )}
                {deal.date_stop && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Until {new Date(deal.date_stop).toLocaleDateString()}
                  </span>
                )}
                {deal.time_start && deal.time_stop && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {deal.time_start} - {deal.time_stop}
                  </span>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Deal
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggle}>
                {isActive ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Deal
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Activate Deal
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DealsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  // Restaurant selection
  const initialRestaurantId = searchParams.get('restaurant') || ''
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(initialRestaurantId)
  
  useEffect(() => {
    const urlRestaurantId = searchParams.get('restaurant') || ''
    if (urlRestaurantId !== selectedRestaurantId) {
      setSelectedRestaurantId(urlRestaurantId)
    }
  }, [searchParams])
  
  const handleRestaurantChange = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId)
    if (restaurantId) {
      router.push(`/admin/promotions/deals?restaurant=${restaurantId}`)
    } else {
      router.push('/admin/promotions/deals')
    }
  }
  
  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants({ status: 'active' })
  const selectedRestaurant = restaurants.find((r: any) => r.id.toString() === selectedRestaurantId)
  
  // Fetch courses for the selected restaurant
  const { data: courses = [] } = useQuery<CourseItem[]>({
    queryKey: ['menu-categories', selectedRestaurantId],
    queryFn: async () => {
      if (!selectedRestaurantId) return []
      const response = await fetch(`/api/restaurants/${selectedRestaurantId}/menu-categories`)
      if (!response.ok) return []
      return await response.json()
    },
    enabled: !!selectedRestaurantId,
  })

  // Fetch dishes for the selected restaurant
  const { data: dishes = [] } = useQuery<DishItem[]>({
    queryKey: ['menu-dishes', selectedRestaurantId],
    queryFn: async () => {
      if (!selectedRestaurantId) return []
      const response = await fetch(`/api/menu/dishes?restaurant_id=${selectedRestaurantId}`)
      if (!response.ok) return []
      return await response.json()
    },
    enabled: !!selectedRestaurantId,
  })
  
  // Fetch real deals data
  const { data: deals = [], isLoading: loadingDeals } = useDeals(
    selectedRestaurantId ? { restaurant_id: parseInt(selectedRestaurantId) } : undefined
  )
  const createDeal = useCreateDeal()
  const updateDeal = useUpdateDeal()
  const toggleDeal = useToggleDeal()
  const deleteDealMutation = useDeleteDeal()
  
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [dishSearch, setDishSearch] = useState("")

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      name: "",
      name_fr: "",
      deal_type: "bogo",
      description: "",
      description_fr: "",
      discount_type: "percentage",
      discount_value: 0,
      is_active: true,
      is_first_order_only: false,
      included_items: [],
    },
  })
  
  const includedItems = form.watch("included_items") || []
  
  // Group dishes by course for better organization
  const dishesByCourse = useMemo(() => {
    const grouped: Record<string, DishItem[]> = {}
    const courseMap = new Map<number, string>(courses.map((c) => [c.id, c.name]))
    
    dishes.forEach((dish: DishItem) => {
      const courseName = dish.course_id ? (courseMap.get(dish.course_id) || 'Uncategorized') : 'Uncategorized'
      if (!grouped[courseName]) grouped[courseName] = []
      grouped[courseName].push(dish)
    })
    return grouped
  }, [dishes, courses])
  
  // Filter dishes by search
  const filteredDishesByCourse = useMemo(() => {
    if (!dishSearch.trim()) return dishesByCourse
    const searchLower = dishSearch.toLowerCase()
    const filtered: Record<string, DishItem[]> = {}
    Object.entries(dishesByCourse).forEach(([courseName, courseDishes]) => {
      const matchingDishes = courseDishes.filter(d => d.name.toLowerCase().includes(searchLower))
      if (matchingDishes.length > 0) {
        filtered[courseName] = matchingDishes
      }
    })
    return filtered
  }, [dishesByCourse, dishSearch])
  
  // Toggle dish selection
  const handleDishToggle = (dishId: number) => {
    const current = form.getValues("included_items") || []
    if (current.includes(dishId)) {
      form.setValue("included_items", current.filter(id => id !== dishId))
    } else {
      form.setValue("included_items", [...current, dishId])
    }
  }

  // Filter deals based on search and tab
  const filteredDeals = deals.filter((deal: any) => {
    const matchesSearch = deal.name?.toLowerCase().includes(search.toLowerCase()) ||
      deal.description?.toLowerCase().includes(search.toLowerCase())
    
    if (activeTab === "all") return matchesSearch
    if (activeTab === "active") return matchesSearch && deal.is_enabled
    if (activeTab === "scheduled") return matchesSearch && (deal.time_start || deal.date_start)
    if (activeTab === "expired") return matchesSearch && !deal.is_enabled
    // Map deal types
    const mappedType = dealTypeMap[deal.deal_type]?.value
    return matchesSearch && mappedType === activeTab
  })

  const handleEditDeal = (deal: any) => {
    // Map database deal_type back to form deal_type
    let formDealType: "bogo" | "combo" | "happy_hour" | "bundle" | "limited_time" = "bogo"
    if (deal.deal_type === 'freeItem') formDealType = "bogo"
    else if (deal.deal_type === 'percent' || deal.deal_type === 'value') formDealType = "bundle"
    
    // Determine discount type
    let discountType: "percentage" | "fixed" | "free_item" = "percentage"
    let discountValue = 0
    if (deal.discount_percent) {
      discountType = "percentage"
      discountValue = deal.discount_percent
    } else if (deal.discount_amount) {
      discountType = "fixed"
      discountValue = deal.discount_amount
    } else if (deal.deal_type === 'freeItem') {
      discountType = "free_item"
    }
    
    setEditingDeal(deal)
    form.reset({
      name: deal.name || "",
      name_fr: deal.name_fr || "",
      deal_type: formDealType,
      description: deal.description || "",
      description_fr: deal.description_fr || "",
      discount_type: discountType,
      discount_value: discountValue,
      is_active: deal.is_enabled ?? true,
      is_first_order_only: deal.is_first_order_only ?? false,
      included_items: deal.included_items || [],
      valid_from: deal.date_start || "",
      valid_until: deal.date_stop || "",
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (data: DealFormValues) => {
    if (!selectedRestaurantId) return
    
    try {
      // Map form deal_type to database deal_type based on discount_type
      const dbDealType = data.deal_type === 'bogo' ? 'freeItem' 
        : data.discount_type === 'percentage' ? 'percent'
        : data.discount_type === 'fixed' ? 'value'
        : data.deal_type
      
      const dealData = {
        restaurant_id: parseInt(selectedRestaurantId),
        name: data.name,
        name_fr: data.name_fr || null,
        description: data.description,
        description_fr: data.description_fr || null,
        deal_type: dbDealType,
        discount_percent: data.discount_type === 'percentage' ? data.discount_value : null,
        discount_amount: data.discount_type === 'fixed' ? data.discount_value : null,
        date_start: data.valid_from ? new Date(data.valid_from).toISOString().split('T')[0] : null,
        date_stop: data.valid_until ? new Date(data.valid_until).toISOString().split('T')[0] : null,
        is_enabled: data.is_active,
        is_first_order_only: data.is_first_order_only ?? false,
        included_items: data.included_items && data.included_items.length > 0 ? data.included_items : null,
      }
      
      if (editingDeal) {
        await updateDeal.mutateAsync({ id: editingDeal.id, data: dealData })
      } else {
        await createDeal.mutateAsync(dealData)
      }
      setIsDialogOpen(false)
      setEditingDeal(null)
      form.reset()
      setDishSearch("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingDeal ? 'update' : 'create'} deal`,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={selectedRestaurantId ? `/admin/promotions?restaurant=${selectedRestaurantId}` : '/admin/promotions'}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-xl">
                <Gift className="h-6 w-6 text-white" />
              </div>
              Deals & Promotions
            </h1>
            <p className="text-muted-foreground mt-1">
              Create BOGO offers, combo deals, happy hour specials, and more
            </p>
          </div>
        </div>
        {selectedRestaurantId && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingDeal(null)
              form.reset()
            }
          }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDeal ? 'Edit Deal' : 'Create New Deal'}</DialogTitle>
              <DialogDescription>
                {editingDeal ? 'Update this promotional deal' : 'Set up a new promotional deal for your restaurant'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Deal Type Selection */}
                <FormField
                  control={form.control}
                  name="deal_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Type</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {dealTypes.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => field.onChange(type.value)}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              field.value === type.value 
                                ? 'border-primary bg-primary/5' 
                                : 'border-muted hover:border-muted-foreground/50'
                            }`}
                          >
                            <type.icon className={`h-5 w-5 mb-2 ${field.value === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                            <p className="font-medium text-sm">{type.label}</p>
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Deal Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Buy 2 Get 1 Free" data-testid="input-deal-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Describe the deal for customers" data-testid="input-deal-description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* French Translations */}
                <Collapsible className="border rounded-lg p-4">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Languages className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">French Translation (Optional)</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="name_fr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deal Name (French)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Achetez 2, Obtenez 1 Gratuit" data-testid="input-deal-name-fr" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description_fr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (French)</FormLabel>
                          <FormControl>
                            <Input placeholder="Décrivez l'offre pour les clients" data-testid="input-deal-description-fr" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Discount Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discount_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage Off</SelectItem>
                            <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                            <SelectItem value="free_item">Free Item</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discount_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch("discount_type") === "percentage" ? "Percentage" : "Amount"}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder={form.watch("discount_type") === "percentage" ? "25" : "10.00"} 
                            {...field} 
                            disabled={form.watch("discount_type") === "free_item"}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Validity Period */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="valid_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date (Optional)</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valid_until"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date (Optional)</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Item Selection */}
                <Collapsible className="border rounded-lg p-4">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Apply to Specific Dishes (Optional)</span>
                      {includedItems.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {includedItems.length} selected
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Select which dishes this deal applies to. Leave empty to apply to all items.
                    </p>
                    <Input
                      placeholder="Search dishes..."
                      value={dishSearch}
                      onChange={(e) => setDishSearch(e.target.value)}
                      data-testid="input-dish-search"
                    />
                    <ScrollArea className="h-48 border rounded-md p-2">
                      {Object.keys(filteredDishesByCourse).length > 0 ? (
                        Object.entries(filteredDishesByCourse).map(([courseName, courseDishes]) => (
                          <div key={courseName} className="mb-3">
                            <div className="text-xs font-semibold text-muted-foreground mb-1 px-1 sticky top-0 bg-background">
                              {courseName}
                            </div>
                            {courseDishes.map((dish) => (
                              <div
                                key={dish.id}
                                className="flex items-center gap-2 py-1.5 px-1 hover:bg-muted/50 rounded cursor-pointer"
                                onClick={() => handleDishToggle(dish.id)}
                              >
                                <Checkbox
                                  checked={includedItems.includes(dish.id)}
                                  onCheckedChange={() => handleDishToggle(dish.id)}
                                  data-testid={`checkbox-dish-${dish.id}`}
                                />
                                <span className="text-sm">{dish.name}</span>
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          {dishSearch ? "No dishes match your search" : "No dishes available"}
                        </div>
                      )}
                    </ScrollArea>
                    {includedItems.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {includedItems.length} dish{includedItems.length !== 1 ? 'es' : ''} selected
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => form.setValue("included_items", [])}
                        >
                          Clear all
                        </Button>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Active Toggle */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Activate Immediately</FormLabel>
                        <FormDescription>
                          Make this deal available to customers right away
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* First Order Only Toggle */}
                <FormField
                  control={form.control}
                  name="is_first_order_only"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          First Order Only
                        </FormLabel>
                        <FormDescription>
                          Only available to new customers placing their first order
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setEditingDeal(null)
                      form.reset()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingDeal ? 'Update Deal' : 'Create Deal'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Restaurant Selector - Only show full card if no restaurant selected */}
      {!selectedRestaurantId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Select Location
            </CardTitle>
            <CardDescription>
              Choose a restaurant location to manage its deals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <SearchableRestaurantSelect
                restaurants={restaurants}
                value={selectedRestaurantId}
                onValueChange={handleRestaurantChange}
                isLoading={loadingRestaurants}
                placeholder="Select a restaurant location"
                data-testid="select-restaurant"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Compact Restaurant Badge with Change Option */}
          <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-medium">Managing:</span>
              <Badge variant="secondary" className="text-sm">
                {selectedRestaurant?.name} - {selectedRestaurant?.city}
              </Badge>
            </div>
            <div className="w-48">
              <SearchableRestaurantSelect
                restaurants={restaurants}
                value={selectedRestaurantId}
                onValueChange={handleRestaurantChange}
                isLoading={loadingRestaurants}
                placeholder="Change restaurant"
                data-testid="select-restaurant-change"
              />
            </div>
          </div>

          {/* Deal Type Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {dealTypes.map((type) => (
          <Button
            key={type.value}
            variant={activeTab === type.value ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(type.value)}
            className="gap-2"
          >
            <type.icon className="h-4 w-4" />
            {type.label}
          </Button>
        ))}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="expired">Inactive</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Deals Grid */}
      <div className="grid gap-4">
        {filteredDeals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Gift className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No deals found</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Deal
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredDeals.map((deal: any) => (
            <DealCard 
              key={deal.id} 
              deal={deal}
              onEdit={() => handleEditDeal(deal)}
              onDelete={() => deleteDealMutation.mutate(deal.id)}
              onToggle={() => toggleDeal.mutate({ id: deal.id, is_enabled: !deal.is_enabled })}
            />
          ))
        )}
      </div>
        </>
      )}
    </div>
  )
}

