"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RestaurantBrandingProps {
  restaurantId: string
}

export function RestaurantBranding({ restaurantId }: RestaurantBrandingProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>Upload logos, banners, and brand assets</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Branding management coming soon...</p>
      </CardContent>
    </Card>
  )
}
