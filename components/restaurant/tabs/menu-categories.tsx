"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RestaurantMenuCategoriesProps {
  restaurantId: string
}

export function RestaurantMenuCategories({ restaurantId }: RestaurantMenuCategoriesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu Categories</CardTitle>
        <CardDescription>Organize courses and menu structure</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Menu categories coming soon...</p>
      </CardContent>
    </Card>
  )
}
