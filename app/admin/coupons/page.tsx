"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableRestaurantSelect } from "@/components/admin/searchable-restaurant-select"
import { useCoupons, useCreateCoupon } from "@/lib/hooks/use-coupons"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Search, Tag, ArrowLeft, Building2, Store, Languages, ChevronDown, Trash2, Layers } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"

// Tier schema for tiered discounts
const tierSchema = z.object({
  threshold_amount: z.coerce.number().min(0, "Must be 0 or greater"),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.coerce.number().positive("Must be greater than 0"),
  description: z.string().optional(),
})

// Form schema - matches database column names
// NO global option - coupons are ALWAYS location-specific
const couponSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().optional(),
  name_fr: z.string().optional(),
  description: z.string().optional(),
  description_fr: z.string().optional(),
  discount_type: z.enum(["percentage", "fixed", "tiered"]),
  discount_amount: z.coerce.number().min(0),
  minimum_purchase: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
  max_redemptions: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
  max_uses_per_customer: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
  valid_until_at: z.string().optional(),
  discount_tiers: z.array(tierSchema).optional(),
}).refine((data) => {
  // If tiered, require at least one tier
  if (data.discount_type === "tiered") {
    return data.discount_tiers && data.discount_tiers.length > 0
  }
  // If not tiered, require positive discount amount
  return data.discount_amount > 0
}, {
  message: "For tiered discounts, add at least one tier. For regular discounts, enter an amount greater than 0.",
  path: ["discount_amount"]
})

type DiscountTier = {
  threshold_amount: number
  discount_type: "percentage" | "fixed"
  discount_value: number
  description?: string
}

type CouponFormValues = {
  code: string
  name?: string
  name_fr?: string
  description?: string
  description_fr?: string
  discount_type: "percentage" | "fixed" | "tiered"
  discount_amount: number
  minimum_purchase?: number | ''
  max_redemptions?: number | ''
  max_uses_per_customer?: number | ''
  valid_until_at?: string
  discount_tiers?: DiscountTier[]
}

