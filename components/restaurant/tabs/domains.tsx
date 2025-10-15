"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RestaurantDomainsProps {
  restaurantId: string
}

export function RestaurantDomains({ restaurantId }: RestaurantDomainsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Domains</CardTitle>
        <CardDescription>Manage custom domains and SSL certificates</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Domain management coming soon...</p>
      </CardContent>
    </Card>
  )
}
