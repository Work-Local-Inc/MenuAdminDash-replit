"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { SearchableRestaurantSelect } from "@/components/admin/searchable-restaurant-select"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import { useCreateDeal } from "@/lib/hooks/use-promotions"
import { useCreateCoupon } from "@/lib/hooks/use-coupons"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { 
  Tag, 
  Gift, 
  ArrowLeft,
  Languages,
  ChevronDown,
  Store,
  Building2,
  Package,
  Clock,
  Calendar,
  Search,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type PromoType = "deal" | "coupon" | null

const dealTypes = [
  { value: 'bogo', label: 'Buy One Get One (BOGO)', icon: Package },
  { value: 'combo', label: 'Combo Deal', icon: Gift },
  { value: 'happy_hour', label: 'Happy Hour', icon: Clock },
  { value: 'bundle', label: 'Bundle Discount', icon: Package },
  { value: 'limited_time', label: 'Limited Time Offer', icon: Calendar },
]

const promoSchema = z.object({
  promo_type: z.enum(["deal", "coupon"]),
  name: z.string().min(1, "Name is required"),
  name_fr: z.string().optional(),
  description: z.string().optional(),
  description_fr: z.string().optional(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.coerce.number().min(0.01, "Discount value must be greater than 0"),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  is_active: z.boolean(),
  deal_type: z.enum(["bogo", "combo", "happy_hour", "bundle", "limited_time"]).optional(),
  is_first_order_only: z.boolean().optional(),
  included_items: z.array(z.number()).optional(),
  code: z.string().optional(),
  max_redemptions: z.union([z.coerce.number().int().positive(), z.literal(''), z.undefined()]).optional(),
  max_uses_per_customer: z.union([z.coerce.number().int().positive(), z.literal(''), z.undefined()]).optional(),
  minimum_purchase: z.union([z.coerce.number().positive(), z.literal(''), z.undefined()]).optional(),
}).refine((data) => {
  if (data.promo_type === "coupon") {
    return data.code && data.code.trim().length > 0
  }
  return true
}, {
  message: "Coupon code is required",
  path: ["code"]
}).refine((data) => {
  if (data.promo_type === "deal") {
    return data.deal_type !== undefined
  }
  return true
}, {
  message: "Deal type is required",
  path: ["deal_type"]
})

type PromoFormValues = z.infer<typeof promoSchema>

type DishItem = {
  id: number
  name: string
  course_id: number | null
}

type CourseItem = {
  id: number
  name: string
}

export default function CreatePromoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlRestaurantId = searchParams.get('restaurant')
  const { toast } = useToast()
  
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(urlRestaurantId || '')
  const [selectedType, setSelectedType] = useState<PromoType>(null)
  const [dishSearch, setDishSearch] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants({ status: 'active' })
  const selectedRestaurant = restaurants.find((r: any) => r.id?.toString() === selectedRestaurantId)
  
  const createDeal = useCreateDeal()
  const createCoupon = useCreateCoupon(selectedRestaurantId || undefined)
  
  useEffect(() => {
    if (urlRestaurantId && urlRestaurantId !== selectedRestaurantId) {
      setSelectedRestaurantId(urlRestaurantId)
    }
  }, [urlRestaurantId])
  
  useEffect(() => {
    if (!selectedRestaurantId && !loadingRestaurants && restaurants.length === 1) {
      const onlyRestaurant = restaurants[0]
      setSelectedRestaurantId(onlyRestaurant.id.toString())
      router.replace(`/admin/promotions/create?restaurant=${onlyRestaurant.id}`)
    }
  }, [restaurants, loadingRestaurants, selectedRestaurantId, router])
  
  const handleRestaurantChange = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId)
    router.push(`/admin/promotions/create?restaurant=${restaurantId}`)
  }
  
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

  const form = useForm<PromoFormValues>({
    resolver: zodResolver(promoSchema),
    defaultValues: {
      promo_type: "deal",
      name: "",
      name_fr: "",
      description: "",
      description_fr: "",
      discount_type: "percentage",
      discount_value: 0,
      valid_from: "",
      valid_until: "",
      is_active: true,
      deal_type: "bogo",
      is_first_order_only: false,
      included_items: [],
      code: "",
      max_redemptions: undefined,
      max_uses_per_customer: undefined,
      minimum_purchase: undefined,
    },
  })
  
  const includedItems = form.watch("included_items") || []
  
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
  
  const handleDishToggle = (dishId: number) => {
    const current = form.getValues("included_items") || []
    if (current.includes(dishId)) {
      form.setValue("included_items", current.filter(id => id !== dishId))
    } else {
      form.setValue("included_items", [...current, dishId])
    }
  }
  
  const handleTypeSelect = (type: PromoType) => {
    setSelectedType(type)
    if (type) {
      form.setValue("promo_type", type)
    }
  }

  const onSubmit = async (data: PromoFormValues) => {
    if (!selectedRestaurantId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a restaurant first",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      if (data.promo_type === "deal") {
        const dbDealType = data.deal_type === 'bogo' ? 'freeItem' 
          : data.discount_type === 'percentage' ? 'percent'
          : data.discount_type === 'fixed' ? 'value'
          : data.deal_type
        
        const dealData = {
          restaurant_id: parseInt(selectedRestaurantId),
          name: data.name,
          name_fr: data.name_fr || null,
          description: data.description || null,
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
        
        await createDeal.mutateAsync(dealData)
        toast({
          title: "Success",
          description: "Deal created successfully",
        })
      } else {
        const couponData = {
          code: data.code?.toUpperCase() || "",
          name: data.name,
          name_fr: data.name_fr || null,
          description: data.description || null,
          description_fr: data.description_fr || null,
          discount_type: data.discount_type,
          discount_amount: data.discount_value,
          minimum_purchase: data.minimum_purchase || null,
          max_redemptions: data.max_redemptions || null,
          max_uses_per_customer: data.max_uses_per_customer || null,
          valid_from_at: data.valid_from || null,
          valid_until_at: data.valid_until || null,
        }
        
        await createCoupon.mutateAsync(couponData)
        toast({
          title: "Success",
          description: "Coupon created successfully",
        })
      }
      
      router.push(`/admin/promotions?restaurant=${selectedRestaurantId}`)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create promotion",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!selectedRestaurantId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/promotions" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Promo</h1>
            <p className="text-muted-foreground">
              Create a new deal or coupon for your restaurant
            </p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Select Location
            </CardTitle>
            <CardDescription>
              Choose a restaurant location to create a promotion
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/promotions?restaurant=${selectedRestaurantId}`} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Create Promo</h1>
          <p className="text-muted-foreground">
            Create a new deal or coupon for your restaurant
          </p>
        </div>
        {selectedRestaurant && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedRestaurant.name}</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedType === 'deal' ? 'ring-2 ring-purple-500 bg-purple-500/5' : ''
          }`}
          onClick={() => handleTypeSelect('deal')}
          data-testid="card-type-deal"
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-500">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Auto-Apply Deal</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Discount applies automatically at checkout
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedType === 'coupon' ? 'ring-2 ring-blue-500 bg-blue-500/5' : ''
          }`}
          onClick={() => handleTypeSelect('coupon')}
          data-testid="card-type-coupon"
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500">
                <Tag className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Coupon Code</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Customer enters a code to get discount
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedType && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedType === 'deal' ? 'Create Auto-Apply Deal' : 'Create Coupon Code'}
            </CardTitle>
            <CardDescription>
              {selectedType === 'deal' 
                ? 'Set up a deal that applies automatically when conditions are met'
                : 'Create a coupon code that customers can enter at checkout'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {selectedType === 'coupon' && (
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coupon Code *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="SUMMER2024" 
                            data-testid="input-coupon-code"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormDescription>
                          Will be automatically converted to uppercase
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedType === 'deal' && (
                  <FormField
                    control={form.control}
                    name="deal_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deal Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-deal-type">
                              <SelectValue placeholder="Select deal type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dealTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <span className="flex items-center gap-2">
                                  <type.icon className="h-4 w-4" />
                                  {type.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={selectedType === 'deal' ? "e.g., Buy 2 Get 1 Free" : "e.g., Summer Sale Discount"}
                          data-testid="input-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Describe the promotion for customers"
                          data-testid="input-description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Collapsible className="border rounded-lg p-4">
                  <CollapsibleTrigger className="flex items-center justify-between w-full" data-testid="collapsible-french">
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
                          <FormLabel>Name (French)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Achetez 2, Obtenez 1 Gratuit"
                              data-testid="input-name-fr"
                              {...field}
                            />
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
                            <Input 
                              placeholder="Décrivez la promotion pour les clients"
                              data-testid="input-description-fr"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CollapsibleContent>
                </Collapsible>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discount_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-discount-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
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
                            min="0"
                            placeholder="10"
                            data-testid="input-discount-value"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="valid_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valid From (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local"
                            data-testid="input-valid-from"
                            {...field}
                          />
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
                        <FormLabel>Valid Until (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local"
                            data-testid="input-valid-until"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Enable this promotion immediately after creation
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {selectedType === 'deal' && (
                  <>
                    <FormField
                      control={form.control}
                      name="is_first_order_only"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">First Order Only</FormLabel>
                            <FormDescription>
                              Only apply this deal to customers making their first order
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-first-order-only"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Item Targeting (Optional)
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Select specific dishes this deal applies to. Leave empty to apply to all items.
                      </p>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search dishes..."
                          value={dishSearch}
                          onChange={(e) => setDishSearch(e.target.value)}
                          className="pl-10"
                          data-testid="input-dish-search"
                        />
                      </div>
                      {includedItems.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {includedItems.length} dish{includedItems.length !== 1 ? 'es' : ''} selected
                        </div>
                      )}
                      <ScrollArea className="h-[200px] border rounded-lg p-3">
                        {Object.entries(filteredDishesByCourse).map(([courseName, courseDishes]) => (
                          <div key={courseName} className="mb-4">
                            <h4 className="font-medium text-sm text-muted-foreground mb-2">{courseName}</h4>
                            <div className="space-y-1">
                              {courseDishes.map((dish) => (
                                <div key={dish.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`dish-${dish.id}`}
                                    checked={includedItems.includes(dish.id)}
                                    onCheckedChange={() => handleDishToggle(dish.id)}
                                    data-testid={`checkbox-dish-${dish.id}`}
                                  />
                                  <label
                                    htmlFor={`dish-${dish.id}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {dish.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {Object.keys(filteredDishesByCourse).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {dishSearch ? 'No dishes match your search' : 'No dishes available'}
                          </p>
                        )}
                      </ScrollArea>
                    </div>
                  </>
                )}

                {selectedType === 'coupon' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="max_redemptions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Redemptions (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                min="1"
                                placeholder="Leave blank for unlimited"
                                data-testid="input-max-redemptions"
                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Total times this coupon can be used
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="max_uses_per_customer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Uses Per Customer (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                min="1"
                                placeholder="Leave blank for unlimited"
                                data-testid="input-max-uses-per-customer"
                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Times each customer can use this
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="minimum_purchase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Purchase (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Leave blank for no minimum"
                              data-testid="input-minimum-purchase"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Minimum order amount required to use this coupon
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push(`/admin/promotions?restaurant=${selectedRestaurantId}`)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    data-testid="button-submit"
                  >
                    {isSubmitting ? 'Creating...' : `Create ${selectedType === 'deal' ? 'Deal' : 'Coupon'}`}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
