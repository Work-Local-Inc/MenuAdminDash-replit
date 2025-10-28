"use client"

import { useUserAddresses, useUserFavorites } from '@/lib/hooks/use-customer-users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Heart } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function CustomerDetailPage() {
  const params = useParams()
  const id = params.id as string
  
  const { data: addresses, isLoading: loadingAddresses } = useUserAddresses(id)
  const { data: favorites, isLoading: loadingFavorites } = useUserFavorites(id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Customer Details</h1>
          <p className="text-muted-foreground">User ID: {id}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Addresses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAddresses ? (
              <p className="text-muted-foreground">Loading addresses...</p>
            ) : addresses?.length === 0 ? (
              <p className="text-muted-foreground">No addresses saved</p>
            ) : (
              <div className="space-y-3">
                {addresses?.map((address: any) => (
                  <div
                    key={address.id}
                    className="p-3 border rounded-lg"
                    data-testid={`address-${address.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{address.street_address}</div>
                      {address.is_default && (
                        <Badge variant="default">Default</Badge>
                      )}
                    </div>
                    {address.unit_number && (
                      <div className="text-sm text-muted-foreground">
                        Unit: {address.unit_number}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      {address.cities?.name}, {address.provinces?.short_name} {address.postal_code}
                    </div>
                    {address.delivery_instructions && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Note: {address.delivery_instructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Favorite Restaurants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFavorites ? (
              <p className="text-muted-foreground">Loading favorites...</p>
            ) : favorites?.length === 0 ? (
              <p className="text-muted-foreground">No favorite restaurants</p>
            ) : (
              <div className="space-y-3">
                {favorites?.map((favorite: any) => (
                  <div
                    key={favorite.id}
                    className="p-3 border rounded-lg flex items-center gap-3"
                    data-testid={`favorite-${favorite.id}`}
                  >
                    {favorite.restaurants?.logo_url && (
                      <img
                        src={favorite.restaurants.logo_url}
                        alt={favorite.restaurants.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{favorite.restaurants?.name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">
                        Added: {new Date(favorite.created_at).toLocaleDateString('en-CA')}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {favorite.restaurants?.status || 'N/A'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
