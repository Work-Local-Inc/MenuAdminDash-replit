"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SearchableRestaurantSelect } from "@/components/admin/searchable-restaurant-select"
import { 
  Layers, 
  Building2,
  ArrowRight,
  Settings
} from "lucide-react"
import { useRestaurants } from "@/lib/hooks/use-restaurants"

export default function ModifierManagerPage() {
  const router = useRouter()
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('')

  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants()

  const handleRestaurantSelect = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId)
    if (restaurantId) {
      router.push(`/admin/menu/modifiers/r/${restaurantId}`)
    }
  }

  const handleGoToRestaurant = () => {
    if (selectedRestaurantId) {
      router.push(`/admin/menu/modifiers/r/${selectedRestaurantId}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Modifier Manager
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Manage modifier groups across all restaurants
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Restaurant
          </CardTitle>
          <CardDescription>
            Choose a restaurant to manage its modifier groups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <SearchableRestaurantSelect
                restaurants={restaurants}
                value={selectedRestaurantId}
                onValueChange={handleRestaurantSelect}
                isLoading={loadingRestaurants}
                placeholder="Choose a restaurant..."
                data-testid="select-restaurant"
              />
            </div>
            <Button 
              onClick={handleGoToRestaurant}
              disabled={!selectedRestaurantId}
              data-testid="button-go-to-restaurant"
            >
              Go
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-12 text-center">
          <Layers className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Modifier Library</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            View and manage all modifier groups for a restaurant. Link modifiers to dishes or categories in bulk, 
            configure selection rules, and manage pizza placement options.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Bulk dish assignments</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Category inheritance</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              <span>Size-based pricing</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
          <CardDescription>
            Super admin tip: Navigate directly to any restaurant using the URL pattern
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <code>/admin/menu/modifiers/r/<span className="text-primary">[restaurant_id]</span></code>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Example: /admin/menu/modifiers/r/1009 for Econo Pizza, /admin/menu/modifiers/r/131 for Centertown
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
