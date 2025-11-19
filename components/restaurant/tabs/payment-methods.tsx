"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, CreditCard, Pencil, Trash2, AlertCircle, Loader2 } from "lucide-react"

const paymentMethodSchema = z.object({
  payment_provider: z.enum(['stripe', 'square', 'paypal', 'cash', 'interac'], {
    required_error: "Please select a payment provider",
  }),
  provider_account_id: z.string().optional(),
  is_active: z.boolean().default(true),
})

type PaymentMethodFormValues = z.infer<typeof paymentMethodSchema>

interface PaymentMethod {
  id: number
  restaurant_id: number
  payment_provider: string
  provider_account_id: string | null
  is_active: boolean
  created_at: string
}

interface RestaurantPaymentMethodsProps {
  restaurantId: string
}

export function RestaurantPaymentMethods({ restaurantId }: RestaurantPaymentMethodsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const { toast } = useToast()

  const { data: methods = [], isLoading, error } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/restaurants', restaurantId, 'payment-methods'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/payment-methods`)
      if (!res.ok) {
        if (res.status === 500) {
          const errorText = await res.text()
          if (errorText.includes('does not exist')) {
            throw new Error('TABLE_NOT_EXIST')
          }
        }
        throw new Error('Failed to fetch payment methods')
      }
      return res.json()
    },
  })

  const form = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      payment_provider: 'stripe',
      provider_account_id: '',
      is_active: true,
    },
  })

  const createMethod = useMutation({
    mutationFn: async (data: PaymentMethodFormValues) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create payment method')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'payment-methods'] })
      toast({ title: "Success", description: "Payment method added successfully" })
      setIsDialogOpen(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const updateMethod = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PaymentMethodFormValues> }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/payment-methods/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update payment method')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'payment-methods'] })
      toast({ title: "Success", description: "Payment method updated successfully" })
      setIsDialogOpen(false)
      setEditingMethod(null)
      form.reset()
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const deleteMethod = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/payment-methods/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete payment method')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'payment-methods'] })
      toast({ title: "Success", description: "Payment method deleted successfully" })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const toggleActiveStatus = async (method: PaymentMethod) => {
    if (error && error.message === 'TABLE_NOT_EXIST') {
      toast({
        title: "Table Not Created",
        description: "Please create the restaurant_payment_methods table first",
        variant: "destructive"
      })
      return
    }
    
    updateMethod.mutate({
      id: method.id,
      data: { is_active: !method.is_active },
    })
  }

  const onSubmit = async (data: PaymentMethodFormValues) => {
    if (editingMethod) {
      await updateMethod.mutateAsync({ id: editingMethod.id, data })
    } else {
      await createMethod.mutateAsync(data)
    }
  }

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method)
    form.reset({
      payment_provider: method.payment_provider as any,
      provider_account_id: method.provider_account_id || '',
      is_active: method.is_active,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this payment method?")) {
      deleteMethod.mutate(id)
    }
  }

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, React.ReactNode> = {
      stripe: <CreditCard className="h-4 w-4" />,
      square: <CreditCard className="h-4 w-4" />,
      paypal: <CreditCard className="h-4 w-4" />,
      cash: <span className="text-xs font-bold">$</span>,
      interac: <CreditCard className="h-4 w-4" />,
    }
    return icons[provider.toLowerCase()] || <CreditCard className="h-4 w-4" />
  }

  if (error && error.message === 'TABLE_NOT_EXIST') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Configure accepted payment options</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The <code>restaurant_payment_methods</code> table needs to be created in the database.
              Please run the following SQL in your Supabase database:
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
{`CREATE TABLE menuca_v3.restaurant_payment_methods (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES menuca_v3.restaurants(id),
  payment_provider VARCHAR(50) NOT NULL,
  provider_account_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`}
              </pre>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Configure accepted payment options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Configure accepted payment options for your restaurant</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingMethod(null)
              form.reset()
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-payment-method">
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMethod ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
                <DialogDescription>
                  {editingMethod ? "Update payment method details" : "Add a new payment method for your restaurant"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="payment_provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Provider</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-provider">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="stripe">Stripe</SelectItem>
                            <SelectItem value="square">Square</SelectItem>
                            <SelectItem value="paypal">PayPal</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="interac">Interac</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="provider_account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider Account ID (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="acct_1234567890"
                            {...field}
                            data-testid="input-provider-account-id"
                          />
                        </FormControl>
                        <FormDescription>
                          Your account ID with the payment provider
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Enable this payment method for customer orders
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

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false)
                        setEditingMethod(null)
                        form.reset()
                      }}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMethod.isPending || updateMethod.isPending}
                      data-testid="button-submit"
                    >
                      {(createMethod.isPending || updateMethod.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingMethod ? "Update" : "Add"} Method
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {methods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No payment methods configured</p>
            <p className="text-sm text-muted-foreground">Add your first payment method to get started</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.map((method) => (
                  <TableRow key={method.id} data-testid={`row-payment-method-${method.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getProviderIcon(method.payment_provider)}
                        <span className="font-medium capitalize">{method.payment_provider}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {method.provider_account_id || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={method.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActiveStatus(method)}
                        data-testid={`badge-status-${method.id}`}
                      >
                        {method.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(method)}
                          data-testid={`button-edit-${method.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(method.id)}
                          data-testid={`button-delete-${method.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
