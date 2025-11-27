"use client"

import { useState, useEffect } from "react"
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
import { Switch } from "@/components/ui/switch"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import { useUpsells, useCreateUpsell, useToggleUpsell, useDeleteUpsell } from "@/lib/hooks/use-promotions"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  Search, 
  TrendingUp,
  ShoppingCart,
  ArrowRight,
  Package,
  Coffee,
  Utensils,
  Sparkles,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  GripVertical,
  ChevronRight,
  Store,
  Building2,
  ArrowLeft,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const upsellSchema = z.object({
  name: z.string().min(1, "Name is required"),
  trigger_type: z.enum(["cart_item", "cart_value", "category", "time_based"]),
  trigger_value: z.string().optional(),
  suggestion_type: z.enum(["specific_item", "category", "modifier"]),
  suggested_items: z.array(z.string()).optional(),
  discount_type: z.enum(["none", "percentage", "fixed"]).default("none"),
  discount_value: z.coerce.number().optional(),
  message: z.string().optional(),
  display_location: z.enum(["cart", "checkout", "item_page", "all"]).default("cart"),
  priority: z.coerce.number().default(0),
  is_active: z.boolean().default(true),
})

type UpsellFormValues = z.infer<typeof upsellSchema>

const triggerTypes = [
  { value: 'cart_item', label: 'When item added', icon: Package, desc: 'Suggest when specific item is in cart' },
  { value: 'cart_value', label: 'Cart value threshold', icon: ShoppingCart, desc: 'Suggest when cart reaches $ amount' },
  { value: 'category', label: 'Category based', icon: Utensils, desc: 'Suggest based on item category' },
  { value: 'time_based', label: 'Time of day', icon: Coffee, desc: 'Suggest based on time (e.g., breakfast drinks)' },
]

// Trigger type display mapping
const triggerTypeLabels: Record<string, string> = {
  'dish': 'When item added',
  'course': 'Category based',
  'cart_minimum': 'Cart value threshold',
}

