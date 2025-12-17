"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Palette, Upload, Eye, Image as ImageIcon, Layout, Square, BadgeCheck } from "lucide-react"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { hexToHSL } from "@/lib/utils"

const brandingSchema = z.object({
  logo_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  banner_image_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  logo_display_mode: z.enum(['icon_text', 'full_logo']).optional(),
  show_order_online_badge: z.boolean().optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional(),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional(),
  checkout_button_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').or(z.literal('')).optional(),
  price_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').or(z.literal('')).optional(),
  font_family: z.string().optional(),
  button_style: z.enum(['rounded', 'square']).optional(),
  menu_layout: z.enum(['list', 'grid2', 'grid4', 'image_cards']).optional(),
  image_card_description_lines: z.enum(['2', '3']).optional(),
})

type BrandingFormData = z.infer<typeof brandingSchema>

interface Restaurant {
  id: number
  name: string
  logo_url?: string | null
  banner_image_url?: string | null
  logo_display_mode?: 'icon_text' | 'full_logo' | null
  show_order_online_badge?: boolean | null
  primary_color?: string | null
  secondary_color?: string | null
  checkout_button_color?: string | null
  price_color?: string | null
  font_family?: string | null
  button_style?: 'rounded' | 'square' | null
  menu_layout?: 'list' | 'grid2' | 'grid4' | 'image_cards' | null
  image_card_description_lines?: '2' | '3' | null
}

interface RestaurantBrandingProps {
  restaurantId: string
}

const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Playfair Display',
  'Merriweather',
  'Source Sans Pro',
]

