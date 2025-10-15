"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RestaurantFeedbackProps {
  restaurantId: string
}

export function RestaurantFeedback({ restaurantId }: RestaurantFeedbackProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Feedback</CardTitle>
        <CardDescription>View and respond to customer reviews</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Feedback management coming soon...</p>
      </CardContent>
    </Card>
  )
}
