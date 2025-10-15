"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RestaurantIntegrationsProps {
  restaurantId: string
}

export function RestaurantIntegrations({ restaurantId }: RestaurantIntegrationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Connect third-party services and APIs</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Integrations coming soon...</p>
      </CardContent>
    </Card>
  )
}
