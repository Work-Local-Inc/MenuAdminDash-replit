"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RestaurantHoursProps {
  restaurantId: string
}

export function RestaurantHours({ restaurantId }: RestaurantHoursProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operating Hours</CardTitle>
        <CardDescription>Configure delivery and takeout schedules</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Hours management coming soon...</p>
      </CardContent>
    </Card>
  )
}
