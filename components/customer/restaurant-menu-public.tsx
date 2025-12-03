'use client'

import { useEffect, useState, useMemo } from 'react'
import { UtensilsCrossed, MapPin, Clock, Phone, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DishCard } from './dish-card'
import { DishListRow } from './dish-list-row'
import { CartDrawer } from './cart-drawer'
import { PromoBanner } from './promo-banner'
import { useCartStore } from '@/lib/stores/cart-store'
import { resolveBrandingColors, MENUCA_RED } from '@/lib/utils'

interface RestaurantMenuPublicProps {
  restaurant: any
  courses: any[]
  hasMenu?: boolean
}

export default function RestaurantMenuPublic({
  restaurant,
  courses,
  hasMenu = true,
}: RestaurantMenuPublicProps) {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const cartItemCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  )
  const cartTotal = useCartStore((state) => state.getTotal())
  const setRestaurant = useCartStore((state) => state.setRestaurant)

  // Resolve branding colors - treats legacy grays/blacks as "unset" and returns Menu.ca red
  const brandColors = resolveBrandingColors(restaurant)

  // Generate restaurant slug for API calls
  const restaurantSlug = useMemo(() => {
    return `${restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${restaurant.id}`
  }, [restaurant.name, restaurant.id])

  useEffect(() => {
    setMounted(true)
  }, [])

  const displayCartCount = mounted ? cartItemCount : 0
  const displayCartTotal = mounted ? cartTotal : 0

  const location = restaurant.restaurant_locations?.[0]
  const serviceConfig = restaurant.delivery_and_pickup_configs?.[0]

  const streetAddress = location?.street_address
  const postalCode = location?.postal_code

  useEffect(() => {
    // Use restaurant_delivery_areas table (same as admin UI)
    // Note: delivery_fee is already in dollars, not cents
    const activeArea = restaurant.restaurant_delivery_areas?.find(
      (area: any) => area.is_active
    )
    const deliveryFee = activeArea?.delivery_fee ?? 0
    const minOrder = activeArea?.min_order_value || serviceConfig?.delivery_min_order || 0
    const slug = `${restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${restaurant.id}`

    const address = streetAddress
      ? `${streetAddress}${postalCode ? `, ${postalCode}` : ''}`
      : undefined

    setRestaurant(restaurant.id, restaurant.name, slug, deliveryFee, minOrder, address, brandColors.primary)
  }, [restaurant.id, restaurant.name, restaurant.restaurant_delivery_areas, serviceConfig, setRestaurant, streetAddress, postalCode, brandColors.primary])

  const scrollToCategory = (courseId: string) => {
    const element = document.getElementById(`category-${courseId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const menuContent = (
    <div className="min-h-screen bg-background">
      {/* Only show banner if restaurant has a custom banner image */}
      {restaurant.banner_image_url && (
        <div className="w-full h-20 sm:h-24 md:h-32 bg-muted relative overflow-hidden">
          <img
            src={restaurant.banner_image_url}
            alt={`${restaurant.name} banner`}
            className="w-full h-full object-cover"
          />
          <img
            src="/images/order-online-badge.png"
            alt="Order Online"
            className="absolute right-3 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 h-14 sm:h-16 md:h-24 w-auto drop-shadow-lg"
            data-testid="img-order-online-badge"
          />
        </div>
      )}

      <div className="border-b bg-card relative">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              {/* Logo display mode: icon_text (default) or full_logo */}
              {restaurant.logo_display_mode === 'full_logo' && restaurant.logo_url ? (
                <div className="mb-2">
                  <img
                    src={restaurant.logo_url}
                    alt={restaurant.name}
                    className="h-14 sm:h-16 md:h-20 w-auto object-contain"
                    data-testid="img-restaurant-logo-full"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  {restaurant.logo_url ? (
                    <img
                      src={restaurant.logo_url}
                      alt={restaurant.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded flex-shrink-0"
                      data-testid="img-restaurant-logo-icon"
                    />
                  ) : (
                    <div 
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: brandColors.primary }}
                      data-testid="icon-restaurant-default"
                    >
                      <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                  )}
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate" data-testid="text-restaurant-name">
                    {restaurant.name}
                  </h1>
                </div>
              )}

              {location && (
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span data-testid="text-restaurant-address">
                      {location.street_address}, {location.postal_code}
                    </span>
                  </div>

                  {location.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span data-testid="text-restaurant-phone">{location.phone}</span>
                    </div>
                  )}

                  {serviceConfig && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {serviceConfig.has_delivery_enabled && `Delivery: ${serviceConfig.delivery_time_minutes} min`}
                        {serviceConfig.has_delivery_enabled && serviceConfig.takeout_enabled && ' • '}
                        {serviceConfig.takeout_enabled && `Pickup: ${serviceConfig.takeout_time_minutes} min`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 flex-shrink-0">
              {serviceConfig?.has_delivery_enabled && (
                <Badge variant="secondary" className="text-xs sm:text-sm" data-testid="badge-delivery">
                  <span className="hidden sm:inline">Delivery Available</span>
                  <span className="sm:hidden">Delivery</span>
                </Badge>
              )}
              {serviceConfig?.takeout_enabled && (
                <Badge variant="secondary" className="text-xs sm:text-sm" data-testid="badge-takeout">
                  <span className="hidden sm:inline">Takeout Available</span>
                  <span className="sm:hidden">Takeout</span>
                </Badge>
              )}
            </div>
          </div>
        </div>
        {/* Show Order Online badge in restaurant info section when no custom banner */}
        {!restaurant.banner_image_url && (
          <img
            src="/images/order-online-badge.png"
            alt="Order Online"
            className="absolute right-3 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 h-12 sm:h-14 md:h-16 w-auto drop-shadow-md"
            data-testid="img-order-online-badge-info"
          />
        )}
      </div>

      {/* Promotional Banners - show available deals and coupons */}
      <PromoBanner 
        restaurantSlug={restaurantSlug}
        brandColor={brandColors.primary}
      />

      {courses && courses.length > 1 && (
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex gap-2 py-2 sm:py-3 overflow-x-auto scrollbar-hide">
              {courses.map((course) => (
                <Button
                  key={course.id}
                  variant="ghost"
                  onClick={() => scrollToCategory(course.id.toString())}
                  size="sm"
                  className="whitespace-nowrap"
                  data-testid={`button-category-${course.id}`}
                >
                  {course.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24">
        {!hasMenu ? (
          <div className="text-center py-12">
            <p className="text-lg font-medium mb-2">Menu Coming Soon</p>
            <p className="text-muted-foreground">
              This restaurant is setting up their menu. Please check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {courses?.map((course) => {
              const courseDishes = course.dishes || []
              // Map old layout values to new ones for backwards compatibility
              const rawLayout = restaurant.menu_layout
              // 'list' = compact list rows, 'grid2' = 2-column grid, 'grid4' = 4-column grid
              // Old 'grid' maps to 'grid2'
              const layout = rawLayout === 'grid' ? 'grid2' : rawLayout || 'grid4'

              const getGridClasses = () => {
                if (layout === 'grid2') {
                  return 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'
                } else if (layout === 'grid4') {
                  return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3'
                }
                return ''
              }

              return (
                <div key={course.id} id={`category-${course.id}`} className="scroll-mt-24">
                  <div className={`flex items-center gap-3 mb-4 pb-2 border-b ${layout === 'list' ? 'mb-0 pb-0 border-b-0 lg:max-w-2xl lg:mx-auto xl:max-w-none' : ''}`}>
                    <h2
                      className={`font-bold flex-1 ${layout === 'list' ? 'text-lg text-primary py-2 border-b-2 border-primary' : 'text-2xl'}`}
                      data-testid={`heading-category-${course.id}`}
                    >
                      {course.name}
                    </h2>
                  </div>

                  {courseDishes.length > 0 && (
                    layout === 'list' ? (
                      <>
                        {/* Mobile/Tablet/Large: Single column, centered */}
                        <div className="xl:hidden lg:max-w-2xl lg:mx-auto">
                          <div className="border rounded-lg divide-y overflow-hidden mb-4">
                            {courseDishes.map((dish: any, index: number) => (
                              <DishListRow
                                key={dish.id}
                                dish={dish}
                                restaurantId={restaurant.id}
                                buttonStyle={restaurant.button_style}
                                priceColor={brandColors.price}
                                buttonColor={brandColors.primary}
                                isEven={index % 2 === 0}
                              />
                            ))}
                          </div>
                        </div>
                        {/* Extra Large screens: 2 columns */}
                        <div className="hidden xl:grid xl:grid-cols-2 xl:gap-4">
                          <div className="border rounded-lg divide-y overflow-hidden">
                            {courseDishes
                              .filter((_: any, i: number) => i % 2 === 0)
                              .map((dish: any, index: number) => (
                                <DishListRow
                                  key={dish.id}
                                  dish={dish}
                                  restaurantId={restaurant.id}
                                  buttonStyle={restaurant.button_style}
                                  priceColor={brandColors.price}
                                  buttonColor={brandColors.primary}
                                  isEven={index % 2 === 0}
                                />
                              ))}
                          </div>
                          <div className="border rounded-lg divide-y overflow-hidden">
                            {courseDishes
                              .filter((_: any, i: number) => i % 2 === 1)
                              .map((dish: any, index: number) => (
                                <DishListRow
                                  key={dish.id}
                                  dish={dish}
                                  restaurantId={restaurant.id}
                                  buttonStyle={restaurant.button_style}
                                  priceColor={brandColors.price}
                                  buttonColor={brandColors.primary}
                                  isEven={index % 2 === 0}
                                />
                              ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className={getGridClasses()}>
                        {courseDishes.map((dish: any) => (
                          <DishCard
                            key={dish.id}
                            dish={dish}
                            restaurantId={restaurant.id}
                            buttonStyle={restaurant.button_style}
                            priceColor={brandColors.price}
                            buttonColor={brandColors.primary}
                          />
                        ))}
                      </div>
                    )
                  )}
                </div>
              )
            })}

            {(!courses || courses.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                No menu items available
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <Button
            onClick={() => setIsCartOpen(true)}
            className="w-full h-14 px-4 text-white font-medium"
            disabled={displayCartCount === 0 && !isCartOpen}
            data-testid="button-open-cart"
            style={{
              backgroundColor: brandColors.checkout,
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span className="font-semibold">
                  {isCartOpen && displayCartCount > 0 ? 'Place Order' : `Basket • ${displayCartCount} ${displayCartCount === 1 ? 'Item' : 'Items'}`}
                </span>
              </div>
              <span className="font-bold text-lg">
                ${displayCartTotal.toFixed(2)}
              </span>
            </div>
          </Button>
        </div>
      </div>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        restaurant={restaurant}
      />
    </div>
  )

  return menuContent
}
