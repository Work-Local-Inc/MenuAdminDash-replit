"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Search, Globe } from "lucide-react"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

const seoSchema = z.object({
  meta_title: z.string().max(60, 'Meta title should be 60 characters or less').optional(),
  meta_description: z.string().max(160, 'Meta description should be 160 characters or less').optional(),
  og_title: z.string().max(60, 'OG title should be 60 characters or less').optional(),
  og_description: z.string().max(160, 'OG description should be 160 characters or less').optional(),
  og_image_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  include_in_sitemap: z.boolean().default(true),
})

type SEOFormData = z.infer<typeof seoSchema>

interface RestaurantSEO extends SEOFormData {
  id?: number
  restaurant_id: number
}

interface RestaurantSEOProps {
  restaurantId: string
}

export function RestaurantSEO({ restaurantId }: RestaurantSEOProps) {
  const { toast } = useToast()

  const { data: seoData, isLoading } = useQuery<RestaurantSEO | null>({
    queryKey: ['/api/restaurants', restaurantId, 'seo'],
  })

  const form = useForm<SEOFormData>({
    resolver: zodResolver(seoSchema) as any,
    values: {
      meta_title: seoData?.meta_title || '',
      meta_description: seoData?.meta_description || '',
      og_title: seoData?.og_title || '',
      og_description: seoData?.og_description || '',
      og_image_url: seoData?.og_image_url || '',
      include_in_sitemap: seoData?.include_in_sitemap ?? true,
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: SEOFormData) =>
      apiRequest(`/api/restaurants/${restaurantId}/seo`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'seo'] })
      toast({ title: 'SEO settings saved successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const onSubmit = (data: SEOFormData) => {
    saveMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
          <CardDescription>Optimize your restaurant's search engine presence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const metaTitleLength = form.watch('meta_title')?.length || 0
  const metaDescLength = form.watch('meta_description')?.length || 0
  const ogTitleLength = form.watch('og_title')?.length || 0
  const ogDescLength = form.watch('og_description')?.length || 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          <div>
            <CardTitle>SEO Settings</CardTitle>
            <CardDescription>Optimize your restaurant's search engine presence and social sharing</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Meta Tags</h3>
              <p className="text-sm text-muted-foreground">
                These tags help search engines understand your restaurant page content.
              </p>

              <FormField
                control={form.control}
                name="meta_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          {...field}
                          placeholder="Best Italian Restaurant in Toronto"
                          data-testid="input-meta-title"
                        />
                        <div className="flex justify-between text-xs">
                          <span className={metaTitleLength > 60 ? 'text-destructive' : 'text-muted-foreground'}>
                            {metaTitleLength}/60 characters
                          </span>
                          {metaTitleLength > 60 && (
                            <span className="text-destructive">Title is too long</span>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Appears in search results. Keep it under 60 characters for best display.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meta_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Textarea
                          {...field}
                          rows={3}
                          placeholder="Authentic Italian cuisine with fresh pasta made daily. Family-owned since 1995. Dine-in and takeout available."
                          data-testid="input-meta-description"
                        />
                        <div className="flex justify-between text-xs">
                          <span className={metaDescLength > 160 ? 'text-destructive' : 'text-muted-foreground'}>
                            {metaDescLength}/160 characters
                          </span>
                          {metaDescLength > 160 && (
                            <span className="text-destructive">Description is too long</span>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Appears below the title in search results. Keep it under 160 characters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Open Graph Tags</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                These tags control how your restaurant appears when shared on social media (Facebook, Twitter, LinkedIn).
              </p>

              <FormField
                control={form.control}
                name="og_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Open Graph Title</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          {...field}
                          placeholder="Luigi's Italian Restaurant"
                          data-testid="input-og-title"
                        />
                        <div className="flex justify-between text-xs">
                          <span className={ogTitleLength > 60 ? 'text-destructive' : 'text-muted-foreground'}>
                            {ogTitleLength}/60 characters
                          </span>
                          {ogTitleLength > 60 && (
                            <span className="text-destructive">Title is too long</span>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Title shown when shared on social media. Leave blank to use Meta Title.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="og_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Open Graph Description</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Textarea
                          {...field}
                          rows={3}
                          placeholder="Experience authentic Italian flavors in the heart of Toronto. Fresh pasta, wood-fired pizza, and warm hospitality."
                          data-testid="input-og-description"
                        />
                        <div className="flex justify-between text-xs">
                          <span className={ogDescLength > 160 ? 'text-destructive' : 'text-muted-foreground'}>
                            {ogDescLength}/160 characters
                          </span>
                          {ogDescLength > 160 && (
                            <span className="text-destructive">Description is too long</span>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Description shown when shared on social media. Leave blank to use Meta Description.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="og_image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Open Graph Image URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://example.com/images/restaurant-hero.jpg"
                        data-testid="input-og-image-url"
                      />
                    </FormControl>
                    <FormDescription>
                      Image shown when shared on social media. Recommended size: 1200x630px.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-6 border-t">
              <FormField
                control={form.control}
                name="include_in_sitemap"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Include in Sitemap</FormLabel>
                      <FormDescription>
                        Make this restaurant discoverable by search engines through the sitemap.xml file
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-include-in-sitemap"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-6">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                data-testid="button-save-seo"
              >
                <Search className="h-4 w-4 mr-2" />
                Save SEO Settings
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
