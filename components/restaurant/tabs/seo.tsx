"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RestaurantSEOProps {
  restaurantId: string
}

export function RestaurantSEO({ restaurantId }: RestaurantSEOProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO & Citations</CardTitle>
        <CardDescription>Manage SEO settings and business citations</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">SEO management coming soon...</p>
      </CardContent>
    </Card>
  )
}
