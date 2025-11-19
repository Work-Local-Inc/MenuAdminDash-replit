"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Loader2, MapPin, Info } from "lucide-react"

const formSchema = z.object({
  zone_name: z.string().optional(),
  center_latitude: z.number().optional(),
  center_longitude: z.number().optional(),
  radius_meters: z.number().min(500).max(50000).optional(),
  delivery_fee_cents: z.number().min(0).default(299),
  minimum_order_cents: z.number().min(0).default(1500),
  estimated_delivery_minutes: z.number().optional(),
})

interface Step7Props {
  restaurantId: number | null
  onComplete: () => void
}

export function Step7Delivery({ restaurantId, onComplete }: Step7Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [useAutoPrepopulation, setUseAutoPrepopulation] = useState(true)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      zone_name: "",
      center_latitude: undefined,
      center_longitude: undefined,
      radius_meters: 5000,
      delivery_fee_cents: 299,
      minimum_order_cents: 1500,
      estimated_delivery_minutes: undefined,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "Restaurant ID is missing. Please complete previous steps first.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/onboarding/create-delivery-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          ...values,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create delivery zone')
      }

      const data = await res.json()

      toast({
        title: "Success",
        description: `Delivery zone created successfully (${data.area_sq_km || 0} km²)`,
      })

      onComplete()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAutoPrepopulation() {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "Restaurant ID is missing. Please complete previous steps first.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/onboarding/create-delivery-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          delivery_fee_cents: 299,
          minimum_order_cents: 1500,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create delivery zone')
      }

      const data = await res.json()

      toast({
        title: "Success",
        description: `Delivery zone created successfully using smart defaults (${data.area_sq_km || 0} km²)`,
      })

      onComplete()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Smart Defaults:</strong> The system will auto-populate the delivery zone center point and radius based on your restaurant location (from Step 2). You can use the quick setup or customize the zone manually.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4">
        <Button
          onClick={handleAutoPrepopulation}
          disabled={isLoading}
          variant="default"
          className="w-full h-20"
          data-testid="button-auto-prepopulation"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <MapPin className="mr-2 h-5 w-5" />
          )}
          <div className="text-left">
            <div className="font-semibold">Quick Setup (Recommended)</div>
            <div className="text-sm font-normal opacity-90">
              Auto-generate zone using restaurant location with standard fees
            </div>
          </div>
        </Button>

        <Button
          onClick={() => setUseAutoPrepopulation(false)}
          variant="outline"
          className="w-full"
          data-testid="button-manual-setup"
        >
          Customize Manually
        </Button>
      </div>

      {!useAutoPrepopulation && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <FormField
              control={form.control}
              name="zone_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zone Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Downtown Core" {...field} data-testid="input-zone-name" />
                  </FormControl>
                  <FormDescription>
                    Leave empty for auto-generated name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="center_latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Center Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="45.4215"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-zone-lat"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="center_longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Center Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="-75.6972"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-zone-lng"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="radius_meters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Radius (meters)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="5000"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      data-testid="input-radius"
                    />
                  </FormControl>
                  <FormDescription>
                    500 - 50,000 meters (0.5km - 50km)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="delivery_fee_cents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Fee ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="2.99"
                        {...field}
                        onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100))}
                        value={(field.value / 100).toFixed(2)}
                        data-testid="input-delivery-fee"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimum_order_cents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Order ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="15.00"
                        {...field}
                        onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100))}
                        value={(field.value / 100).toFixed(2)}
                        data-testid="input-minimum-order"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full" data-testid="button-submit-delivery-zone">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Delivery Zone & Continue
            </Button>
          </form>
        </Form>
      )}
    </div>
  )
}
