"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RestaurantServiceConfigProps {
  restaurantId: string
}

export function RestaurantServiceConfig({ restaurantId }: RestaurantServiceConfigProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Configuration</CardTitle>
        <CardDescription>Configure delivery, takeout, and service settings</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Service configuration coming soon...</p>
      </CardContent>
    </Card>
  )
}
