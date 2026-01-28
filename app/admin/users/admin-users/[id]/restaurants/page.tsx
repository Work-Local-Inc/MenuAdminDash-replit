"use client"

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Plus, Trash2, Search, Store } from 'lucide-react'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Restaurant {
  id: number
  name: string
  slug: string
  status?: string
}

interface AdminUser {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
}

export default function AdminUserRestaurantsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const id = params.id as string

  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const { data: user, isLoading: userLoading } = useQuery<AdminUser>({
    queryKey: ['/api/admin-users', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin-users/${id}`)
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json()
    },
  })

  const { data: assignedRestaurants = [], isLoading: restaurantsLoading } = useQuery<Restaurant[]>({
    queryKey: ['/api/admin-users', id, 'restaurants'],
    queryFn: async () => {
      const res = await fetch(`/api/admin-users/${id}/restaurants`)
      if (!res.ok) throw new Error('Failed to fetch restaurants')
      return res.json()
    },
  })

  const { data: allRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
    queryFn: async () => {
      const res = await fetch('/api/restaurants')
      if (!res.ok) return []
      const data = await res.json()
      return data.restaurants || data || []
    },
  })

  const assignMutation = useMutation({
    mutationFn: async (restaurantId: number) => {
      const res = await fetch(`/api/admin-users/${id}/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to assign restaurant')
      }
      return res.json()
    },
    onSuccess: () => {
      toast({ title: 'Restaurant assigned successfully' })
      queryClient.invalidateQueries({ queryKey: ['/api/admin-users', id, 'restaurants'] })
      setIsAddDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (restaurantId: number) => {
      const res = await fetch(`/api/admin-users/${id}/restaurants/${restaurantId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to remove restaurant')
      }
      return res.json()
    },
    onSuccess: () => {
      toast({ title: 'Restaurant removed successfully' })
      queryClient.invalidateQueries({ queryKey: ['/api/admin-users', id, 'restaurants'] })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    },
  })

  const assignedIds = new Set(assignedRestaurants.map(r => r.id))
  const availableRestaurants = allRestaurants.filter(
    r => !assignedIds.has(r.id) && 
    (r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     r.slug?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const isLoading = userLoading || restaurantsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild data-testid="button-back">
            <Link href={`/admin/users/admin-users/${id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to User
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Manage Restaurants</h1>
            <p className="text-muted-foreground">
              {user?.first_name} {user?.last_name} ({user?.email})
            </p>
          </div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-restaurant">
              <Plus className="w-4 h-4 mr-2" />
              Add Restaurant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Restaurant</DialogTitle>
              <DialogDescription>
                Search and select a restaurant to assign to this admin user.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-restaurants"
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {availableRestaurants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchQuery ? 'No matching restaurants found' : 'No available restaurants'}
                  </p>
                ) : (
                  availableRestaurants.slice(0, 20).map((restaurant) => (
                    <div
                      key={restaurant.id}
                      className="flex items-center justify-between p-3 border rounded-md hover-elevate cursor-pointer"
                      onClick={() => assignMutation.mutate(restaurant.id)}
                      data-testid={`restaurant-option-${restaurant.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{restaurant.name}</div>
                          <div className="text-sm text-muted-foreground">{restaurant.slug}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" disabled={assignMutation.isPending}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Restaurants</CardTitle>
          <CardDescription>
            {assignedRestaurants.length} restaurant{assignedRestaurants.length !== 1 ? 's' : ''} assigned
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedRestaurants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No restaurants assigned to this user.</p>
              <p className="text-sm">Click "Add Restaurant" to assign one.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignedRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                  data-testid={`assigned-restaurant-${restaurant.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Store className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{restaurant.name}</div>
                      <div className="text-sm text-muted-foreground">{restaurant.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" data-testid={`button-remove-${restaurant.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Restaurant?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {restaurant.name} from this admin user's access.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeMutation.mutate(restaurant.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
