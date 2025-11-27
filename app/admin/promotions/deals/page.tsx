"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const dealSchema = z.object({
  name: z.string().min(1, "Name is required"),
  deal_type: z.enum(["bogo", "combo", "happy_hour", "bundle", "limited_time"]),
  description: z.string().optional(),
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
  is_active: z.boolean().default(true),
})

type DealFormValues = z.infer<typeof dealSchema>

const dealTypes = [
  { value: 'bogo', label: 'Buy One Get One', icon: Package, color: 'bg-green-500' },
  { value: 'combo', label: 'Combo Deal', icon: Gift, color: 'bg-purple-500' },
  { value: 'happy_hour', label: 'Happy Hour', icon: Clock, color: 'bg-orange-500' },
  { value: 'bundle', label: 'Bundle Discount', icon: Package, color: 'bg-blue-500' },
  { value: 'limited_time', label: 'Limited Time Offer', icon: Calendar, color: 'bg-red-500' },
]

// Mock data for now - will be replaced with real API
const mockDeals = [
  { 
    id: 1, 
    name: 'Buy 2 Pizzas, Get 1 Free', 
    deal_type: 'bogo', 
    discount_type: 'free_item',
    discount_value: 0,
    description: 'Buy any 2 large pizzas and get a medium pizza free',
    usageCount: 156,
    valid_until: '2024-12-31',
    is_active: true,
  },
  { 
    id: 2, 
    name: 'Family Combo', 
    deal_type: 'combo', 
    discount_type: 'fixed',
    discount_value: 15,
    description: '2 entrees + 2 sides + 4 drinks for $45',
    usageCount: 89,
    valid_until: null,
    is_active: true,
  },
  { 
    id: 3, 
    name: 'Happy Hour Special', 
    deal_type: 'happy_hour', 
    discount_type: 'percentage',
    discount_value: 20,
    description: '20% off appetizers from 3-6pm',
    usageCount: 234,
    valid_until: null,
    is_active: true,
    schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start_time: '15:00', end_time: '18:00' },
  },
  { 
    id: 4, 
    name: 'Winter Warmup', 
    deal_type: 'limited_time', 
    discount_type: 'percentage',
    discount_value: 25,
    description: 'Limited time: 25% off all soups and stews',
    usageCount: 67,
    valid_until: '2024-02-28',
    is_active: false,
  },
]

function DealCard({ deal, onEdit, onDelete }: { deal: any; onEdit: () => void; onDelete: () => void }) {
  const dealType = dealTypes.find(t => t.value === deal.deal_type)
  const Icon = dealType?.icon || Gift

  return (
    <Card className={`transition-all ${!deal.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${dealType?.color || 'bg-gray-500'}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{deal.name}</h3>
                <Badge variant={deal.is_active ? "default" : "secondary"}>
                  {deal.is_active ? "Active" : "Paused"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{deal.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {deal.usageCount} uses
                </span>
                {deal.valid_until && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Until {deal.valid_until}
                  </span>
                )}
                {deal.schedule && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {deal.schedule.start_time} - {deal.schedule.end_time}
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
              <DropdownMenuItem>
                {deal.is_active ? (
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
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      name: "",
      deal_type: "bogo",
      discount_type: "percentage",
      discount_value: 0,
      is_active: true,
    },
  })

  // Filter deals based on search and tab
  const filteredDeals = mockDeals.filter((deal) => {
    const matchesSearch = deal.name.toLowerCase().includes(search.toLowerCase()) ||
      deal.description?.toLowerCase().includes(search.toLowerCase())
    
    if (activeTab === "all") return matchesSearch
    if (activeTab === "active") return matchesSearch && deal.is_active
    if (activeTab === "scheduled") return matchesSearch && deal.schedule
    if (activeTab === "expired") return matchesSearch && !deal.is_active
    return matchesSearch && deal.deal_type === activeTab
  })

  const onSubmit = async (data: DealFormValues) => {
    try {
      // TODO: Replace with real API call
      console.log("Creating deal:", data)
      toast({
        title: "Success",
        description: "Deal created successfully",
      })
      setIsDialogOpen(false)
      form.reset()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create deal",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
              <DialogDescription>
                Set up a new promotional deal for your restaurant
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
                        <Input placeholder="e.g., Buy 2 Get 1 Free" {...field} />
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
                        <Input placeholder="Describe the deal for customers" {...field} />
                      </FormControl>
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
                    Create Deal
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
          filteredDeals.map((deal) => (
            <DealCard 
              key={deal.id} 
              deal={deal}
              onEdit={() => console.log("Edit", deal.id)}
              onDelete={() => console.log("Delete", deal.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

