"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Banknote, Smartphone, AlertCircle, Loader2, Save, AlertTriangle, CheckCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

const PAYMENT_OPTIONS = [
  { 
    type: 'cash', 
    defaultLabel: 'Cash',
    defaultLabelFr: 'Comptant',
    icon: Banknote,
    description: 'Cash payment on delivery or pickup'
  },
  { 
    type: 'credit_card', 
    defaultLabel: 'Credit Card',
    defaultLabelFr: 'Carte de crédit',
    icon: CreditCard,
    description: 'Online payment via Stripe (processed by Menu.ca)'
  },
  { 
    type: 'interac', 
    defaultLabel: 'Interac',
    defaultLabelFr: 'Interac',
    icon: Smartphone,
    description: 'Interac e-Transfer'
  },
  { 
    type: 'credit_or_debit_at_door', 
    defaultLabel: 'Credit or Debit at Door',
    defaultLabelFr: 'Crédit ou débit à la porte',
    icon: CreditCard,
    description: 'Pay with card at delivery'
  },
  { 
    type: 'credit_at_door', 
    defaultLabel: 'Credit at Door',
    defaultLabelFr: 'Crédit à la porte',
    icon: CreditCard,
    description: 'Pay with credit card at delivery'
  },
  { 
    type: 'debit_at_door', 
    defaultLabel: 'Debit at Door',
    defaultLabelFr: 'Débit à la porte',
    icon: CreditCard,
    description: 'Pay with debit card at delivery'
  },
] as const

type PaymentType = typeof PAYMENT_OPTIONS[number]['type']

interface PaymentOption {
  id?: number
  restaurant_id?: number
  payment_type: PaymentType
  enabled: boolean
  applies_to: 'both' | 'delivery' | 'pickup'
  label_en: string | null
  label_fr: string | null
  instructions_en: string | null
  instructions_fr: string | null
  display_order: number
}

interface RestaurantPaymentMethodsProps {
  restaurantId: string
}

interface ServiceConfig {
  id: number
  payment_mode: 'test' | 'live' | null
}

