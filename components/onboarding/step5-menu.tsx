"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Copy } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be positive"),
  category: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  ingredients: z.string().optional(),
})

const copyMenuSchema = z.object({
  source_restaurant_id: z.number(),
})

interface Step5Props {
  restaurantId: number | null
  onComplete: () => void
}

export function Step5Menu({ restaurantId, onComplete }: Step5Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("manual")
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      category: "",
      image_url: "",
      ingredients: "",
    },
  })

  const copyForm = useForm<z.infer<typeof copyMenuSchema>>({
    resolver: zodResolver(copyMenuSchema),
  })

  async function onSubmitManual(values: z.infer<typeof formSchema>) {
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
      const res = await fetch('/api/onboarding/add-menu-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          ...values,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add menu item')
      }

      const data = await res.json()

      toast({
        title: "Success",
        description: `Menu item "${values.name}" added successfully`,
      })

      // If this is the first item, mark step as complete
      if (data.is_first_item || data[0]?.is_first_item) {
        onComplete()
      } else {
        // Reset form for adding more items
        form.reset()
      }
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

  async function onSubmitCopy(values: z.infer<typeof copyMenuSchema>) {
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
      const res = await fetch('/api/onboarding/copy-franchise-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_restaurant_id: restaurantId,
          source_restaurant_id: values.source_restaurant_id,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to copy menu')
      }

      const data = await res.json()

      toast({
        title: "Success",
        description: `Copied ${data.items_copied || 0} menu items successfully`,
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
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="manual">Add Manually</TabsTrigger>
        <TabsTrigger value="copy">Copy from Franchise</TabsTrigger>
      </TabsList>

      <TabsContent value="manual" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Add Menu Item</CardTitle>
            <CardDescription>
              Add your first menu item to continue. You can add more items later in the restaurant settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitManual)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Margherita Pizza" {...field} data-testid="input-item-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Fresh mozzarella, tomatoes, and basil on our homemade dough"
                          {...field}
                          data-testid="input-item-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="14.99"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-item-price"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Pizza" {...field} data-testid="input-item-category" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full" data-testid="button-submit-menu-item">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Plus className="mr-2 h-4 w-4" />
                  Add Menu Item & Continue
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="copy" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Copy Franchise Menu</CardTitle>
            <CardDescription>
              Copy all menu items from your franchise parent restaurant. This provides a starting point that you can customize.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...copyForm}>
              <form onSubmit={copyForm.handleSubmit(onSubmitCopy)} className="space-y-6">
                <FormField
                  control={copyForm.control}
                  name="source_restaurant_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Restaurant ID</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter parent restaurant ID"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-source-restaurant-id"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the restaurant ID of your franchise parent to copy their menu
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isLoading} className="w-full" data-testid="button-copy-menu">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Menu & Continue
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
