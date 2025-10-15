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
import { Palette, Upload, Eye } from "lucide-react"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

const brandingSchema = z.object({
  logo_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional(),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional(),
  font_family: z.string().optional(),
})

type BrandingFormData = z.infer<typeof brandingSchema>

interface Restaurant {
  id: number
  name: string
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  font_family?: string | null
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
  const [showPreview, setShowPreview] = useState(false)

  const { data: restaurant, isLoading } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', restaurantId],
  })

  const form = useForm<BrandingFormData>({
    resolver: zodResolver(brandingSchema),
    values: {
      logo_url: restaurant?.logo_url || '',
      primary_color: restaurant?.primary_color || '#000000',
      secondary_color: restaurant?.secondary_color || '#666666',
      font_family: restaurant?.font_family || 'Inter',
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: BrandingFormData) => {
      let logoUrl = data.logo_url || null

      // Upload logo if file selected
      if (logoFile) {
        const formData = new FormData()
        formData.append('file', logoFile)
        formData.append('bucket', 'restaurant-logos')
        formData.append('path', `${restaurantId}/${Date.now()}_${logoFile.name}`)

        const uploadResponse = await apiRequest('/api/storage/upload', {
          method: 'POST',
          body: formData,
        })

        logoUrl = uploadResponse.url
      }

      // Convert empty strings to null for backend compatibility
      const payload = {
        logo_url: logoUrl || null,
        primary_color: data.primary_color || null,
        secondary_color: data.secondary_color || null,
        font_family: data.font_family || null,
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
  const currentFont = form.watch('font_family') || 'Inter'
  const currentLogoUrl = logoPreview || form.watch('logo_url') || restaurant?.logo_url

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize your restaurant's visual identity</CardDescription>
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label>Restaurant Logo</Label>
                <div className="mt-2 space-y-4">
                  {currentLogoUrl && (
                    <div className="flex items-center gap-4">
                      <img
                        src={currentLogoUrl}
                        alt="Restaurant logo"
                        className="h-24 w-24 object-contain border rounded-lg"
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
                    Upload a logo image. Recommended size: 512x512px, PNG or SVG format.
                  </p>
                </div>
              </div>

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
              </div>

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

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-branding"
                >
                  <Palette className="h-4 w-4 mr-2" />
                  Save Branding
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
            <CardDescription>See how your branding will look</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 p-6 border rounded-lg" style={{ fontFamily: currentFont }}>
              {currentLogoUrl && (
                <div className="flex justify-center">
                  <img
                    src={currentLogoUrl}
                    alt="Logo preview"
                    className="h-20 object-contain"
                  />
                </div>
              )}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold" style={{ color: currentPrimaryColor }}>
                  {restaurant?.name}
                </h2>
                <p className="text-muted-foreground">
                  This is how your restaurant name will appear with your selected font.
                </p>
                <div className="flex gap-3">
                  <Button style={{ backgroundColor: currentPrimaryColor, color: 'white' }}>
                    Primary Button
                  </Button>
                  <Button
                    variant="outline"
                    style={{
                      borderColor: currentSecondaryColor,
                      color: currentSecondaryColor,
                    }}
                  >
                    Secondary Button
                  </Button>
                </div>
                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: `${currentSecondaryColor}20` }}
                >
                  <p style={{ color: currentSecondaryColor }}>
                    This box uses your secondary color for highlights and backgrounds.
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
