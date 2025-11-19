"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminRestaurants } from "@/hooks/use-admin-restaurants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

export default function CreateDealPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: authorizedRestaurantIds = [], isLoading: restaurantsLoading } = useAdminRestaurants()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    restaurant_id: "",
    name: "",
    description: "",
    terms_and_conditions: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    minimum_purchase: "",
    date_start: "",
    date_stop: "",
    is_enabled: true,
    availability_types: [] as string[],
    is_first_order_only: false,
    display_order: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.restaurant_id) {
      toast({
        title: "Validation Error",
        description: "Please select a restaurant",
        variant: "destructive",
      })
      return
    }

    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Please enter a deal name",
        variant: "destructive",
      })
      return
    }

    if (!formData.discount_value) {
      toast({
        title: "Validation Error",
        description: "Please enter a discount value",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload: any = {
        restaurant_id: parseInt(formData.restaurant_id),
        name: formData.name,
        description: formData.description || null,
        terms_and_conditions: formData.terms_and_conditions || null,
        minimum_purchase: formData.minimum_purchase ? parseFloat(formData.minimum_purchase) : null,
        date_start: formData.date_start || null,
        date_stop: formData.date_stop || null,
        is_enabled: formData.is_enabled,
        availability_types: formData.availability_types.length > 0 ? formData.availability_types : null,
        is_first_order_only: formData.is_first_order_only,
        display_order: formData.display_order,
      }

      // Set discount based on type
      if (formData.discount_type === "percentage") {
        payload.discount_percent = parseFloat(formData.discount_value)
        payload.discount_amount = null
      } else {
        payload.discount_amount = parseFloat(formData.discount_value)
        payload.discount_percent = null
      }

      const response = await fetch('/api/admin/promotions/deals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create deal')
      }

      toast({
        title: "Success",
        description: "Deal created successfully",
      })

      router.push('/admin/promotions')
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create deal',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleAvailabilityType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      availability_types: prev.availability_types.includes(type)
        ? prev.availability_types.filter(t => t !== type)
        : [...prev.availability_types, type]
    }))
  }

  if (restaurantsLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (authorizedRestaurantIds.length === 0) {
    return (
      <div className="space-y-6">
        <Link href="/admin/promotions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Deals
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to manage any restaurants.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/promotions">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Deals
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Create Promotional Deal</h1>
          <p className="text-muted-foreground">
            Set up a new promotional deal for your restaurant
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Deal name, description, and restaurant assignment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurant_id">Restaurant *</Label>
                  <Select
                    value={formData.restaurant_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, restaurant_id: value }))}
                  >
                    <SelectTrigger id="restaurant_id" data-testid="select-restaurant">
                      <SelectValue placeholder="Select a restaurant" />
                    </SelectTrigger>
                    <SelectContent>
                      {authorizedRestaurantIds.map((id) => (
                        <SelectItem key={id} value={id.toString()}>
                          Restaurant #{id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Deal Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., 20% Off Weekends"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-deal-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe this promotional deal..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    data-testid="input-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms">Terms and Conditions</Label>
                  <Textarea
                    id="terms"
                    placeholder="Any restrictions or special conditions..."
                    value={formData.terms_and_conditions}
                    onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                    rows={3}
                    data-testid="input-terms"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
                <CardDescription>
                  Configure when and how customers can use this deal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Service Types</Label>
                  <div className="space-y-2">
                    {['delivery', 'pickup', 'dine-in'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`availability-${type}`}
                          checked={formData.availability_types.includes(type)}
                          onCheckedChange={() => toggleAvailabilityType(type)}
                          data-testid={`checkbox-${type}`}
                        />
                        <Label 
                          htmlFor={`availability-${type}`}
                          className="text-sm font-normal capitalize cursor-pointer"
                        >
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="first-order">First Order Only</Label>
                    <p className="text-sm text-muted-foreground">
                      Only available to new customers
                    </p>
                  </div>
                  <Switch
                    id="first-order"
                    checked={formData.is_first_order_only}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_first_order_only: checked }))}
                    data-testid="switch-first-order"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enabled">Enable Deal</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this deal active immediately
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={formData.is_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
                    data-testid="switch-enabled"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Discount Configuration</CardTitle>
                <CardDescription>
                  Set the discount amount and minimum purchase requirement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="discount-type">Discount Type *</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: "percentage" | "fixed") => 
                      setFormData(prev => ({ ...prev, discount_type: value, discount_value: "" }))
                    }
                  >
                    <SelectTrigger id="discount-type" data-testid="select-discount-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount-value">Discount Value *</Label>
                  <div className="relative">
                    {formData.discount_type === "percentage" && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        %
                      </span>
                    )}
                    {formData.discount_type === "fixed" && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                    )}
                    <Input
                      id="discount-value"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={formData.discount_type === "percentage" ? "e.g., 20" : "e.g., 10.00"}
                      value={formData.discount_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                      className={formData.discount_type === "fixed" ? "pl-8" : "pr-8"}
                      data-testid="input-discount-value"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum">Minimum Purchase (Optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="minimum"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g., 50.00"
                      value={formData.minimum_purchase}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimum_purchase: e.target.value }))}
                      className="pl-8"
                      data-testid="input-minimum-purchase"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
                <CardDescription>
                  Set start and end dates for this deal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date (Optional)</Label>
                  <Input
                    id="start-date"
                    type="datetime-local"
                    value={formData.date_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_start: e.target.value }))}
                    data-testid="input-start-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date (Optional)</Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={formData.date_stop}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_stop: e.target.value }))}
                    data-testid="input-end-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-order">Display Order</Label>
                  <Input
                    id="display-order"
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    data-testid="input-display-order"
                  />
                  <p className="text-sm text-muted-foreground">
                    Lower numbers appear first
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Link href="/admin/promotions">
            <Button type="button" variant="outline" data-testid="button-cancel">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} data-testid="button-submit">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Deal
          </Button>
        </div>
      </form>
    </div>
  )
}
