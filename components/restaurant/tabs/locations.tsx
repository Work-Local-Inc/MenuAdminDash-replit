"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface RestaurantLocationsProps {
  restaurantId: string
}

export function RestaurantLocations({ restaurantId }: RestaurantLocationsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Locations</CardTitle>
            <CardDescription>Manage restaurant locations and addresses</CardDescription>
          </div>
          <Button data-testid="button-add-location">
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Location management coming soon...</p>
      </CardContent>
    </Card>
  )
}
