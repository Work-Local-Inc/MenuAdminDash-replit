"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  timezone: z.string().optional().default("America/Toronto"),
  is_franchise_parent: z.boolean().optional().default(false),
  franchise_brand_name: z.string().optional(),
  parent_restaurant_id: z.number().optional(),
})

interface Step1Props {
  onComplete: (data: any) => void
}

export function Step1BasicInfo({ onComplete }: Step1Props) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      timezone: "America/Toronto",
      is_franchise_parent: false,
    },
  })

  const isFranchiseParent = form.watch("is_franchise_parent")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/onboarding/create-restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create restaurant')
      }

      const data = await res.json()
      
      toast({
        title: "Success",
        description: `Restaurant "${data.name}" created successfully`,
      })

      onComplete(data)
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Restaurant Name</FormLabel>
              <FormControl>
                <Input placeholder="Milano's Pizza - Downtown" {...field} data-testid="input-restaurant-name" />
              </FormControl>
              <FormDescription>
                The name that will appear on the platform
              </FormDescription>
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
                Operating timezone for the restaurant
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_franchise_parent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-franchise-parent"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  This is a franchise parent location
                </FormLabel>
                <FormDescription>
                  Enable this if this restaurant will have multiple franchise locations
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {isFranchiseParent && (
          <FormField
            control={form.control}
            name="franchise_brand_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Franchise Brand Name</FormLabel>
                <FormControl>
                  <Input placeholder="Milano's Pizza" {...field} data-testid="input-franchise-brand" />
                </FormControl>
                <FormDescription>
                  The brand name for this franchise chain
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={isLoading} className="w-full" data-testid="button-submit-basic-info">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Restaurant & Continue
        </Button>
      </form>
    </Form>
  )
}