export function RestaurantPaymentMethods({ restaurantId }: RestaurantPaymentMethodsProps) {
  const { toast } = useToast()
  const [options, setOptions] = useState<PaymentOption[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  const { data: serviceConfig, isLoading: configLoading } = useQuery<ServiceConfig | null>({
    queryKey: ['/api/restaurants', restaurantId, 'service-config'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/service-config`)
      if (!res.ok) return null
      return res.json()
    },
  })

  const updatePaymentMode = useMutation({
    mutationFn: async (mode: 'test' | 'live') => {
      const method = serviceConfig ? 'PATCH' : 'POST'
      const url = serviceConfig 
        ? `/api/restaurants/${restaurantId}/service-config/${serviceConfig.id}`
        : `/api/restaurants/${restaurantId}/service-config`
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_mode: mode }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (_, mode) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'service-config'] })
      toast({ 
        title: mode === 'live' ? "Live Payments Enabled" : "Test Mode Enabled",
        description: mode === 'live' 
          ? "This restaurant will now process real payments" 
          : "This restaurant is now using test/sandbox payments"
      })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const paymentMode = serviceConfig?.payment_mode ?? 'test'
  const isLive = paymentMode === 'live'

  const { data: savedOptions = [], isLoading, error } = useQuery<PaymentOption[]>({
    queryKey: ['/api/restaurants', restaurantId, 'payment-options'],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${restaurantId}/payment-options`)
      if (!res.ok) {
        if (res.status === 500) {
          const errorText = await res.text()
          if (errorText.includes('does not exist')) {
            throw new Error('TABLE_NOT_EXIST')
          }
        }
        throw new Error('Failed to fetch payment options')
      }
      return res.json()
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  useEffect(() => {
    if (hasChanges) {
      return
    }
    
    const initialOptions: PaymentOption[] = PAYMENT_OPTIONS.map((opt, index) => {
      const saved = savedOptions.find(s => s.payment_type === opt.type)
      return {
        payment_type: opt.type,
        enabled: saved?.enabled ?? (opt.type === 'credit_card'),
        applies_to: saved?.applies_to ?? 'both',
        label_en: saved?.label_en ?? null,
        label_fr: saved?.label_fr ?? null,
        instructions_en: saved?.instructions_en ?? null,
        instructions_fr: saved?.instructions_fr ?? null,
        display_order: saved?.display_order ?? index,
      }
    })
    setOptions(initialOptions)
  }, [savedOptions, hasChanges])

  const updateMutation = useMutation({
    mutationFn: async (data: PaymentOption[]) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/payment-options`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update payment options')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'payment-options'] })
      toast({ title: "Success", description: "Payment options updated successfully" })
      setHasChanges(false)
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const handleToggle = (type: PaymentType, checked: boolean) => {
    setOptions(prev => prev.map(opt => 
      opt.payment_type === type 
        ? { ...opt, enabled: checked }
        : opt
    ))
    setHasChanges(true)
  }

  const handleLabelChange = (type: PaymentType, field: 'label_en' | 'label_fr', value: string) => {
    setOptions(prev => prev.map(opt => 
      opt.payment_type === type 
        ? { ...opt, [field]: value || null }
        : opt
    ))
    setHasChanges(true)
  }

  const handleSave = () => {
    updateMutation.mutate(options)
  }

  if (error && (error as Error).message === 'TABLE_NOT_EXIST') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Options</CardTitle>
          <CardDescription>Configure which payment methods your restaurant accepts</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The payment options table needs to be created. Please run the migration:
              <code className="ml-2 text-xs">migrations/016_restaurant_payment_options.sql</code>
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
          <CardTitle>Payment Options</CardTitle>
          <CardDescription>Configure which payment methods your restaurant accepts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className={isLive ? "border-green-500 bg-green-500/5" : "border-amber-500 bg-amber-500/5"}>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isLive ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              )}
              <div>
                <CardTitle className="flex items-center gap-2">
                  Payment Mode
                  <Badge variant={isLive ? "default" : "secondary"} className={isLive ? "bg-green-500" : "bg-amber-500"}>
                    {isLive ? "LIVE" : "TEST"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {isLive 
                    ? "Real payments are being processed. Customers will be charged."
                    : "Test mode - no real charges. Use test card 4242 4242 4242 4242"}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${!isLive ? "text-amber-600" : "text-muted-foreground"}`}>Test</span>
              <Switch
                checked={isLive}
                onCheckedChange={(checked) => updatePaymentMode.mutate(checked ? 'live' : 'test')}
                disabled={updatePaymentMode.isPending || configLoading}
                data-testid="switch-payment-mode"
              />
              <span className={`text-sm font-medium ${isLive ? "text-green-600" : "text-muted-foreground"}`}>Live</span>
            </div>
          </div>
        </CardHeader>
        {isLive && (
          <CardContent className="pt-0">
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                This restaurant is accepting real payments. All credit card transactions will charge the customer.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Payment Options</CardTitle>
            <CardDescription>
              Choose which payment methods customers can use. Credit card payments are processed by Menu.ca.
            </CardDescription>
          </div>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            data-testid="button-save-payment-options"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Update
          </Button>
        </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Choose Options</TableHead>
                <TableHead colSpan={2} className="text-center">Override Texts</TableHead>
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>English</TableHead>
                <TableHead>French</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PAYMENT_OPTIONS.map((paymentOpt) => {
                const option = options.find(o => o.payment_type === paymentOpt.type)
                const Icon = paymentOpt.icon
                
                return (
                  <TableRow key={paymentOpt.type}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={option?.enabled ?? false}
                          onCheckedChange={(checked) => handleToggle(paymentOpt.type, !!checked)}
                          data-testid={`checkbox-${paymentOpt.type}`}
                        />
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{paymentOpt.defaultLabel}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder={paymentOpt.defaultLabel}
                        value={option?.label_en || ''}
                        onChange={(e) => handleLabelChange(paymentOpt.type, 'label_en', e.target.value)}
                        className="h-9"
                        data-testid={`input-${paymentOpt.type}-en`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder={paymentOpt.defaultLabelFr}
                        value={option?.label_fr || ''}
                        onChange={(e) => handleLabelChange(paymentOpt.type, 'label_fr', e.target.value)}
                        className="h-9"
                        data-testid={`input-${paymentOpt.type}-fr`}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">How payments work:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong>Credit Card:</strong> Processed online by Menu.ca via Stripe</li>
            <li><strong>Cash:</strong> Customer pays in cash on delivery or pickup</li>
            <li><strong>At Door options:</strong> Customer pays with card using your terminal at delivery</li>
            <li><strong>Interac:</strong> Customer sends e-Transfer before delivery</li>
          </ul>
        </div>
      </CardContent>
      </Card>
    </div>
  )
}
