"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { User, MapPin, CreditCard, LogOut, Package } from 'lucide-react'
import Link from 'next/link'
import { ProfileTab } from '@/components/customer/profile-tab'
import { AddressesTab } from '@/components/customer/addresses-tab'
import { OrdersTab } from '@/components/customer/orders-tab'

export default function CustomerAccountPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/customer/login?redirect=/customer/account')
        return
      }

      // Get full user details
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      setCurrentUser(userData)
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/customer/login?redirect=/customer/account')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: "Signed Out",
        description: "You've been successfully signed out",
      })
      router.push('/')
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to sign out",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!currentUser) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Account</h1>
            <p className="text-muted-foreground">
              Welcome back, {currentUser.first_name}!
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            data-testid="button-sign-out"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders" data-testid="tab-orders">
              <Package className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="addresses" data-testid="tab-addresses">
              <MapPin className="w-4 h-4 mr-2" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersTab userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="addresses">
            <AddressesTab userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileTab user={currentUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
