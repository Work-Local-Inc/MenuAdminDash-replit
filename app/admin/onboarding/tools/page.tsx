"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Mail, Send, CheckCircle, Loader2, Store, User, AlertCircle } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"

interface Restaurant {
  id: number
  name: string
  slug: string
}

interface AdminUser {
  id: number
  email: string
  first_name?: string
  last_name?: string
  restaurant_id?: number
}

export default function OnboardingToolsPage() {
  const { toast } = useToast()
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("")
  const [employeeName, setEmployeeName] = useState("")
  const [employeeContact, setEmployeeContact] = useState("")
  const [emailSent, setEmailSent] = useState(false)

  const { data: restaurants = [], isLoading: loadingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
  })

  const selectedRestaurant = restaurants.find(r => r.id === Number(selectedRestaurantId))

  const { data: adminUsers = [], isLoading: loadingAdmins } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin-users'],
    enabled: !!selectedRestaurantId,
  })

  const restaurantAdmin = adminUsers.find(u => u.restaurant_id === Number(selectedRestaurantId))

  const sendEmailMutation = useMutation({
    mutationFn: async (data: {
      adminEmail: string
      adminName?: string
      restaurantName: string
      employeeName: string
      employeeContact?: string
    }) => {
      return apiRequest('/api/onboarding/send-login-email', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      setEmailSent(true)
      toast({
        title: "Email sent!",
        description: `Login instructions sent to ${restaurantAdmin?.email}`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    },
  })

  const handleSendEmail = () => {
    if (!selectedRestaurant || !restaurantAdmin || !employeeName) {
      toast({
        title: "Missing information",
        description: "Please select a restaurant and enter your name",
        variant: "destructive",
      })
      return
    }

    sendEmailMutation.mutate({
      adminEmail: restaurantAdmin.email,
      adminName: restaurantAdmin.first_name || undefined,
      restaurantName: selectedRestaurant.name,
      employeeName,
      employeeContact: employeeContact || undefined,
    })
  }

  const handleRestaurantChange = (value: string) => {
    setSelectedRestaurantId(value)
    setEmailSent(false)
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Onboarding Tools</h1>
        <p className="text-muted-foreground">Tools to help with restaurant onboarding</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle data-testid="text-card-title">Send Login Instructions</CardTitle>
          </div>
          <CardDescription>
            Send an email with dashboard login details to a restaurant admin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="restaurant">Select Restaurant</Label>
            <Select
              value={selectedRestaurantId}
              onValueChange={handleRestaurantChange}
              disabled={loadingRestaurants}
            >
              <SelectTrigger id="restaurant" data-testid="select-restaurant">
                <SelectValue placeholder={loadingRestaurants ? "Loading restaurants..." : "Choose a restaurant"} />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((restaurant) => (
                  <SelectItem key={restaurant.id} value={String(restaurant.id)}>
                    {restaurant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRestaurant && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium" data-testid="text-restaurant-name">{selectedRestaurant.name}</span>
                </div>
                
                {loadingAdmins ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading admin info...</span>
                  </div>
                ) : restaurantAdmin ? (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm" data-testid="text-admin-email">Admin: {restaurantAdmin.email}</span>
                    <Badge variant="outline" className="ml-auto" data-testid="badge-admin-name">
                      {restaurantAdmin.first_name || 'No name set'}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-amber-600" data-testid="text-no-admin-warning">
                    <AlertCircle className="h-4 w-4" />
                    <span>No admin user found for this restaurant. Please create one first.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employeeName">Your Name (Work Local Employee)</Label>
              <Input
                id="employeeName"
                placeholder="e.g., John Smith"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                data-testid="input-employee-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeContact">Your Contact Info (optional)</Label>
              <Input
                id="employeeContact"
                placeholder="e.g., john@worklocal.ca or 613-555-1234"
                value={employeeContact}
                onChange={(e) => setEmployeeContact(e.target.value)}
                data-testid="input-employee-contact"
              />
            </div>
          </div>

          {emailSent && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md" data-testid="status-email-sent">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700 dark:text-green-400">
                Email sent successfully to {restaurantAdmin?.email}
              </span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSendEmail}
              disabled={!selectedRestaurant || !restaurantAdmin || !employeeName || sendEmailMutation.isPending}
              data-testid="button-send-email"
            >
              {sendEmailMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Login Instructions
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
