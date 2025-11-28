"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Building2, Store, TrendingUp, ChevronRight, DollarSign, Users, ShoppingCart } from "lucide-react"

const createParentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  franchise_brand_name: z.string().min(2, "Brand name must be at least 2 characters").max(255),
  timezone: z.string().optional(),
})

const linkChildSchema = z.object({
  parent_restaurant_id: z.number().int().positive(),
  restaurant_id: z.number().int().positive(),
})

type CreateParentFormValues = z.infer<typeof createParentSchema>
type LinkChildFormValues = z.infer<typeof linkChildSchema>

export function FranchiseManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [selectedFranchise, setSelectedFranchise] = useState<any>(null)
  const { toast } = useToast()

  // Fetch all franchise chains
  const { data: chains = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/franchise/chains'],
  })

  // Fetch franchise details when one is selected
  const { data: franchiseDetails } = useQuery<any>({
    queryKey: ['/api/franchise', selectedFranchise?.chain_id],
    enabled: !!selectedFranchise,
  })

  // Fetch franchise analytics
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery<any>({
    queryKey: ['/api/franchise', selectedFranchise?.chain_id, 'analytics'],
    enabled: !!selectedFranchise,
  })

  const createForm = useForm<CreateParentFormValues>({
    resolver: zodResolver(createParentSchema) as any,
    defaultValues: {
      name: "",
      franchise_brand_name: "",
      timezone: undefined,
    },
  })

  const linkForm = useForm<LinkChildFormValues>({
    resolver: zodResolver(linkChildSchema) as any,
    defaultValues: {
      parent_restaurant_id: 0,
      restaurant_id: 0,
    },
  })

  // Create franchise parent mutation
  const createParent = useMutation({
    mutationFn: async (data: CreateParentFormValues) => {
      const res = await fetch('/api/franchise/create-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          timezone: data.timezone || 'America/Toronto'
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create franchise parent')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/franchise/chains'] })
      toast({ title: "Success", description: "Franchise parent created successfully" })
      setIsCreateDialogOpen(false)
      createForm.reset()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  // Link restaurant to franchise mutation
  const linkChild = useMutation({
    mutationFn: async (data: LinkChildFormValues) => {
      const res = await fetch('/api/franchise/link-children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to link restaurant to franchise')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/franchise/chains'] })
      if (selectedFranchise) {
        queryClient.invalidateQueries({ queryKey: ['/api/franchise', selectedFranchise.chain_id] })
        queryClient.invalidateQueries({ queryKey: ['/api/franchise', selectedFranchise.chain_id, 'analytics'] })
      }
      toast({ title: "Success", description: "Restaurant linked to franchise successfully" })
      setIsLinkDialogOpen(false)
      linkForm.reset()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const handleCreateSubmit = (data: CreateParentFormValues) => {
    createParent.mutate(data)
  }

  const handleLinkSubmit = (data: LinkChildFormValues) => {
    linkChild.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Franchise Management</h2>
          <p className="text-muted-foreground">Manage franchise chains and their locations</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-franchise">
              <Plus className="h-4 w-4 mr-2" />
              Create Franchise Parent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Franchise Parent</DialogTitle>
              <DialogDescription>
                Create a new franchise brand that can have multiple locations
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restaurant Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Milano Pizza - Corporate" data-testid="input-franchise-name" />
                      </FormControl>
                      <FormDescription>The name of the parent/corporate restaurant</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="franchise_brand_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Milano Pizza" data-testid="input-brand-name" />
                      </FormControl>
                      <FormDescription>The franchise brand name</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-timezone">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="America/Toronto">America/Toronto (ET)</SelectItem>
                          <SelectItem value="America/Vancouver">America/Vancouver (PT)</SelectItem>
                          <SelectItem value="America/Edmonton">America/Edmonton (MT)</SelectItem>
                          <SelectItem value="America/Winnipeg">America/Winnipeg (CT)</SelectItem>
                          <SelectItem value="America/Halifax">America/Halifax (AT)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createParent.isPending} data-testid="button-submit-franchise">
                    {createParent.isPending ? 'Creating...' : 'Create Franchise Parent'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Franchise Chains Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {chains.map((chain: any) => (
          <Card
            key={chain.chain_id}
            className="hover-elevate cursor-pointer"
            onClick={() => setSelectedFranchise(chain)}
            data-testid={`card-franchise-${chain.chain_id}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <Building2 className="h-8 w-8 text-primary" />
                <Badge variant="secondary" data-testid={`text-location-count-${chain.chain_id}`}>
                  {chain.location_count} {chain.location_count === 1 ? 'location' : 'locations'}
                </Badge>
              </div>
              <CardTitle className="mt-4" data-testid={`text-brand-name-${chain.chain_id}`}>
                {chain.brand_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Active Locations</span>
                  <span className="font-medium text-foreground" data-testid={`text-active-count-${chain.chain_id}`}>
                    {chain.active_count || 0}
                  </span>
                </div>
                {chain.total_cities > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Cities</span>
                    <span className="font-medium text-foreground">{chain.total_cities}</span>
                  </div>
                )}
                {chain.total_provinces > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Provinces</span>
                    <span className="font-medium text-foreground">{chain.total_provinces}</span>
                  </div>
                )}
              </div>
              <Button variant="ghost" className="w-full mt-4" data-testid={`button-view-details-${chain.chain_id}`}>
                View Details
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {chains.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No franchise chains yet</h3>
            <p className="text-muted-foreground mb-4">Create your first franchise parent to get started</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-franchise">
              <Plus className="h-4 w-4 mr-2" />
              Create Franchise Parent
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Selected Franchise Details Dialog */}
      {selectedFranchise && (
        <Dialog open={!!selectedFranchise} onOpenChange={() => setSelectedFranchise(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedFranchise.brand_name}</DialogTitle>
              <DialogDescription>
                {franchiseDetails?.summary?.total_locations || 0} locations across{' '}
                {franchiseDetails?.summary?.total_provinces || 0} provinces
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Summary Stats */}
                {franchiseDetails?.summary && (
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{franchiseDetails.summary.total_locations}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {franchiseDetails.summary.active_count}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Suspended</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                          {franchiseDetails.summary.suspended_count}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {franchiseDetails.summary.pending_count}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Children Locations Table */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Franchise Locations</CardTitle>
                      <Button
                        size="sm"
                        onClick={() => {
                          linkForm.setValue('parent_restaurant_id', selectedFranchise.chain_id)
                          setIsLinkDialogOpen(true)
                        }}
                        data-testid="button-link-restaurant"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Link Restaurant
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {franchiseDetails?.children && franchiseDetails.children.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead>Province</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Online Ordering</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {franchiseDetails.children.map((child: any) => (
                            <TableRow key={child.child_id} data-testid={`row-location-${child.child_id}`}>
                              <TableCell className="font-medium">{child.child_name}</TableCell>
                              <TableCell>{child.city || '-'}</TableCell>
                              <TableCell>{child.province || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={child.status === 'active' ? 'default' : 'secondary'}>
                                  {child.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {child.online_ordering_enabled ? (
                                  <Badge variant="default">Enabled</Badge>
                                ) : (
                                  <Badge variant="secondary">Disabled</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No locations linked to this franchise yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                {isLoadingAnalytics ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : analyticsData?.analytics ? (
                  <>
                    {/* Performance Metrics */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            ${analyticsData.analytics.total_revenue?.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </div>
                          <p className="text-xs text-muted-foreground">Last 30 days</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{analyticsData.analytics.total_orders?.toLocaleString() || 0}</div>
                          <p className="text-xs text-muted-foreground">Last 30 days</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            ${analyticsData.analytics.avg_order_value?.toFixed(2) || '0.00'}
                          </div>
                          <p className="text-xs text-muted-foreground">Per order</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Top and Bottom Performers */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="text-lg font-bold">{analyticsData.analytics.top_location_name || 'N/A'}</div>
                          <div className="text-2xl font-bold text-green-600">
                            ${analyticsData.analytics.top_location_revenue?.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Bottom Performer</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="text-lg font-bold">{analyticsData.analytics.bottom_location_name || 'N/A'}</div>
                          <div className="text-2xl font-bold text-yellow-600">
                            ${analyticsData.analytics.bottom_location_revenue?.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Location Performance Rankings */}
                    {analyticsData?.comparison && analyticsData.comparison.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Location Performance Rankings</CardTitle>
                          <CardDescription>Ranked by revenue (last 30 days)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Rank</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead className="text-right">Orders</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Avg Order</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {analyticsData.comparison.slice(0, 10).map((location: any) => (
                                <TableRow key={location.location_id}>
                                  <TableCell className="font-medium">#{location.performance_rank}</TableCell>
                                  <TableCell>{location.location_name}</TableCell>
                                  <TableCell>{location.location_city || '-'}</TableCell>
                                  <TableCell className="text-right">{location.order_count?.toLocaleString() || 0}</TableCell>
                                  <TableCell className="text-right">
                                    ${location.revenue?.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    ${location.avg_order_value?.toFixed(2) || '0.00'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}

                    {/* Menu Standardization */}
                    {analyticsData?.menuCoverage && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Menu Standardization</CardTitle>
                          <CardDescription>Menu consistency across franchise locations</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-3">
                            <div>
                              <div className="text-sm text-muted-foreground">Standardization Score</div>
                              <div className="text-3xl font-bold">
                                {analyticsData.menuCoverage.standardization_score?.toFixed(1) || 0}%
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Full Menu Locations</div>
                              <div className="text-3xl font-bold text-green-600">
                                {analyticsData.menuCoverage.locations_with_full_menu || 0}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Missing Items</div>
                              <div className="text-3xl font-bold text-yellow-600">
                                {analyticsData.menuCoverage.locations_missing_items || 0}
                              </div>
                            </div>
                          </div>
                          <div className="grid gap-2 md:grid-cols-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Parent Dishes</span>
                              <span className="font-medium">{analyticsData.menuCoverage.parent_dish_count || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg Dishes</span>
                              <span className="font-medium">{analyticsData.menuCoverage.avg_dish_count?.toFixed(1) || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Range</span>
                              <span className="font-medium">
                                {analyticsData.menuCoverage.min_dish_count || 0} - {analyticsData.menuCoverage.max_dish_count || 0}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No analytics data available</h3>
                      <p className="text-muted-foreground">Analytics data will appear once orders are placed</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Link Restaurant Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Restaurant to Franchise</DialogTitle>
            <DialogDescription>
              Convert an independent restaurant into a franchise location
            </DialogDescription>
          </DialogHeader>
          <Form {...linkForm}>
            <form onSubmit={linkForm.handleSubmit(handleLinkSubmit)} className="space-y-4">
              <FormField
                control={linkForm.control}
                name="restaurant_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restaurant ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        placeholder="Enter restaurant ID"
                        data-testid="input-restaurant-id"
                      />
                    </FormControl>
                    <FormDescription>The ID of the restaurant to link to this franchise</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={linkChild.isPending} data-testid="button-submit-link">
                  {linkChild.isPending ? 'Linking...' : 'Link Restaurant'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
