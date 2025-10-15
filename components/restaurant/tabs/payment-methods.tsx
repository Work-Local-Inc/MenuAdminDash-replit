"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RestaurantPaymentMethodsProps {
  restaurantId: string
}

export function RestaurantPaymentMethods({ restaurantId }: RestaurantPaymentMethodsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>Configure accepted payment options</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Payment methods coming soon...</p>
      </CardContent>
    </Card>
  )
}