function UpsellCard({ upsell, onEdit, onDelete, onToggle }: { upsell: any; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  // Map database trigger_type to UI
  const triggerLabel = triggerTypeLabels[upsell.trigger_type] || upsell.trigger_type
  const trigger = triggerTypes.find(t => t.value === upsell.trigger_type || t.label.toLowerCase().includes(upsell.trigger_type?.toLowerCase()))
  const Icon = trigger?.icon || TrendingUp

  // Calculate conversion rate
  const conversionRate = upsell.impressions_count > 0 
    ? Math.round((upsell.acceptance_count / upsell.impressions_count) * 100) 
    : 0

  return (
    <Card className={`group transition-all hover:shadow-md ${!upsell.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Drag Handle */}
          <div className="cursor-grab text-muted-foreground hover:text-foreground">
            <GripVertical className="h-5 w-5" />
          </div>
          
          {/* Icon */}
          <div className="p-3 rounded-xl bg-green-500">
            <Icon className="h-5 w-5 text-white" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{upsell.name}</h3>
              <Badge variant={upsell.is_active ? "default" : "secondary"}>
                {upsell.is_active ? "Active" : "Paused"}
              </Badge>
              <Badge variant="outline" className="ml-auto">
                Priority: {upsell.display_priority || 0}
              </Badge>
            </div>
            
            {/* Trigger Description */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="font-medium">Trigger:</span>
              <span>{triggerLabel}</span>
              {upsell.trigger_cart_minimum && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span>${upsell.trigger_cart_minimum}+</span>
                </>
              )}
            </div>
            
            {/* Suggestion */}
            {upsell.headline && (
              <p className="text-sm text-muted-foreground mb-3">
                "{upsell.headline}"
              </p>
            )}
            
            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Conversion:</span>
                <span className="font-semibold">{conversionRate}%</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Accepted:</span>
                <span className="font-semibold">{(upsell.acceptance_count || 0).toLocaleString()}</span>
              </div>
              {(upsell.discount_percent || upsell.discount_amount) && (
                <Badge variant="secondary" className="text-xs">
                  {upsell.discount_percent 
                    ? `${upsell.discount_percent}% off` 
                    : `$${upsell.discount_amount} off`
                  }
                </Badge>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Upsell
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

export default function UpsellsPage() {
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
      router.push(`/admin/promotions/upsells?restaurant=${restaurantId}`)
    } else {
      router.push('/admin/promotions/upsells')
    }
  }
  
  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants({ status: 'active' })
  const selectedRestaurant = restaurants.find((r: any) => r.id.toString() === selectedRestaurantId)

  // Fetch real upsells data
  const { data: upsells = [], isLoading: loadingUpsells } = useUpsells(
    selectedRestaurantId ? { restaurant_id: parseInt(selectedRestaurantId) } : undefined
  )
  const createUpsellMutation = useCreateUpsell()
  const toggleUpsell = useToggleUpsell()
  const deleteUpsellMutation = useDeleteUpsell()

  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const form = useForm<UpsellFormValues>({
    resolver: zodResolver(upsellSchema),
    defaultValues: {
      name: "",
      trigger_type: "cart_item",
      suggestion_type: "category",
      discount_type: "none",
      display_location: "cart",
      priority: 0,
      is_active: true,
    },
  })

  const filteredUpsells = upsells.filter((upsell: any) => 
    upsell.name?.toLowerCase().includes(search.toLowerCase()) ||
    upsell.headline?.toLowerCase().includes(search.toLowerCase()) ||
    upsell.description?.toLowerCase().includes(search.toLowerCase())
  )

  const onSubmit = async (data: UpsellFormValues) => {
    if (!selectedRestaurantId) return
    
    try {
      await createUpsellMutation.mutateAsync({
        restaurant_id: parseInt(selectedRestaurantId),
        name: data.name,
        headline: data.message,
        description: data.message,
        trigger_type: data.trigger_type === 'cart_item' ? 'dish' 
          : data.trigger_type === 'cart_value' ? 'cart_minimum'
          : data.trigger_type === 'category' ? 'course'
          : data.trigger_type,
        discount_percent: data.discount_type === 'percentage' ? data.discount_value : null,
        discount_amount: data.discount_type === 'fixed' ? data.discount_value : null,
        display_priority: data.priority,
        is_active: data.is_active,
      })
      setIsDialogOpen(false)
      form.reset()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create upsell",
        variant: "destructive",
      })
    }
  }

  // Calculate totals from real data
  const activeUpsells = upsells.filter((u: any) => u.is_active)
  const totalAcceptances = activeUpsells.reduce((sum: number, u: any) => sum + (u.acceptance_count || 0), 0)
  const totalImpressions = activeUpsells.reduce((sum: number, u: any) => sum + (u.impressions_count || 0), 0)
  const avgConversion = totalImpressions > 0 ? Math.round((totalAcceptances / totalImpressions) * 100) : 0

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
              <div className="p-2 bg-green-500 rounded-xl">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              Upsells
            </h1>
            <p className="text-muted-foreground mt-1">
              Increase average order value with smart product suggestions
            </p>
          </div>
        </div>
        {selectedRestaurantId && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Upsell Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Upsell Rule</DialogTitle>
              <DialogDescription>
                Set up conditions for suggesting additional items to customers
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Trigger Type */}
                <FormField
                  control={form.control}
                  name="trigger_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>When to show this upsell</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {triggerTypes.map((type) => (
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
                            <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Add a Drink" {...field} />
                      </FormControl>
                      <FormDescription>Internal name to identify this upsell</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Message */}
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Message</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Complete your meal with a side!" {...field} />
                      </FormControl>
                      <FormDescription>What the customer sees</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Discount Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discount_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incentive (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Discount</SelectItem>
                            <SelectItem value="percentage">Percentage Off</SelectItem>
                            <SelectItem value="fixed">Fixed Amount Off</SelectItem>
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
                        <FormLabel>Discount Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0" 
                            {...field} 
                            disabled={form.watch("discount_type") === "none"}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Display Location */}
                <FormField
                  control={form.control}
                  name="display_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Where to Display</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cart">Cart Page</SelectItem>
                          <SelectItem value="checkout">Checkout Page</SelectItem>
                          <SelectItem value="item_page">Item Detail Page</SelectItem>
                          <SelectItem value="all">All Locations</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="1" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Lower numbers show first (1 = highest priority)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Active Toggle */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Activate Immediately</FormLabel>
                        <FormDescription>
                          Start showing this upsell to customers
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

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      form.reset()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Upsell Rule
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
              Choose a restaurant location to manage its upsell rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRestaurants ? (
              <Skeleton className="h-10 w-full max-w-md" />
            ) : (
              <Select value={selectedRestaurantId} onValueChange={handleRestaurantChange}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a restaurant location" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((restaurant: any) => (
                    <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {restaurant.name} - {restaurant.city}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            <Select value={selectedRestaurantId} onValueChange={handleRestaurantChange}>
              <SelectTrigger className="w-auto h-8 text-xs border-primary/30">
                <span className="text-muted-foreground">Change</span>
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((restaurant: any) => (
                  <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                    {restaurant.name} - {restaurant.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Upsell Rules</p>
                    <p className="text-2xl font-bold mt-1">{activeUpsells.length}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg. Conversion Rate</p>
                    <p className="text-2xl font-bold mt-1">{avgConversion}%</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Acceptances</p>
                    <p className="text-2xl font-bold mt-1">{totalAcceptances.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search upsell rules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Upsells List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upsell Rules</h2>
          <p className="text-sm text-muted-foreground">Drag to reorder priority</p>
        </div>
        <div className="space-y-3">
          {filteredUpsells.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upsell rules found</p>
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Upsell Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredUpsells
              .sort((a: any, b: any) => (a.display_priority || 0) - (b.display_priority || 0))
              .map((upsell: any) => (
                <UpsellCard 
                  key={upsell.id} 
                  upsell={upsell}
                  onEdit={() => console.log("Edit", upsell.id)}
                  onDelete={() => deleteUpsellMutation.mutate(upsell.id)}
                  onToggle={() => toggleUpsell.mutate({ id: upsell.id, is_active: !upsell.is_active })}
                />
              ))
          )}
        </div>
      </div>
        </>
      )}
    </div>
  )
}