export function RestaurantBranding({ restaurantId }: RestaurantBrandingProps) {
  const { toast } = useToast()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', restaurantId],
  })

  const form = useForm<BrandingFormData>({
    resolver: zodResolver(brandingSchema) as any,
    values: {
      logo_url: restaurant?.logo_url || '',
      banner_image_url: restaurant?.banner_image_url || '',
      logo_display_mode: restaurant?.logo_display_mode || 'icon_text',
      show_order_online_badge: restaurant?.show_order_online_badge || false,
      primary_color: restaurant?.primary_color || '#000000',
      secondary_color: restaurant?.secondary_color || '#666666',
      checkout_button_color: restaurant?.checkout_button_color || '',
      price_color: restaurant?.price_color || '',
      font_family: restaurant?.font_family || 'Inter',
      button_style: restaurant?.button_style || 'rounded',
      menu_layout: restaurant?.menu_layout || 'grid4',
      image_card_description_lines: restaurant?.image_card_description_lines || '2',
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: BrandingFormData) => {
      let logoUrl = data.logo_url || null
      let bannerUrl = data.banner_image_url || null

      // Upload logo if file selected
      if (logoFile) {
        console.log('[Branding] Uploading logo...', { 
          name: logoFile.name, 
          size: logoFile.size, 
          type: logoFile.type 
        })
        
        const formData = new FormData()
        formData.append('file', logoFile)
        formData.append('bucket', 'restaurant-logos')
        formData.append('path', `${restaurantId}/${Date.now()}_${logoFile.name}`)

        try {
          const uploadResponse = await apiRequest('/api/storage/upload', {
            method: 'POST',
            body: formData,
          })
          logoUrl = uploadResponse.url
          console.log('[Branding] Logo uploaded successfully:', logoUrl)
        } catch (uploadError: any) {
          console.error('[Branding] Logo upload failed:', uploadError)
          throw new Error(`Logo upload failed: ${uploadError.message}`)
        }
      }

      // Upload banner if file selected
      if (bannerFile) {
        console.log('[Branding] Uploading banner...', { 
          name: bannerFile.name, 
          size: bannerFile.size, 
          type: bannerFile.type 
        })
        
        const formData = new FormData()
        formData.append('file', bannerFile)
        formData.append('bucket', 'restaurant-images')
        formData.append('path', `${restaurantId}/${Date.now()}_${bannerFile.name}`)

        try {
          const uploadResponse = await apiRequest('/api/storage/upload', {
            method: 'POST',
            body: formData,
          })
          bannerUrl = uploadResponse.url
          console.log('[Branding] Banner uploaded successfully:', bannerUrl)
        } catch (uploadError: any) {
          console.error('[Branding] Banner upload failed:', uploadError)
          throw new Error(`Banner upload failed: ${uploadError.message}`)
        }
      }

      // Convert empty strings to null for backend compatibility
      const payload = {
        logo_url: logoUrl || null,
        banner_image_url: bannerUrl || null,
        logo_display_mode: data.logo_display_mode || 'icon_text',
        show_order_online_badge: data.show_order_online_badge || false,
        primary_color: data.primary_color || null,
        secondary_color: data.secondary_color || null,
        checkout_button_color: data.checkout_button_color || null,
        price_color: data.price_color || null,
        font_family: data.font_family || null,
        button_style: data.button_style || null,
        menu_layout: data.menu_layout || null,
        image_card_description_lines: data.image_card_description_lines || null,
      }

      return apiRequest(`/api/restaurants/${restaurantId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId] })
      toast({ title: 'Branding updated successfully' })
      setLogoFile(null)
      setLogoPreview(null)
      setBannerFile(null)
      setBannerPreview(null)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const onSubmit = (data: BrandingFormData) => {
    updateMutation.mutate(data)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBannerFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setBannerPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Customize your restaurant's visual identity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentPrimaryColor = form.watch('primary_color') || '#000000'
  const currentSecondaryColor = form.watch('secondary_color') || '#666666'
  const currentCheckoutButtonColor = form.watch('checkout_button_color') || currentPrimaryColor
  const currentPriceColor = form.watch('price_color') || currentPrimaryColor
  const currentFont = form.watch('font_family') || 'Inter'
  const currentButtonStyle = form.watch('button_style') || 'rounded'
  const currentMenuLayout = form.watch('menu_layout') || 'grid4'
  const currentLogoUrl = logoPreview || form.watch('logo_url') || restaurant?.logo_url
  const currentBannerUrl = bannerPreview || form.watch('banner_image_url') || restaurant?.banner_image_url
  const currentLogoDisplayMode = form.watch('logo_display_mode') || 'icon_text'

  // Convert hex to HSL for preview using the utility function
  const primaryColorHSL = currentPrimaryColor ? hexToHSL(currentPrimaryColor) : null
  const previewStyle = primaryColorHSL ? {
    '--primary': primaryColorHSL,
    '--ring': primaryColorHSL,
    fontFamily: currentFont,
  } as React.CSSProperties : { fontFamily: currentFont }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize your restaurant's visual identity for the menu page</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              data-testid="button-toggle-preview"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Images Section */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Images
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Logo Upload */}
                    <div>
                      <Label>Restaurant Logo</Label>
                      <div className="mt-2 space-y-4">
                        {currentLogoUrl && (
                          <div className="flex items-center gap-4">
                            <img
                              src={currentLogoUrl}
                              alt="Restaurant logo"
                              className="h-24 w-24 object-contain border rounded-lg bg-white p-2"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="max-w-xs"
                            data-testid="input-logo-upload"
                          />
                          {logoFile && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLogoFile(null)
                                setLogoPreview(null)
                              }}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Upload a logo. Recommended: 512x512px, PNG or SVG.
                        </p>
                      </div>
                    </div>

                    {/* Banner Upload */}
                    <div>
                      <Label>Header Banner Image</Label>
                      <div className="mt-2 space-y-4">
                        {currentBannerUrl && (
                          <div className="flex items-center gap-4">
                            <img
                              src={currentBannerUrl}
                              alt="Banner"
                              className="h-24 w-auto object-cover border rounded-lg"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerChange}
                            className="max-w-xs"
                            data-testid="input-banner-upload"
                          />
                          {bannerFile && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setBannerFile(null)
                                setBannerPreview(null)
                              }}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Upload a header banner. Recommended: 1920x400px, JPG or PNG.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo Display Mode */}
                <div className="pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="logo_display_mode"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormLabel className="text-base font-semibold">Logo Display Mode</FormLabel>
                        <FormDescription>
                          Choose how your logo appears on the public menu page
                        </FormDescription>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-3"
                          >
                            <div className="flex items-start space-x-3 p-4 border rounded-lg hover-elevate cursor-pointer">
                              <RadioGroupItem value="icon_text" id="icon_text" className="mt-1" />
                              <Label htmlFor="icon_text" className="font-normal cursor-pointer flex-1">
                                <div className="flex flex-col gap-2">
                                  <span className="font-medium">Icon + Name (Default)</span>
                                  <span className="text-sm text-muted-foreground">
                                    Square logo icon displayed alongside the restaurant name text
                                  </span>
                                  {currentLogoUrl && (
                                    <div className="flex items-center gap-3 mt-2 p-3 bg-muted/50 rounded-md">
                                      <img
                                        src={currentLogoUrl}
                                        alt="Logo preview"
                                        className="w-10 h-10 object-contain rounded flex-shrink-0"
                                      />
                                      <span className="text-lg font-bold truncate">{restaurant?.name || 'Restaurant Name'}</span>
                                    </div>
                                  )}
                                </div>
                              </Label>
                            </div>
                            <div className="flex items-start space-x-3 p-4 border rounded-lg hover-elevate cursor-pointer">
                              <RadioGroupItem value="full_logo" id="full_logo" className="mt-1" />
                              <Label htmlFor="full_logo" className="font-normal cursor-pointer flex-1">
                                <div className="flex flex-col gap-2">
                                  <span className="font-medium">Full Logo</span>
                                  <span className="text-sm text-muted-foreground">
                                    Display logo at full width (no text). Great for logos that already include the restaurant name.
                                  </span>
                                  {currentLogoUrl && (
                                    <div className="mt-2 p-3 bg-muted/50 rounded-md">
                                      <img
                                        src={currentLogoUrl}
                                        alt="Logo preview"
                                        className="h-14 w-auto object-contain"
                                      />
                                    </div>
                                  )}
                                </div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Order Online Badge Toggle */}
                <div className="pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="show_order_online_badge"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <BadgeCheck className="h-5 w-5 text-primary" />
                            <FormLabel className="text-base font-semibold">Order Online Badge</FormLabel>
                          </div>
                          <FormDescription>
                            Show an "Order Online" badge on the right side of your banner image to attract customers
                          </FormDescription>
                          {field.value && currentBannerUrl && (
                            <div className="mt-3 relative inline-block">
                              <img
                                src={currentBannerUrl}
                                alt="Banner preview"
                                className="h-20 w-auto object-cover rounded-md"
                              />
                              <img
                                src="/images/order-online-badge.png"
                                alt="Order Online Badge"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-auto drop-shadow-lg"
                              />
                            </div>
                          )}
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-order-online-badge"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Colors Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Colors
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-3">
                            <Input
                              type="color"
                              {...field}
                              className="w-20 h-10 cursor-pointer"
                              data-testid="input-primary-color"
                            />
                            <Input
                              type="text"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder="#000000"
                              className="flex-1 font-mono"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Main brand color for buttons, links, and accents
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-3">
                            <Input
                              type="color"
                              {...field}
                              className="w-20 h-10 cursor-pointer"
                              data-testid="input-secondary-color"
                            />
                            <Input
                              type="text"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder="#666666"
                              className="flex-1 font-mono"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Secondary color for backgrounds and highlights
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="checkout_button_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Checkout Button Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-3">
                            <Input
                              type="color"
                              value={field.value || currentPrimaryColor}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-20 h-10 cursor-pointer"
                              data-testid="input-checkout-button-color"
                            />
                            <Input
                              type="text"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder="Uses Primary Color"
                              className="flex-1 font-mono"
                            />
                            {field.value && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => field.onChange('')}
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Color for cart and checkout buttons. Leave empty to use Primary Color.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-3">
                            <Input
                              type="color"
                              value={field.value || currentPrimaryColor}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-20 h-10 cursor-pointer"
                              data-testid="input-price-color"
                            />
                            <Input
                              type="text"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder="Uses Primary Color"
                              className="flex-1 font-mono"
                            />
                            {field.value && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => field.onChange('')}
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Color for price displays on menu items. Leave empty to use Primary Color.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Typography Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Typography</h3>
                <FormField
                  control={form.control}
                  name="font_family"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Font</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-font-family">
                            <SelectValue placeholder="Select a font" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GOOGLE_FONTS.map((font) => (
                            <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                              {font}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose a Google Font for your brand typography
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* UI Preferences Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  UI Preferences
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Button Style */}
                  <FormField
                    control={form.control}
                    name="button_style"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Button Style</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="rounded" id="rounded" />
                              <Label htmlFor="rounded" className="font-normal cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
                                    Rounded
                                  </div>
                                </div>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="square" id="square" />
                              <Label htmlFor="square" className="font-normal cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <div className="px-4 py-2 bg-primary text-primary-foreground rounded-none text-sm">
                                    Square
                                  </div>
                                </div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          Choose button corner style for your menu
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Menu Layout */}
                  <FormField
                    control={form.control}
                    name="menu_layout"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Menu Layout</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            {/* Compact List - single column rows */}
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="list" id="list" />
                              <Label htmlFor="list" className="font-normal cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col gap-0.5 w-14">
                                    <div className="h-1.5 bg-muted rounded w-full" />
                                    <div className="h-1.5 bg-muted/60 rounded w-full" />
                                    <div className="h-1.5 bg-muted rounded w-full" />
                                    <div className="h-1.5 bg-muted/60 rounded w-full" />
                                  </div>
                                  <div>
                                    <span className="font-medium">Compact List</span>
                                    <p className="text-xs text-muted-foreground">Single rows, best for 100+ items</p>
                                  </div>
                                </div>
                              </Label>
                            </div>
                            {/* Grid 2 Column */}
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="grid2" id="grid2" />
                              <Label htmlFor="grid2" className="font-normal cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <div className="grid grid-cols-2 gap-0.5 w-14">
                                    <div className="w-6 h-4 bg-muted rounded" />
                                    <div className="w-6 h-4 bg-muted rounded" />
                                    <div className="w-6 h-4 bg-muted rounded" />
                                    <div className="w-6 h-4 bg-muted rounded" />
                                  </div>
                                  <div>
                                    <span className="font-medium">Grid (2 col)</span>
                                    <p className="text-xs text-muted-foreground">Cards with images/descriptions</p>
                                  </div>
                                </div>
                              </Label>
                            </div>
                            {/* Grid 4 Column - Responsive */}
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="grid4" id="grid4" />
                              <Label htmlFor="grid4" className="font-normal cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <div className="grid grid-cols-4 gap-0.5 w-14">
                                    <div className="w-3 h-3 bg-muted rounded" />
                                    <div className="w-3 h-3 bg-muted rounded" />
                                    <div className="w-3 h-3 bg-muted rounded" />
                                    <div className="w-3 h-3 bg-muted rounded" />
                                    <div className="w-3 h-3 bg-muted rounded" />
                                    <div className="w-3 h-3 bg-muted rounded" />
                                    <div className="w-3 h-3 bg-muted rounded" />
                                    <div className="w-3 h-3 bg-muted rounded" />
                                  </div>
                                  <div>
                                    <span className="font-medium">Grid (4 col)</span>
                                    <p className="text-xs text-muted-foreground">Responsive 1→2→3→4 columns</p>
                                  </div>
                                </div>
                              </Label>
                            </div>
                            {/* Image Cards - Large hero images like DoorDash/Uber Eats */}
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="image_cards" id="image_cards" />
                              <Label htmlFor="image_cards" className="font-normal cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <div className="grid grid-cols-2 gap-0.5 w-14">
                                    <div className="w-6 h-5 bg-primary/30 rounded-t" />
                                    <div className="w-6 h-5 bg-primary/30 rounded-t" />
                                    <div className="w-6 h-2 bg-muted rounded-b" />
                                    <div className="w-6 h-2 bg-muted rounded-b" />
                                  </div>
                                  <div>
                                    <span className="font-medium">Image Cards</span>
                                    <p className="text-xs text-muted-foreground">Large photos, best with dish images</p>
                                  </div>
                                </div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          Choose how menu items are displayed on the customer page
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Image Card Description Lines - only shown when image_cards layout is selected */}
                  {currentMenuLayout === 'image_cards' && (
                    <FormField
                      control={form.control}
                      name="image_card_description_lines"
                      render={({ field }) => (
                        <FormItem className="space-y-3 pt-4 border-t">
                          <FormLabel>Description Length</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col space-y-2"
                            >
                              <div className="flex items-center space-x-3 space-y-0">
                                <RadioGroupItem value="2" id="lines-2" />
                                <Label htmlFor="lines-2" className="font-normal cursor-pointer">
                                  <div>
                                    <span className="font-medium">2 Lines</span>
                                    <p className="text-xs text-muted-foreground">Compact cards, best for short descriptions</p>
                                  </div>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 space-y-0">
                                <RadioGroupItem value="3" id="lines-3" />
                                <Label htmlFor="lines-3" className="font-normal cursor-pointer">
                                  <div>
                                    <span className="font-medium">3 Lines</span>
                                    <p className="text-xs text-muted-foreground">More space for longer descriptions</p>
                                  </div>
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormDescription>
                            How many lines of description to show on image cards
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-branding"
                >
                  <Palette className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Branding'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Brand Preview</CardTitle>
            <CardDescription>See how your branding will look on the menu page</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0 border rounded-lg overflow-hidden" style={previewStyle}>
              {/* Banner Preview */}
              {currentBannerUrl && (
                <div className="w-full h-32 bg-muted relative overflow-hidden">
                  <img
                    src={currentBannerUrl}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-6 space-y-6">
                {/* Logo and Name */}
                <div className="flex items-center gap-4">
                  {currentLogoUrl && (
                    <img
                      src={currentLogoUrl}
                      alt="Logo preview"
                      className="h-16 w-16 object-contain"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-primary">
                      {restaurant?.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      123 Main St, Toronto, ON
                    </p>
                  </div>
                </div>

                {/* Color Swatches */}
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Primary Color</div>
                    <div 
                      className="w-16 h-16 rounded-lg border-2 border-background shadow-sm"
                      style={{ backgroundColor: currentPrimaryColor }}
                    />
                    <div className="text-xs font-mono">{currentPrimaryColor}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Secondary Color</div>
                    <div 
                      className="w-16 h-16 rounded-lg border-2 border-background shadow-sm"
                      style={{ backgroundColor: currentSecondaryColor }}
                    />
                    <div className="text-xs font-mono">{currentSecondaryColor}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Checkout Button</div>
                    <div 
                      className="w-16 h-16 rounded-lg border-2 border-background shadow-sm"
                      style={{ backgroundColor: currentCheckoutButtonColor }}
                    />
                    <div className="text-xs font-mono">{form.watch('checkout_button_color') ? currentCheckoutButtonColor : '(Primary)'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Price Color</div>
                    <div 
                      className="w-16 h-16 rounded-lg border-2 border-background shadow-sm"
                      style={{ backgroundColor: currentPriceColor }}
                    />
                    <div className="text-xs font-mono">{form.watch('price_color') ? currentPriceColor : '(Primary)'}</div>
                  </div>
                </div>

                {/* Button Style Preview */}
                <div className="space-y-3">
                  <div className="text-sm font-medium">Button Style: {currentButtonStyle === 'rounded' ? 'Rounded' : 'Square'}</div>
                  <div className="flex gap-3">
                    <Button 
                      className={currentButtonStyle === 'square' ? 'rounded-none' : ''}
                      style={{
                        backgroundColor: currentCheckoutButtonColor,
                        borderColor: currentCheckoutButtonColor,
                      }}
                    >
                      Add to Cart
                    </Button>
                    <Button 
                      variant="outline"
                      className={currentButtonStyle === 'square' ? 'rounded-none' : ''}
                      style={{
                        borderColor: currentSecondaryColor,
                        color: currentSecondaryColor,
                      }}
                    >
                      View Menu
                    </Button>
                  </div>
                </div>

                {/* Menu Layout Preview */}
                <div className="space-y-3">
                  <div className="text-sm font-medium">
                    Menu Layout: {currentMenuLayout === 'list' ? 'Compact List' : currentMenuLayout === 'grid2' ? 'Grid (2 col)' : currentMenuLayout === 'image_cards' ? 'Image Cards' : 'Grid (4 col)'}
                  </div>
                  {currentMenuLayout === 'list' ? (
                    // Compact List Preview
                    <div className="border rounded-lg divide-y overflow-hidden">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`flex items-center justify-between px-3 py-2 ${i % 2 === 0 ? 'bg-muted/20' : ''}`}>
                          <span className="text-sm font-medium">Menu Item {i}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: currentPriceColor }}>$12.99</span>
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                              style={{ backgroundColor: currentPrimaryColor }}
                            >+</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : currentMenuLayout === 'grid2' ? (
                    // Grid 2 Column Preview
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="border rounded-lg p-3 space-y-2">
                          <div className="h-16 bg-muted rounded" />
                          <div className="text-xs font-medium">Menu Item {i}</div>
                          <div className="text-xs text-muted-foreground">Description</div>
                          <div className="text-xs font-semibold" style={{ color: currentPriceColor }}>$12.99</div>
                        </div>
                      ))}
                    </div>
                  ) : currentMenuLayout === 'image_cards' ? (
                    // Image Cards Preview - Large hero images like DoorDash/Uber Eats
                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="border rounded-lg overflow-hidden">
                          <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 to-primary/5 relative">
                            <div 
                              className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: currentPrimaryColor }}
                            >+</div>
                          </div>
                          <div className="p-3 space-y-1">
                            <div className="flex justify-between items-start">
                              <div className="text-sm font-medium">Menu Item {i}</div>
                              <div className="text-sm font-semibold" style={{ color: currentPriceColor }}>$12.99</div>
                            </div>
                            <div className="text-xs text-muted-foreground">Fresh and delicious</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Grid 4 Column Preview
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="border rounded-lg p-2 space-y-1">
                          <div className="text-xs font-medium truncate">Menu Item {i}</div>
                          <div className="text-xs font-semibold" style={{ color: currentPriceColor }}>$12.99</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Typography Sample */}
                <div
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: `${currentSecondaryColor}10`, borderColor: `${currentSecondaryColor}30` }}
                >
                  <p className="text-sm" style={{ color: currentSecondaryColor }}>
                    This preview shows your selected brand font: <strong>{currentFont}</strong>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
