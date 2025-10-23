"use client"

import { useParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRestaurant } from "@/lib/hooks/use-restaurants"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { RestaurantBasicInfo } from "@/components/restaurant/tabs/basic-info"
import { RestaurantLocations } from "@/components/restaurant/tabs/locations"
import { RestaurantContacts } from "@/components/restaurant/tabs/contacts"
import { RestaurantDomains } from "@/components/restaurant/tabs/domains"
import { RestaurantHours } from "@/components/restaurant/tabs/hours"
import { RestaurantServiceConfig } from "@/components/restaurant/tabs/service-config"
import { RestaurantDeliveryAreas } from "@/components/restaurant/tabs/delivery-areas"
import { RestaurantMenuCategories } from "@/components/restaurant/tabs/menu-categories"
import { RestaurantPaymentMethods } from "@/components/restaurant/tabs/payment-methods"
import { RestaurantIntegrations } from "@/components/restaurant/tabs/integrations"
import { RestaurantBranding } from "@/components/restaurant/tabs/branding"
import { RestaurantSEO } from "@/components/restaurant/tabs/seo"
import { RestaurantImages } from "@/components/restaurant/tabs/images"
import { RestaurantFeedback } from "@/components/restaurant/tabs/feedback"
import { RestaurantCustomCSS } from "@/components/restaurant/tabs/custom-css"
import { Categorization } from "@/components/restaurant/tabs/categorization"
import { Onboarding } from "@/components/restaurant/tabs/onboarding"
import { OnlineOrderingToggle } from "@/components/restaurant/online-ordering-toggle"

export default function RestaurantDetailPage() {
  const params = useParams()
  const restaurantId = params.id as string
  const { data: restaurant, isLoading } = useRestaurant(restaurantId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Restaurant not found</p>
        <Link href="/admin/restaurants">
          <Button variant="link">Back to Restaurants</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/restaurants">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-restaurant-name">
                {restaurant.name}
              </h1>
              <Badge variant={
                restaurant.status === 'active' ? 'default' :
                restaurant.status === 'suspended' ? 'destructive' :
                'secondary'
              }>
                {restaurant.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">ID: {restaurant.id}</p>
          </div>
        </div>
        
        <OnlineOrderingToggle
          restaurantId={restaurantId}
          restaurantName={restaurant.name}
          currentStatus={restaurant.online_ordering_enabled ?? true}
          isActive={restaurant.status === 'active'}
        />
      </div>

      {/* Two-Column Layout */}
      <Tabs defaultValue="basic-info" className="flex gap-6 items-start">
        {/* Left Sidebar Navigation */}
        <TabsList className="flex flex-col h-auto w-64 p-4 gap-6 shrink-0 bg-card">
          {/* Core Section */}
          <div className="w-full space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
              Core
            </h3>
            <TabsTrigger 
              value="basic-info" 
              data-testid="tab-basic-info"
              className="w-full justify-start"
            >
              Basic Info
            </TabsTrigger>
            <TabsTrigger 
              value="locations" 
              data-testid="tab-locations"
              className="w-full justify-start"
            >
              Locations
            </TabsTrigger>
            <TabsTrigger 
              value="contacts" 
              data-testid="tab-contacts"
              className="w-full justify-start"
            >
              Contacts
            </TabsTrigger>
            <TabsTrigger 
              value="hours" 
              data-testid="tab-hours"
              className="w-full justify-start"
            >
              Hours
            </TabsTrigger>
          </div>

          {/* Operations Section */}
          <div className="w-full space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
              Operations
            </h3>
            <TabsTrigger 
              value="service-config" 
              data-testid="tab-service-config"
              className="w-full justify-start"
            >
              Service Config
            </TabsTrigger>
            <TabsTrigger 
              value="delivery-areas" 
              data-testid="tab-delivery-areas"
              className="w-full justify-start"
            >
              Delivery Areas
            </TabsTrigger>
            <TabsTrigger 
              value="payment-methods" 
              data-testid="tab-payment-methods"
              className="w-full justify-start"
            >
              Payment Methods
            </TabsTrigger>
            <TabsTrigger 
              value="menu-categories" 
              data-testid="tab-menu-categories"
              className="w-full justify-start"
            >
              Menu Categories
            </TabsTrigger>
          </div>

          {/* Marketing Section */}
          <div className="w-full space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
              Marketing
            </h3>
            <TabsTrigger 
              value="categorization" 
              data-testid="tab-categorization"
              className="w-full justify-start"
            >
              Categorization
            </TabsTrigger>
            <TabsTrigger 
              value="branding" 
              data-testid="tab-branding"
              className="w-full justify-start"
            >
              Branding
            </TabsTrigger>
            <TabsTrigger 
              value="seo" 
              data-testid="tab-seo"
              className="w-full justify-start"
            >
              SEO
            </TabsTrigger>
            <TabsTrigger 
              value="images" 
              data-testid="tab-images"
              className="w-full justify-start"
            >
              Images
            </TabsTrigger>
          </div>

          {/* Advanced Section */}
          <div className="w-full space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
              Advanced
            </h3>
            <TabsTrigger 
              value="domains" 
              data-testid="tab-domains"
              className="w-full justify-start"
            >
              Domains
            </TabsTrigger>
            <TabsTrigger 
              value="integrations" 
              data-testid="tab-integrations"
              className="w-full justify-start"
            >
              Integrations
            </TabsTrigger>
            <TabsTrigger 
              value="onboarding" 
              data-testid="tab-onboarding"
              className="w-full justify-start"
            >
              Onboarding
            </TabsTrigger>
            <TabsTrigger 
              value="feedback" 
              data-testid="tab-feedback"
              className="w-full justify-start"
            >
              Feedback
            </TabsTrigger>
            <TabsTrigger 
              value="custom-css" 
              data-testid="tab-custom-css"
              className="w-full justify-start"
            >
              Custom CSS
            </TabsTrigger>
          </div>
        </TabsList>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0">
          <TabsContent value="basic-info" className="mt-0">
            <RestaurantBasicInfo restaurant={restaurant} />
          </TabsContent>

          <TabsContent value="locations" className="mt-0">
            <RestaurantLocations restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="contacts" className="mt-0">
            <RestaurantContacts restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="domains" className="mt-0">
            <RestaurantDomains restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="hours" className="mt-0">
            <RestaurantHours restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="service-config" className="mt-0">
            <RestaurantServiceConfig restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="delivery-areas" className="mt-0">
            <RestaurantDeliveryAreas restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="categorization" className="mt-0">
            <Categorization restaurantId={parseInt(restaurantId)} />
          </TabsContent>

          <TabsContent value="onboarding" className="mt-0">
            <Onboarding restaurantId={parseInt(restaurantId)} />
          </TabsContent>

          <TabsContent value="menu-categories" className="mt-0">
            <RestaurantMenuCategories restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="payment-methods" className="mt-0">
            <RestaurantPaymentMethods restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="integrations" className="mt-0">
            <RestaurantIntegrations restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="branding" className="mt-0">
            <RestaurantBranding restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="seo" className="mt-0">
            <RestaurantSEO restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="images" className="mt-0">
            <RestaurantImages restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="feedback" className="mt-0">
            <RestaurantFeedback restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="custom-css" className="mt-0">
            <RestaurantCustomCSS restaurantId={restaurantId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
