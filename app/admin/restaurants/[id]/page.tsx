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

      {/* Tabs */}
      <Tabs defaultValue="basic-info" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="basic-info" data-testid="tab-basic-info">Basic Info</TabsTrigger>
          <TabsTrigger value="locations" data-testid="tab-locations">Locations</TabsTrigger>
          <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts</TabsTrigger>
          <TabsTrigger value="domains" data-testid="tab-domains">Domains</TabsTrigger>
          <TabsTrigger value="hours" data-testid="tab-hours">Hours</TabsTrigger>
          <TabsTrigger value="service-config" data-testid="tab-service-config">Service Config</TabsTrigger>
          <TabsTrigger value="delivery-areas" data-testid="tab-delivery-areas">Delivery Areas</TabsTrigger>
          <TabsTrigger value="categorization" data-testid="tab-categorization">Categorization</TabsTrigger>
          <TabsTrigger value="onboarding" data-testid="tab-onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="menu-categories" data-testid="tab-menu-categories">Menu Categories</TabsTrigger>
          <TabsTrigger value="payment-methods" data-testid="tab-payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
          <TabsTrigger value="branding" data-testid="tab-branding">Branding</TabsTrigger>
          <TabsTrigger value="seo" data-testid="tab-seo">SEO</TabsTrigger>
          <TabsTrigger value="images" data-testid="tab-images">Images</TabsTrigger>
          <TabsTrigger value="feedback" data-testid="tab-feedback">Feedback</TabsTrigger>
          <TabsTrigger value="custom-css" data-testid="tab-custom-css">Custom CSS</TabsTrigger>
        </TabsList>

        <TabsContent value="basic-info">
          <RestaurantBasicInfo restaurant={restaurant} />
        </TabsContent>

        <TabsContent value="locations">
          <RestaurantLocations restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="contacts">
          <RestaurantContacts restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="domains">
          <RestaurantDomains restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="hours">
          <RestaurantHours restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="service-config">
          <RestaurantServiceConfig restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="delivery-areas">
          <RestaurantDeliveryAreas restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="categorization">
          <Categorization restaurantId={parseInt(restaurantId)} />
        </TabsContent>

        <TabsContent value="onboarding">
          <Onboarding restaurantId={parseInt(restaurantId)} />
        </TabsContent>

        <TabsContent value="menu-categories">
          <RestaurantMenuCategories restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="payment-methods">
          <RestaurantPaymentMethods restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="integrations">
          <RestaurantIntegrations restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="branding">
          <RestaurantBranding restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="seo">
          <RestaurantSEO restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="images">
          <RestaurantImages restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="feedback">
          <RestaurantFeedback restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="custom-css">
          <RestaurantCustomCSS restaurantId={restaurantId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
