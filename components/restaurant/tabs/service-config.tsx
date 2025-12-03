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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { queryClient } from "@/lib/queryClient"
import { Loader2, Truck, ShoppingBag, Clock } from "lucide-react"
import React from "react"

// Schema matches actual database columns in delivery_and_pickup_configs
const configSchema = z.object({
  has_delivery_enabled: z.boolean(),
  delivery_time_minutes: z.coerce.number().min(0).nullable(),
  delivery_min_order: z.coerce.number().min(0).nullable(),
  takeout_enabled: z.boolean(),
  takeout_time_minutes: z.coerce.number().min(0).nullable(),
  allows_preorders: z.boolean().nullable(),
  is_bilingual: z.boolean().nullable(),
  default_language: z.enum(['en', 'fr', 'es']).nullable(),
  accepts_tips: z.boolean().nullable(),
  requires_phone: z.boolean().nullable(),
  notes: z.string().nullable(),
})

type ConfigFormValues = z.infer<typeof configSchema>

interface ServiceConfig {
  id: number
  uuid: string
  restaurant_id: number
  has_delivery_enabled: boolean
  delivery_time_minutes: number | null
  delivery_min_order: number | null
  takeout_enabled: boolean
  takeout_time_minutes: number | null
  allows_preorders: boolean | null
  is_bilingual: boolean | null
  default_language: 'en' | 'fr' | 'es' | null
  accepts_tips: boolean | null
  requires_phone: boolean | null
  notes: string | null
  created_at: string
  created_by: number | null
  updated_at: string | null
  updated_by: number | null
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
      delivery_time_minutes: null,
      delivery_min_order: null,
      takeout_enabled: false,
      takeout_time_minutes: null,
      allows_preorders: null,
      is_bilingual: null,
      default_language: null,
      accepts_tips: null,
      requires_phone: null,
      notes: null,
    },
  })

  React.useEffect(() => {
    if (config) {
      form.reset({
        has_delivery_enabled: config.has_delivery_enabled ?? false,
        delivery_time_minutes: config.delivery_time_minutes,
        delivery_min_order: config.delivery_min_order,
        takeout_enabled: config.takeout_enabled ?? false,
        takeout_time_minutes: config.takeout_time_minutes,
        allows_preorders: config.allows_preorders,
        is_bilingual: config.is_bilingual,
        default_language: config.default_language,
        accepts_tips: config.accepts_tips,
        requires_phone: config.requires_phone,
        notes: config.notes,
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
  const takeoutEnabled = form.watch('takeout_enabled')
  const isBilingual = form.watch('is_bilingual')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              <CardTitle>Delivery Service</CardTitle>
            </div>
            <CardDescription>Configure delivery options and requirements</CardDescription>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="delivery_time_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Time (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="30"
                          {...field}
                          value={field.value ?? ''}
                          data-testid="input-delivery-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="delivery_min_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Order ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="15.00"
                          {...field}
                          value={field.value ?? ''}
                          data-testid="input-delivery-min-order"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <CardTitle>Takeout Service</CardTitle>
            </div>
            <CardDescription>Configure pickup options and discounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="takeout_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Takeout</FormLabel>
                    <FormDescription>Allow customers to order for pickup</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-takeout-enabled"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {takeoutEnabled && (
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
              <Clock className="h-5 w-5" />
              <CardTitle>Advanced Options</CardTitle>
            </div>
            <CardDescription>Pre-orders, language, and customer requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="allows_preorders"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Allow Pre-orders</FormLabel>
                    <FormDescription>Enable customers to schedule future orders</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      data-testid="switch-preorders"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="is_bilingual"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Bilingual Support</FormLabel>
                    <FormDescription>Offer multiple language options</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      data-testid="switch-bilingual"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isBilingual && (
              <FormField
                control={form.control}
                name="default_language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Language</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-default-language">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Separator />

            <FormField
              control={form.control}
              name="accepts_tips"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Accept Tips</FormLabel>
                    <FormDescription>Allow customers to add tips to orders</FormDescription>
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
              name="requires_phone"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Require Phone Number</FormLabel>
                    <FormDescription>Make phone number mandatory for orders</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      data-testid="switch-require-phone"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any internal notes about service configuration..."
                      {...field}
                      value={field.value ?? ''}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormDescription>These notes are for internal use only</FormDescription>
                  <FormMessage />
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
