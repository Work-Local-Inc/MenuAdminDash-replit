"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Code } from "lucide-react"

interface RestaurantCustomCSSProps {
  restaurantId: string
}

export function RestaurantCustomCSS({ restaurantId }: RestaurantCustomCSSProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom CSS</CardTitle>
        <CardDescription>Add custom styling to restaurant storefront</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <Code className="h-4 w-4" />
          <AlertDescription>
            CSS editor coming soon - customize restaurant storefront appearance
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
