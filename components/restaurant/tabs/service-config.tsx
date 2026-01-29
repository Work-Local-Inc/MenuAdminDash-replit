"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Loader2, Truck, ShoppingBag, Clock, DollarSign, Phone, Zap, TrendingUp } from "lucide-react"
import React from "react"
import { PeakHour } from "@/types/supabase-database"

const configSchema = z.object({
  has_delivery_enabled: z.boolean(),
  pickup_enabled: z.boolean(),
  distance_based_delivery_fee: z.boolean(),
  takeout_time_minutes: z.coerce.number().min(0).nullable(),
  busy_takeout_time_minutes: z.coerce.number().min(0).nullable(),
  busy_mode_enabled: z.boolean(),
  twilio_call: z.boolean().nullable(),
  accepts_tips: z.boolean().nullable(),
  payment_mode: z.enum(['test', 'live']).nullable(),
})

type ConfigFormValues = z.infer<typeof configSchema>

interface ServiceConfig {
  id: number
  uuid: string
  restaurant_id: number
  has_delivery_enabled: boolean
  pickup_enabled: boolean
  distance_based_delivery_fee: boolean
  takeout_time_minutes: number | null
  busy_takeout_time_minutes: number | null
  busy_mode_enabled: boolean
  peak_hours: PeakHour[] | null
  twilio_call: boolean | null
  accepts_tips: boolean | null
  payment_mode: 'test' | 'live' | null
  created_at: string
  updated_at: string | null
}

