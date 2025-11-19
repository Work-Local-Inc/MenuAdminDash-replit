"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UtensilsCrossed, ChevronRight, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface MenuCategory {
  id: number
  name: string
  description: string | null
  display_order: number | null
  is_active: boolean
  dish_count: number
}

interface RestaurantMenuCategoriesProps {
  restaurantId: string
}

export function RestaurantMenuCategories({ restaurantId }: RestaurantMenuCategoriesProps) {
  const { data: categories = [], isLoading } = useQuery<MenuCategory[]>({
    queryKey: ['/api/restaurants', restaurantId, 'menu-categories'],
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Menu Categories</CardTitle>
          <CardDescription>Organize courses and menu structure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Menu Categories</CardTitle>
            <CardDescription>View your menu structure and course organization</CardDescription>
          </div>
          <Button variant="outline" disabled data-testid="button-manage-menu">
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            Full Menu Management
            <span className="ml-2 text-xs text-muted-foreground">(Coming Soon)</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This is a read-only view of your menu categories. Full menu editing capabilities will be available in the Menu Management section.
          </AlertDescription>
        </Alert>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No menu categories found</p>
            <p className="text-sm text-muted-foreground">Add categories through the Menu Management system</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 border rounded-lg hover-elevate transition-colors"
                data-testid={`category-${category.id}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium" data-testid={`text-category-name-${category.id}`}>
                        {category.name}
                      </h4>
                      {!category.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold" data-testid={`text-dish-count-${category.id}`}>
                      {category.dish_count}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {category.dish_count === 1 ? 'dish' : 'dishes'}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" disabled>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Total Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Categories:</span>
              <span className="ml-2 font-medium">{categories.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Dishes:</span>
              <span className="ml-2 font-medium">
                {categories.reduce((sum, cat) => sum + cat.dish_count, 0)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Active Categories:</span>
              <span className="ml-2 font-medium">
                {categories.filter(cat => cat.is_active).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Inactive Categories:</span>
              <span className="ml-2 font-medium">
                {categories.filter(cat => !cat.is_active).length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