export default function CouponsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlRestaurantId = searchParams.get('restaurant')
  
  // Local state for selected restaurant - synced with URL
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(urlRestaurantId || '')
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // Get restaurant info for display
  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants({ status: 'active' })
  const selectedRestaurant = restaurants.find((r: any) => r.id?.toString() === selectedRestaurantId)
  
  // Sync state with URL
  useEffect(() => {
    if (urlRestaurantId && urlRestaurantId !== selectedRestaurantId) {
      setSelectedRestaurantId(urlRestaurantId)
    }
  }, [urlRestaurantId])
  
  // Auto-select if user only has access to 1 restaurant
  useEffect(() => {
    if (!selectedRestaurantId && !loadingRestaurants && restaurants.length === 1) {
      const onlyRestaurant = restaurants[0]
      setSelectedRestaurantId(onlyRestaurant.id.toString())
      router.replace(`/admin/coupons?restaurant=${onlyRestaurant.id}`)
    }
  }, [restaurants, loadingRestaurants, selectedRestaurantId, router])
  
  // Handler to update both state and URL when restaurant changes
  const handleRestaurantChange = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId)
    router.push(`/admin/coupons?restaurant=${restaurantId}`)
  }
  
  // Fetch coupons filtered by restaurant (only when restaurant is selected)
  const { data: coupons = [], isLoading } = useCoupons(selectedRestaurantId || undefined)
  const createCoupon = useCreateCoupon(selectedRestaurantId || undefined)
  const { toast } = useToast()

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      name: "",
      name_fr: "",
      description: "",
      description_fr: "",
      discount_type: "percentage" as const,
      discount_amount: 0,
      minimum_purchase: undefined,
      max_redemptions: undefined,
      max_uses_per_customer: undefined,
      valid_until_at: "",
      discount_tiers: [],
    },
  })
  
  const discountType = form.watch("discount_type")
  const discountTiers = form.watch("discount_tiers") || []
  
  const addTier = () => {
    const currentTiers = form.getValues("discount_tiers") || []
    const lastThreshold = currentTiers.length > 0 
      ? currentTiers[currentTiers.length - 1].threshold_amount + 25 
      : 0
    const newTier: DiscountTier = {
      threshold_amount: lastThreshold,
      discount_type: "percentage",
      discount_value: currentTiers.length > 0 ? currentTiers[currentTiers.length - 1].discount_value + 5 : 10,
    }
    form.setValue("discount_tiers", [...currentTiers, newTier])
  }
  
  const removeTier = (index: number) => {
    const currentTiers = form.getValues("discount_tiers") || []
    form.setValue("discount_tiers", currentTiers.filter((_, i) => i !== index))
  }
  
  const updateTier = (index: number, field: keyof DiscountTier, value: any) => {
    const currentTiers = form.getValues("discount_tiers") || []
    const updatedTiers = [...currentTiers]
    updatedTiers[index] = { ...updatedTiers[index], [field]: value }
    form.setValue("discount_tiers", updatedTiers)
  }

  const filteredCoupons = coupons.filter((coupon: any) => {
    const searchLower = search.toLowerCase()
    return coupon.code?.toLowerCase().includes(searchLower)
  })

  const onSubmit = async (data: CouponFormValues) => {
    try {
      // Convert code to uppercase before sending
      const payload = {
        ...data,
        code: data.code.toUpperCase(),
      }
      await createCoupon.mutateAsync(payload)
      toast({
        title: "Success",
        description: "Coupon created successfully",
      })
      setIsDialogOpen(false)
      form.reset()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create coupon",
        variant: "destructive",
      })
    }
  }

  // If no restaurant selected, show restaurant selector
  if (!selectedRestaurantId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-xl">
                <Tag className="h-6 w-6 text-white" />
              </div>
              Coupons
            </h1>
            <p className="text-muted-foreground">Manage promotional coupons and discounts</p>
          </div>
        </div>
        
        {/* Restaurant Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Select Location
            </CardTitle>
            <CardDescription>
              Choose a restaurant location to manage its coupons
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
      {/* Back link and restaurant context */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/promotions?restaurant=${selectedRestaurantId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketing Hub
          </Link>
        </Button>
        {selectedRestaurant && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedRestaurant.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground">
            Manage coupons for {selectedRestaurant?.name || 'your restaurant'}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-coupon">
              <Plus className="h-4 w-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
              <DialogDescription>
                Create a promotional coupon for customers
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code</FormLabel>
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

                {/* Coupon Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Name (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Summer Sale Discount" 
                          data-testid="input-coupon-name"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Display name shown to customers
                      </FormDescription>
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
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Get 15% off your order" 
                          data-testid="input-coupon-description"
                          {...field}
                        />
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
                          <FormLabel>Coupon Name (French)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Rabais d'été" 
                              data-testid="input-coupon-name-fr"
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
                              placeholder="Obtenez 15% de rabais sur votre commande" 
                              data-testid="input-coupon-description-fr"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CollapsibleContent>
                </Collapsible>

                <FormField
                  control={form.control}
                  name="discount_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value)
                        if (value === "tiered" && discountTiers.length === 0) {
                          addTier()
                        }
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-discount-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                          <SelectItem value="tiered">
                            <span className="flex items-center gap-2">
                              <Layers className="h-4 w-4" />
                              Tiered (spend more, save more)
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {discountType === "tiered" 
                          ? "Set different discounts based on order value" 
                          : "Apply a single discount to the order"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {discountType !== "tiered" && (
                  <FormField
                    control={form.control}
                    name="discount_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="10" 
                            data-testid="input-discount-amount"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          {discountType === "percentage" ? "Percentage off" : "Dollar amount off"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {discountType === "tiered" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Discount Tiers
                      </label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addTier}
                        data-testid="button-add-tier"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Tier
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {discountTiers.map((tier, index) => (
                        <div 
                          key={index} 
                          className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                          data-testid={`tier-row-${index}`}
                        >
                          <div className="flex-1 grid grid-cols-4 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">Min Order $</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={tier.threshold_amount}
                                onChange={(e) => updateTier(index, "threshold_amount", parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                data-testid={`input-tier-threshold-${index}`}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Type</label>
                              <Select
                                value={tier.discount_type}
                                onValueChange={(value: "percentage" | "fixed") => updateTier(index, "discount_type", value)}
                              >
                                <SelectTrigger data-testid={`select-tier-type-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percentage">%</SelectItem>
                                  <SelectItem value="fixed">$</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Value</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={tier.discount_value}
                                onChange={(e) => updateTier(index, "discount_value", parseFloat(e.target.value) || 0)}
                                placeholder="10"
                                data-testid={`input-tier-value-${index}`}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTier(index)}
                                disabled={discountTiers.length <= 1}
                                data-testid={`button-remove-tier-${index}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {discountTiers.length > 0 && (
                      <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                        <strong>Preview:</strong>{" "}
                        {discountTiers
                          .sort((a, b) => a.threshold_amount - b.threshold_amount)
                          .map((tier, idx) => (
                            <span key={idx}>
                              {idx > 0 && " • "}
                              Spend ${tier.threshold_amount}+ = {tier.discount_type === "percentage" ? `${tier.discount_value}% off` : `$${tier.discount_value} off`}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minimum_purchase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Order Value (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="25.00" 
                            data-testid="input-min-order"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_redemptions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Uses (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100" 
                            data-testid="input-max-uses"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum total times this coupon can be used
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
                        <FormLabel>Per Customer (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1" 
                            data-testid="input-max-uses-per-customer"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Max uses per customer
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="valid_until_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          data-testid="input-expires-at"
                          className="relative z-50"
                          {...field}
                          value={field.value ? field.value.split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? `${e.target.value}T23:59:59Z` : '')}
                        />
                      </FormControl>
                      <FormDescription>
                        Coupon will expire at the end of this day
                      </FormDescription>
                      <FormMessage />
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
                  <Button 
                    type="submit" 
                    disabled={createCoupon.isPending}
                    data-testid="button-submit-coupon"
                  >
                    {createCoupon.isPending ? "Creating..." : "Create Coupon"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by coupon code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-coupons"
            />
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Coupons</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `Showing ${filteredCoupons.length} coupons`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Tag className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No coupons found</p>
              <p className="text-sm text-muted-foreground">Create your first coupon to get started</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Min Order</TableHead>
                    <TableHead>Max Uses</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Scope</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoupons.map((coupon: any) => {
                    // Database uses: discount_amount, minimum_purchase, max_redemptions, valid_until_at
                    // Also check legacy names for backwards compatibility
                    const discountValue = coupon.discount_amount ?? coupon.redeem_value_limit ?? coupon.discount_value
                    const minOrder = coupon.minimum_purchase ?? coupon.min_order_value
                    const maxUses = coupon.max_redemptions ?? coupon.usage_limit ?? coupon.max_uses
                    const maxPerCustomer = coupon.max_uses_per_customer
                    const expiresAt = coupon.valid_until_at ?? coupon.expires_at
                    const isTiered = coupon.discount_type === "tiered"
                    const tiers = coupon.discount_tiers || []
                    
                    // Format usage limits display
                    const usageLimitDisplay = () => {
                      if (!maxUses && !maxPerCustomer) return "Unlimited"
                      const parts = []
                      if (maxUses) parts.push(`${maxUses} total`)
                      if (maxPerCustomer) parts.push(`${maxPerCustomer}/customer`)
                      return parts.join(", ")
                    }
                    
                    // Format tiered discount display
                    const tieredDisplay = () => {
                      if (!isTiered || tiers.length === 0) return null
                      const sortedTiers = [...tiers].sort((a: any, b: any) => a.threshold_amount - b.threshold_amount)
                      return sortedTiers.map((t: any, i: number) => (
                        <span key={i} className="block text-xs">
                          ${t.threshold_amount}+: {t.discount_type === 'percentage' ? `${t.discount_value}%` : `$${t.discount_value}`}
                        </span>
                      ))
                    }
                    
                    return (
                      <TableRow key={coupon.id} data-testid={`row-coupon-${coupon.id}`}>
                        <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                        <TableCell>
                          {isTiered ? (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              Tiered
                            </Badge>
                          ) : (
                            <span className="capitalize">{coupon.discount_type}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isTiered ? (
                            <div className="space-y-0.5">
                              {tieredDisplay()}
                            </div>
                          ) : coupon.discount_type === "percentage" || coupon.discount_type === "percent" ? (
                            `${discountValue}%`
                          ) : (
                            formatCurrency(discountValue, 'CAD')
                          )}
                        </TableCell>
                        <TableCell>
                          {minOrder ? formatCurrency(minOrder, 'CAD') : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{usageLimitDisplay()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {expiresAt ? formatDate(expiresAt) : "No expiry"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            Restaurant
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
