"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useEffect } from "react"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUpdateRestaurant } from "@/lib/hooks/use-restaurants"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.enum(["pending", "active", "suspended", "inactive", "closed"]),
  timezone: z.string().min(1, "Timezone is required"),
})

type FormValues = z.infer<typeof formSchema>

interface RestaurantBasicInfoProps {
  restaurant: any
}

export function RestaurantBasicInfo({ restaurant }: RestaurantBasicInfoProps) {
  const { toast } = useToast()
  const updateRestaurant = useUpdateRestaurant()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: restaurant.name || "",
      status: restaurant.status || "pending",
      timezone: restaurant.timezone || "America/Toronto",
    },
  })

  useEffect(() => {
    if (restaurant) {
      form.reset({
        name: restaurant.name || "",
        status: restaurant.status || "pending",
        timezone: restaurant.timezone || "America/Toronto",
      })
    }
  }, [restaurant, form])

  const onSubmit = async (data: FormValues) => {
    try {
      await updateRestaurant.mutateAsync({
        id: restaurant.id,
        data,
      })
      toast({
        title: "Success",
        description: "Restaurant updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update restaurant",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>Update the restaurant's basic details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Restaurant Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter restaurant name" 
                      data-testid="input-restaurant-name"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
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
                      <SelectItem value="America/Toronto">Eastern Time (Toronto)</SelectItem>
                      <SelectItem value="America/Vancouver">Pacific Time (Vancouver)</SelectItem>
                      <SelectItem value="America/Edmonton">Mountain Time (Edmonton)</SelectItem>
                      <SelectItem value="America/Winnipeg">Central Time (Winnipeg)</SelectItem>
                      <SelectItem value="America/Halifax">Atlantic Time (Halifax)</SelectItem>
                      <SelectItem value="America/St_Johns">Newfoundland Time (St. John's)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Used for order timestamps and scheduling
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                data-testid="button-reset"
              >
                Reset
              </Button>
              <Button 
                type="submit" 
                disabled={updateRestaurant.isPending}
                data-testid="button-save"
              >
                {updateRestaurant.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
