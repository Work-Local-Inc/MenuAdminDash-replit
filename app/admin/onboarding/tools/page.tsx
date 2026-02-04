"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Mail, Send, CheckCircle, Loader2, Store, User, AlertCircle, Eye, Edit3 } from "lucide-react"
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

const DEFAULT_PASSWORD = "Menu123*"
const DEFAULT_DASHBOARD_URL = "https://menuv3.replit.app/login"

export default function OnboardingToolsPage() {
  const { toast } = useToast()
  const [inputMode, setInputMode] = useState<"restaurant" | "manual">("restaurant")
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("")
  const [manualEmail, setManualEmail] = useState("")
  const [manualRecipientName, setManualRecipientName] = useState("")
  const [manualRestaurantName, setManualRestaurantName] = useState("")
  const [employeeName, setEmployeeName] = useState("")
  const [employeeContact, setEmployeeContact] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  const [editablePassword, setEditablePassword] = useState(DEFAULT_PASSWORD)
  const [editableDashboardUrl, setEditableDashboardUrl] = useState(DEFAULT_DASHBOARD_URL)

  const { data: restaurants = [], isLoading: loadingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
  })

  const selectedRestaurant = restaurants.find(r => r.id === Number(selectedRestaurantId))

  const { data: adminUsers = [], isLoading: loadingAdmins } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin-users'],
    enabled: !!selectedRestaurantId,
  })

  const restaurantAdmin = adminUsers.find(u => u.restaurant_id === Number(selectedRestaurantId))

  const getEmailData = () => {
    if (inputMode === "restaurant") {
      return {
        adminEmail: restaurantAdmin?.email || "",
        adminName: restaurantAdmin?.first_name || undefined,
        restaurantName: selectedRestaurant?.name || "",
      }
    } else {
      return {
        adminEmail: manualEmail,
        adminName: manualRecipientName || undefined,
        restaurantName: manualRestaurantName || "Your Restaurant",
      }
    }
  }

  const sendEmailMutation = useMutation({
    mutationFn: async (data: {
      adminEmail: string
      adminName?: string
      restaurantName: string
      employeeName: string
      employeeContact?: string
      password?: string
      dashboardUrl?: string
    }) => {
      return apiRequest('/api/onboarding/send-login-email', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      setEmailSent(true)
      const emailData = getEmailData()
      toast({
        title: "Email sent!",
        description: `Login instructions sent to ${emailData.adminEmail}`,
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
    const emailData = getEmailData()
    
    if (!emailData.adminEmail || !employeeName) {
      toast({
        title: "Missing information",
        description: "Please provide an email address and enter your name",
        variant: "destructive",
      })
      return
    }

    sendEmailMutation.mutate({
      ...emailData,
      employeeName,
      employeeContact: employeeContact || undefined,
      password: editablePassword,
      dashboardUrl: editableDashboardUrl,
    })
  }

  const handleRestaurantChange = (value: string) => {
    setSelectedRestaurantId(value)
    setEmailSent(false)
    setShowPreview(false)
  }

  const handleModeChange = (mode: string) => {
    setInputMode(mode as "restaurant" | "manual")
    setEmailSent(false)
    setShowPreview(false)
  }

  const canSend = () => {
    if (inputMode === "restaurant") {
      return selectedRestaurant && restaurantAdmin && employeeName
    } else {
      return manualEmail && employeeName
    }
  }

  const emailData = getEmailData()

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
          <Tabs value={inputMode} onValueChange={handleModeChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="restaurant" data-testid="tab-restaurant">
                <Store className="h-4 w-4 mr-2" />
                Select Restaurant
              </TabsTrigger>
              <TabsTrigger value="manual" data-testid="tab-manual">
                <Edit3 className="h-4 w-4 mr-2" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="restaurant" className="space-y-4 mt-4">
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
                      <SelectItem key={restaurant.id} value={String(restaurant.id)} data-testid={`select-item-restaurant-${restaurant.id}`}>
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
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manualEmail">Recipient Email *</Label>
                  <Input
                    id="manualEmail"
                    type="email"
                    placeholder="admin@restaurant.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    data-testid="input-manual-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manualRecipientName">Recipient Name (optional)</Label>
                  <Input
                    id="manualRecipientName"
                    placeholder="e.g., John"
                    value={manualRecipientName}
                    onChange={(e) => setManualRecipientName(e.target.value)}
                    data-testid="input-manual-recipient-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualRestaurantName">Restaurant Name (optional)</Label>
                <Input
                  id="manualRestaurantName"
                  placeholder="e.g., Golden Center Pizza"
                  value={manualRestaurantName}
                  onChange={(e) => setManualRestaurantName(e.target.value)}
                  data-testid="input-manual-restaurant-name"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="border-t pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employeeName">Your Name (Work Local Employee) *</Label>
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
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!emailData.adminEmail}
              data-testid="button-toggle-preview"
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? "Hide Preview" : "Show Email Preview"}
            </Button>
          </div>

          {showPreview && (
            <Card className="border-2 border-dashed">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Email Preview</CardTitle>
                  <Badge variant="secondary">Editable</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="previewTo" className="text-xs text-muted-foreground">To:</Label>
                    <Input
                      id="previewTo"
                      value={emailData.adminEmail}
                      disabled
                      className="bg-muted"
                      data-testid="input-preview-to"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="previewSubject" className="text-xs text-muted-foreground">Subject:</Label>
                    <Input
                      id="previewSubject"
                      value={`Welcome to Menu.ca - Your ${emailData.restaurantName || "Restaurant"} Dashboard`}
                      disabled
                      className="bg-muted"
                      data-testid="input-preview-subject"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="previewPassword" className="text-xs text-muted-foreground">
                    Temporary Password (editable)
                  </Label>
                  <Input
                    id="previewPassword"
                    value={editablePassword}
                    onChange={(e) => setEditablePassword(e.target.value)}
                    data-testid="input-preview-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="previewDashboardUrl" className="text-xs text-muted-foreground">
                    Dashboard URL (editable)
                  </Label>
                  <Input
                    id="previewDashboardUrl"
                    value={editableDashboardUrl}
                    onChange={(e) => setEditableDashboardUrl(e.target.value)}
                    data-testid="input-preview-dashboard-url"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Email Body Preview:</Label>
                  <div className="p-4 bg-muted rounded-md text-sm space-y-3" data-testid="text-email-preview">
                    <p>Hi{emailData.adminName ? ` ${emailData.adminName}` : ""},</p>
                    <p>
                      Welcome to Menu.ca! Your online ordering dashboard for <strong>{emailData.restaurantName || "Your Restaurant"}</strong> is ready.
                    </p>
                    <div className="bg-background p-3 rounded border">
                      <p className="font-medium mb-2">Your Login Details:</p>
                      <p>Dashboard: <span className="text-blue-600">{editableDashboardUrl}</span></p>
                      <p>Email: {emailData.adminEmail}</p>
                      <p>Temporary Password: <code className="bg-muted-foreground/20 px-1 rounded">{editablePassword}</code></p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You'll be prompted to reset your password on first login.
                    </p>
                    {employeeName && (
                      <p className="text-xs text-muted-foreground border-t pt-2">
                        Set up by: {employeeName}{employeeContact ? ` (${employeeContact})` : ""}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {emailSent && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md" data-testid="status-email-sent">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700 dark:text-green-400">
                Email sent successfully to {emailData.adminEmail}
              </span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSendEmail}
              disabled={!canSend() || sendEmailMutation.isPending}
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
