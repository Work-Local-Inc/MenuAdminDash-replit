"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RestaurantImagesProps {
  restaurantId: string
}

export function RestaurantImages({ restaurantId }: RestaurantImagesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Image Gallery</CardTitle>
        <CardDescription>Manage restaurant photos and gallery</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Image gallery coming soon...</p>
      </CardContent>
    </Card>
  )
}
