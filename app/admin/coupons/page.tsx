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
import { useCoupons, useCreateCoupon } from "@/lib/hooks/use-coupons"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Search, Tag, ArrowLeft, Building2, Store } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"

// Form schema - matches database column names
// NO global option - coupons are ALWAYS location-specific
const couponSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().optional(),
  description: z.string().optional(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_amount: z.coerce.number().positive("Must be greater than 0"),
  minimum_purchase: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
  max_redemptions: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
  valid_until_at: z.string().optional(),
})

type CouponFormValues = {
  code: string
  name?: string
  description?: string
  discount_type: "percentage" | "fixed"
  discount_amount: number
  minimum_purchase?: number | ''
  max_redemptions?: number | ''
  valid_until_at?: string
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
      description: "",
      discount_type: "percentage" as const,
      discount_amount: 0,
      minimum_purchase: undefined,
      max_redemptions: undefined,
      valid_until_at: "",
    },
  })

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
            {loadingRestaurants ? (
              <Skeleton className="h-10 w-full max-w-md" />
            ) : (
              <Select value={selectedRestaurantId} onValueChange={handleRestaurantChange}>
                <SelectTrigger className="w-full max-w-md" data-testid="select-restaurant">
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
                          {form.watch("discount_type") === "percentage" ? "Percentage off" : "Dollar amount off"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                        <FormLabel>Max Uses (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100" 
                            data-testid="input-max-uses"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
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
                    const expiresAt = coupon.valid_until_at ?? coupon.expires_at
                    
                    return (
                      <TableRow key={coupon.id} data-testid={`row-coupon-${coupon.id}`}>
                        <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                        <TableCell className="capitalize">{coupon.discount_type}</TableCell>
                        <TableCell>
                          {coupon.discount_type === "percentage" || coupon.discount_type === "percent"
                            ? `${discountValue}%` 
                            : formatCurrency(discountValue, 'CAD')
                          }
                        </TableCell>
                        <TableCell>
                          {minOrder ? formatCurrency(minOrder, 'CAD') : "—"}
                        </TableCell>
                        <TableCell>{maxUses || "Unlimited"}</TableCell>
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