interface PeakHoursAnalysis {
  peak_hours: PeakHour[]
  order_count: number
  average_per_slot: number
  peak_threshold: number
  message?: string
  timezone?: string
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatPeakHour(peak: PeakHour): string {
  const day = DAY_NAMES[peak.day]
  const startTime = peak.start > 12 ? `${peak.start - 12}pm` : peak.start === 12 ? '12pm' : `${peak.start}am`
  const endTime = peak.end > 12 ? `${peak.end - 12}pm` : peak.end === 12 ? '12pm' : `${peak.end}am`
  return `${day} ${startTime}-${endTime}`
}

interface RestaurantServiceConfigProps {
  restaurantId: string
}

export function RestaurantServiceConfig({ restaurantId }: RestaurantServiceConfigProps) {
  const { toast } = useToast()

  const { data: config, isLoading } = useQuery<ServiceConfig | null>({
    queryKey: ['/api/restaurants', restaurantId, 'service-config'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/service-config`)
      if (!res.ok) throw new Error('Failed to fetch service config')
      const data = await res.json()
      return data
    },
  })

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      has_delivery_enabled: false,
      pickup_enabled: false,
      distance_based_delivery_fee: false,
      takeout_time_minutes: null,
      busy_takeout_time_minutes: null,
      busy_mode_enabled: false,
      twilio_call: null,
      accepts_tips: null,
      payment_mode: 'test',
    },
  })

  const { data: peakHoursData, refetch: refetchPeakHours, isFetching: isFetchingPeakHours } = useQuery<PeakHoursAnalysis>({
    queryKey: ['/api/restaurants', restaurantId, 'peak-hours'],
    enabled: false,
  })

  const savePeakHours = useMutation({
    mutationFn: async (peakHours: PeakHour[]) => {
      return apiRequest(`/api/restaurants/${restaurantId}/peak-hours`, {
        method: 'POST',
        body: JSON.stringify({ peak_hours: peakHours }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'service-config'] })
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'peak-hours'] })
      toast({ title: "Success", description: "Peak hours saved successfully" })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const handleAnalyzePeakHours = async () => {
    const result = await refetchPeakHours()
    if (result.data?.peak_hours && result.data.peak_hours.length > 0) {
      savePeakHours.mutate(result.data.peak_hours)
    } else if (result.data?.message) {
      toast({ title: "Info", description: result.data.message })
    }
  }

  React.useEffect(() => {
    if (config) {
      form.reset({
        has_delivery_enabled: config.has_delivery_enabled ?? false,
        pickup_enabled: config.pickup_enabled ?? false,
        distance_based_delivery_fee: config.distance_based_delivery_fee ?? false,
        takeout_time_minutes: config.takeout_time_minutes,
        busy_takeout_time_minutes: config.busy_takeout_time_minutes,
        busy_mode_enabled: config.busy_mode_enabled ?? false,
        twilio_call: config.twilio_call,
        accepts_tips: config.accepts_tips,
        payment_mode: config.payment_mode ?? 'test',
      })
    }
  }, [config, form])

  const updateConfig = useMutation({
    mutationFn: async (data: ConfigFormValues) => {
      const method = config ? 'PATCH' : 'POST'
      const url = config 
        ? `/api/restaurants/${restaurantId}/service-config/${config.id}`
        : `/api/restaurants/${restaurantId}/service-config`
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'service-config'] })
      toast({ title: "Success", description: "Service configuration updated successfully" })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const onSubmit = (data: ConfigFormValues) => {
    updateConfig.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const deliveryEnabled = form.watch('has_delivery_enabled')
  const pickupEnabled = form.watch('pickup_enabled')
  const busyModeEnabled = form.watch('busy_mode_enabled')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              <CardTitle>Delivery Service</CardTitle>
            </div>
            <CardDescription>Configure delivery options for this restaurant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="has_delivery_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Delivery</FormLabel>
                    <FormDescription>Allow customers to order for delivery</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-delivery-enabled"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {deliveryEnabled && (
              <FormField
                control={form.control}
                name="distance_based_delivery_fee"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Distance-Based Delivery Fee</FormLabel>
                      <FormDescription>
                        Calculate delivery fee based on distance tiers instead of flat delivery area fees
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-distance-based-fee"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <CardTitle>Pickup Service</CardTitle>
            </div>
            <CardDescription>Configure pickup options and preparation time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="pickup_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Pickup</FormLabel>
                    <FormDescription>Allow customers to order for pickup</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-pickup-enabled"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {pickupEnabled && (
              <FormField
                control={form.control}
                name="takeout_time_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preparation Time (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="15"
                        {...field}
                        value={field.value ?? ''}
                        data-testid="input-takeout-time"
                      />
                    </FormControl>
                    <FormDescription>
                      Average time to prepare orders for pickup
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <CardTitle>Smart Busy Mode</CardTitle>
            </div>
            <CardDescription>
              Automatically extend prep time during rush hours based on order history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="busy_mode_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Smart Busy Mode</FormLabel>
                    <FormDescription>
                      Use longer prep time during detected peak hours
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-busy-mode"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {busyModeEnabled && (
              <>
                <FormField
                  control={form.control}
                  name="busy_takeout_time_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Busy Period Prep Time (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="45"
                          {...field}
                          value={field.value ?? ''}
                          data-testid="input-busy-takeout-time"
                        />
                      </FormControl>
                      <FormDescription>
                        Prep time shown to customers during busy hours (should be higher than normal prep time)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Detected Peak Hours</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAnalyzePeakHours}
                      disabled={isFetchingPeakHours || savePeakHours.isPending}
                      data-testid="button-analyze-peak-hours"
                    >
                      {(isFetchingPeakHours || savePeakHours.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Analyze Order History
                    </Button>
                  </div>
                  
                  {config?.peak_hours && config.peak_hours.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {config.peak_hours.map((peak, idx) => (
                        <Badge key={idx} variant="secondary" data-testid={`badge-peak-hour-${idx}`}>
                          {formatPeakHour(peak)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No peak hours detected yet. Click "Analyze Order History" to detect busy periods from past orders.
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Additional Options</CardTitle>
            </div>
            <CardDescription>Tips, notifications, and order settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="accepts_tips"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5 flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <FormLabel>Accept Tips</FormLabel>
                      <FormDescription>Allow customers to add tips to orders</FormDescription>
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      data-testid="switch-tips"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="twilio_call"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5 flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <FormLabel>Twilio Phone Calls</FormLabel>
                      <FormDescription>Enable automated phone call notifications for new orders</FormDescription>
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      data-testid="switch-twilio-call"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={updateConfig.isPending}
            data-testid="button-save-config"
          >
            {updateConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </div>
      </form>
    </Form>
  )
}
