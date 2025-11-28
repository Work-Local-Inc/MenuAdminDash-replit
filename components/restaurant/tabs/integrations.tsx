"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plug, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

const integrationSchema = z.object({
  integration_type: z.enum(['POS', 'PAYMENT', 'DELIVERY', 'OTHER']),
  provider_name: z.string().min(1, 'Provider name is required'),
  api_key: z.string().optional(),
  api_secret: z.string().optional(),
  webhook_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  is_active: z.boolean().default(true),
  config: z.any().optional(),
})

type IntegrationFormData = z.infer<typeof integrationSchema>

interface Integration extends IntegrationFormData {
  id: number
  restaurant_id: number
  created_at: string
  updated_at: string
}

interface RestaurantIntegrationsProps {
  restaurantId: string
}

export function RestaurantIntegrations({ restaurantId }: RestaurantIntegrationsProps) {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null)
  const [deleteIntegration, setDeleteIntegration] = useState<Integration | null>(null)
  const [showApiKey, setShowApiKey] = useState<Record<number, boolean>>({})
  const [showApiSecret, setShowApiSecret] = useState<Record<number, boolean>>({})

  const { data: integrations = [], isLoading } = useQuery<Integration[]>({
    queryKey: ['/api/restaurants', restaurantId, 'integrations'],
  })

  const form = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationSchema) as any,
    defaultValues: {
      integration_type: 'POS',
      provider_name: '',
      api_key: '',
      api_secret: '',
      webhook_url: '',
      is_active: true,
      config: {},
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: IntegrationFormData) =>
      apiRequest(`/api/restaurants/${restaurantId}/integrations`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'integrations'] })
      toast({ title: 'Integration created successfully' })
      setIsDialogOpen(false)
      setEditingIntegration(null)
      form.reset()
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: IntegrationFormData }) =>
      apiRequest(`/api/restaurants/${restaurantId}/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'integrations'] })
      toast({ title: 'Integration updated successfully' })
      setIsDialogOpen(false)
      setEditingIntegration(null)
      form.reset()
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/restaurants/${restaurantId}/integrations/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'integrations'] })
      toast({ title: 'Integration deleted successfully' })
      setDeleteIntegration(null)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const onSubmit = (data: IntegrationFormData) => {
    if (editingIntegration) {
      updateMutation.mutate({ id: editingIntegration.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (integration: Integration) => {
    setEditingIntegration(integration)
    form.reset({
      integration_type: integration.integration_type,
      provider_name: integration.provider_name || '',
      api_key: integration.api_key || '',
      api_secret: integration.api_secret || '',
      webhook_url: integration.webhook_url || '',
      is_active: integration.is_active,
      config: integration.config || {},
    })
    setIsDialogOpen(true)
  }

  const handleAddNew = () => {
    setEditingIntegration(null)
    form.reset({
      integration_type: 'POS',
      provider_name: '',
      api_key: '',
      api_secret: '',
      webhook_url: '',
      is_active: true,
      config: {},
    })
    setIsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Manage third-party integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array(2).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
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
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Connect with POS, payment, and delivery systems</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew} data-testid="button-add-integration">
                <Plus className="h-4 w-4 mr-2" />
                Add Integration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingIntegration ? 'Edit Integration' : 'Add New Integration'}
                </DialogTitle>
                <DialogDescription>
                  Configure third-party service integration settings
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="integration_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Integration Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-integration-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="POS">POS System</SelectItem>
                              <SelectItem value="PAYMENT">Payment Gateway</SelectItem>
                              <SelectItem value="DELIVERY">Delivery Service</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="provider_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Square, Stripe, DoorDash"
                              data-testid="input-provider-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type="password"
                              placeholder="Enter API key"
                              data-testid="input-api-key"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          API key for authenticating with the service
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="api_secret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Secret</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Enter API secret"
                            data-testid="input-api-secret"
                          />
                        </FormControl>
                        <FormDescription>
                          API secret for secure authentication (if required)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="webhook_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://example.com/webhook"
                            data-testid="input-webhook-url"
                          />
                        </FormControl>
                        <FormDescription>
                          URL to receive webhook notifications from the service
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Enable or disable this integration
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false)
                        setEditingIntegration(null)
                        form.reset()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-integration"
                    >
                      {editingIntegration ? 'Update' : 'Create'} Integration
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {integrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Plug className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No integrations configured</p>
            <p className="text-sm text-muted-foreground">Add your first integration to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between p-4 border rounded-lg"
                data-testid={`integration-${integration.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium" data-testid={`text-provider-${integration.id}`}>
                      {integration.provider_name}
                    </h4>
                    <Badge variant="outline">{integration.integration_type}</Badge>
                    {integration.is_active ? (
                      <Badge variant="default" className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  {integration.api_key && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>API Key:</span>
                      <code className="px-2 py-1 bg-muted rounded text-xs">
                        {showApiKey[integration.id]
                          ? integration.api_key
                          : '••••••••••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          setShowApiKey((prev) => ({
                            ...prev,
                            [integration.id]: !prev[integration.id],
                          }))
                        }
                      >
                        {showApiKey[integration.id] ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  )}
                  {integration.webhook_url && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Webhook: {integration.webhook_url}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(integration)}
                    data-testid={`button-edit-${integration.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteIntegration(integration)}
                    data-testid={`button-delete-${integration.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={!!deleteIntegration}
        onOpenChange={() => setDeleteIntegration(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteIntegration?.provider_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteIntegration && deleteMutation.mutate(deleteIntegration.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
