"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin } from "lucide-react"

interface RestaurantDeliveryAreasProps {
  restaurantId: string
}

export function RestaurantDeliveryAreas({ restaurantId }: RestaurantDeliveryAreasProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Areas</CardTitle>
        <CardDescription>Draw delivery zones using Mapbox polygon tool</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            Mapbox integration coming soon - draw custom delivery polygons on the map
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
