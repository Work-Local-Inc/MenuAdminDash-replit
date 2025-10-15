"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useCoupons, useCreateCoupon } from "@/lib/hooks/use-coupons"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Search, Tag } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"

const couponSchema = z.object({
  code: z.string().min(1, "Code is required"),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.coerce.number().positive("Must be greater than 0"),
  min_order_value: z.coerce.number().optional(),
  max_uses: z.coerce.number().int().positive().optional(),
  expires_at: z.string().optional(),
  is_global: z.boolean().default(true),
})

type CouponFormValues = z.infer<typeof couponSchema>

export default function CouponsPage() {
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { data: coupons = [], isLoading } = useCoupons()
  const createCoupon = useCreateCoupon()
  const { toast } = useToast()

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      discount_type: "percentage",
      discount_value: 0,
      is_global: true,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground">Manage promotional coupons and discounts</p>
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
                    name="discount_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="10" 
                            data-testid="input-discount-value"
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
                    name="min_order_value"
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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_uses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Uses (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100" 
                            data-testid="input-max-uses"
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
                  name="expires_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          data-testid="input-expires-at"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_global"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Global Coupon</FormLabel>
                        <FormDescription>
                          Available for all restaurants
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-is-global"
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
                  {filteredCoupons.map((coupon: any) => (
                    <TableRow key={coupon.id} data-testid={`row-coupon-${coupon.id}`}>
                      <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                      <TableCell className="capitalize">{coupon.discount_type}</TableCell>
                      <TableCell>
                        {coupon.discount_type === "percentage" 
                          ? `${coupon.discount_value}%` 
                          : formatCurrency(coupon.discount_value, 'CAD')
                        }
                      </TableCell>
                      <TableCell>
                        {coupon.min_order_value ? formatCurrency(coupon.min_order_value, 'CAD') : "—"}
                      </TableCell>
                      <TableCell>{coupon.max_uses || "Unlimited"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {coupon.expires_at ? formatDate(coupon.expires_at) : "No expiry"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={coupon.is_global ? "default" : "secondary"}>
                          {coupon.is_global ? "Global" : "Restaurant"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
