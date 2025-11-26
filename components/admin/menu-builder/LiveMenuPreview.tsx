"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { MenuBuilderCategory } from '@/lib/hooks/use-menu-builder'
import RestaurantMenu from '@/components/customer/restaurant-menu-public'

interface LiveMenuPreviewProps {
  restaurant: any
  categories: MenuBuilderCategory[]
  visible: boolean
  onToggleVisible: () => void
}

export function LiveMenuPreview({ restaurant, categories, visible, onToggleVisible }: LiveMenuPreviewProps) {
  if (!visible) {
    return (
      <div className="sticky top-4">
        <Button
          onClick={onToggleVisible}
          variant="outline"
          className="w-full"
          data-testid="button-show-preview"
        >
          <Eye className="w-4 h-4 mr-2" />
          Show Live Preview
        </Button>
      </div>
    )
  }

  // Transform menu builder data to RestaurantMenu format
  const formattedCourses = categories.map(category => ({
    id: category.id,
    name: category.name,
    description: category.description,
    is_active: category.is_active,
    display_order: category.display_order,
    dishes: category.dishes.map(dish => ({
      id: dish.id,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      image_url: dish.image_url,
      is_active: dish.is_active,
      is_featured: dish.is_featured,
      modifier_groups: dish.modifier_groups,
    })),
  }))

  return (
    <div className="sticky top-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <CardTitle className="text-lg">Customer Preview</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleVisible}
            data-testid="button-hide-preview"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            Hide
          </Button>
        </CardHeader>
        <CardContent className="max-h-[calc(100vh-12rem)] overflow-y-auto">
          <RestaurantMenu
            restaurant={restaurant}
            courses={formattedCourses}
            hasMenu={formattedCourses.length > 0}
          />
        </CardContent>
      </Card>
    </div>
  )
}
