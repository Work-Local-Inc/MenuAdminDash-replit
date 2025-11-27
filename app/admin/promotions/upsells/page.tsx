"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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

// Mock data
const mockUpsells = [
  { 
    id: 1, 
    name: 'Add a Drink', 
    trigger_type: 'cart_item',
    trigger_value: 'Any Pizza',
    suggestion_type: 'category',
    suggested_items: ['Beverages'],
    discount_type: 'fixed',
    discount_value: 2,
    message: 'Add a drink for just $2 off!',
    display_location: 'cart',
    conversionRate: 34,
    revenue: 4520,
    is_active: true,
    priority: 1,
  },
  { 
    id: 2, 
    name: 'Side Dish Suggestion', 
    trigger_type: 'cart_item',
    trigger_value: 'Entrees',
    suggestion_type: 'category',
    suggested_items: ['Sides'],
    discount_type: 'percentage',
    discount_value: 15,
    message: 'Complete your meal with a side!',
    display_location: 'cart',
    conversionRate: 28,
    revenue: 3240,
    is_active: true,
    priority: 2,
  },
  { 
    id: 3, 
    name: 'Dessert Upsell', 
    trigger_type: 'cart_value',
    trigger_value: '$30+',
    suggestion_type: 'category',
    suggested_items: ['Desserts'],
    discount_type: 'none',
    message: 'Save room for dessert?',
    display_location: 'checkout',
    conversionRate: 22,
    revenue: 2180,
    is_active: true,
    priority: 3,
  },
  { 
    id: 4, 
    name: 'Morning Coffee', 
    trigger_type: 'time_based',
    trigger_value: '6am - 11am',
    suggestion_type: 'specific_item',
    suggested_items: ['Coffee', 'Latte'],
    discount_type: 'fixed',
    discount_value: 1,
    message: 'Start your day with $1 off coffee!',
    display_location: 'all',
    conversionRate: 41,
    revenue: 1890,
    is_active: false,
    priority: 4,
  },
]

function UpsellCard({ upsell, onEdit, onDelete }: { upsell: any; onEdit: () => void; onDelete: () => void }) {
  const trigger = triggerTypes.find(t => t.value === upsell.trigger_type)
  const Icon = trigger?.icon || TrendingUp

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
                Priority: {upsell.priority}
              </Badge>
            </div>
            
            {/* Trigger Description */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="font-medium">Trigger:</span>
              <span>{trigger?.label}</span>
              <ChevronRight className="h-3 w-3" />
              <span>{upsell.trigger_value}</span>
            </div>
            
            {/* Suggestion */}
            <p className="text-sm text-muted-foreground mb-3">
              "{upsell.message}"
            </p>
            
            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Conversion:</span>
                <span className="font-semibold">{upsell.conversionRate}%</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Revenue:</span>
                <span className="font-semibold">${upsell.revenue.toLocaleString()}</span>
              </div>
              {upsell.discount_type !== 'none' && (
                <Badge variant="secondary" className="text-xs">
                  {upsell.discount_type === 'percentage' 
                    ? `${upsell.discount_value}% off` 
                    : `$${upsell.discount_value} off`
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
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

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

  const filteredUpsells = mockUpsells.filter((upsell) => 
    upsell.name.toLowerCase().includes(search.toLowerCase()) ||
    upsell.message?.toLowerCase().includes(search.toLowerCase())
  )

  const onSubmit = async (data: UpsellFormValues) => {
    try {
      console.log("Creating upsell:", data)
      toast({
        title: "Success",
        description: "Upsell rule created successfully",
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

  // Calculate totals
  const totalRevenue = mockUpsells.filter(u => u.is_active).reduce((sum, u) => sum + u.revenue, 0)
  const avgConversion = Math.round(
    mockUpsells.filter(u => u.is_active).reduce((sum, u) => sum + u.conversionRate, 0) / 
    mockUpsells.filter(u => u.is_active).length
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Upsell Rules</p>
                <p className="text-2xl font-bold mt-1">{mockUpsells.filter(u => u.is_active).length}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Revenue Generated</p>
                <p className="text-2xl font-bold mt-1">${totalRevenue.toLocaleString()}</p>
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
              .sort((a, b) => a.priority - b.priority)
              .map((upsell) => (
                <UpsellCard 
                  key={upsell.id} 
                  upsell={upsell}
                  onEdit={() => console.log("Edit", upsell.id)}
                  onDelete={() => console.log("Delete", upsell.id)}
                />
              ))
          )}
        </div>
      </div>
    </div>
  )
}

