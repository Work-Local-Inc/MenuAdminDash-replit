"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard, Banknote, Smartphone, ArrowRight } from 'lucide-react'

interface PaymentOption {
  payment_type: string
  enabled: boolean
  applies_to: string
  label_en: string | null
  label_fr: string | null
  instructions_en: string | null
  instructions_fr: string | null
  display_order: number
}

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  credit_card: CreditCard,
  cash: Banknote,
  interac: Smartphone,
  credit_at_door: CreditCard,
  debit_at_door: CreditCard,
  credit_debit_at_door: CreditCard,
}

const DEFAULT_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  cash: 'Cash',
  interac: 'Interac e-Transfer',
  credit_at_door: 'Credit Card at Door',
  debit_at_door: 'Debit Card at Door',
  credit_debit_at_door: 'Credit or Debit at Door',
}

interface CheckoutPaymentSelectionProps {
  restaurantSlug: string
  orderType: 'delivery' | 'pickup'
  onSelect: (paymentType: string) => void
  onBack: () => void
  brandedButtonStyle?: React.CSSProperties
}

export function CheckoutPaymentSelection({
  restaurantSlug,
  orderType,
  onSelect,
  onBack,
  brandedButtonStyle,
}: CheckoutPaymentSelectionProps) {
  const [options, setOptions] = useState<PaymentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string>('')

  // Track if we should auto-advance when only credit card is available
  const [shouldAutoAdvance, setShouldAutoAdvance] = useState(false)

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch(
          `/api/customer/restaurants/${restaurantSlug}/payment-options?order_type=${orderType}`
        )
        if (res.ok) {
          const data = await res.json()
          setOptions(data)
          if (data.length === 1) {
            setSelected(data[0].payment_type)
            // Mark for auto-advance if only credit card is available
            if (data[0].payment_type === 'credit_card') {
              setShouldAutoAdvance(true)
            }
          } else if (data.length > 0) {
            const creditCard = data.find((o: PaymentOption) => o.payment_type === 'credit_card')
            if (creditCard) {
              setSelected('credit_card')
            } else {
              setSelected(data[0].payment_type)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch payment options:', error)
        setOptions([{ 
          payment_type: 'credit_card', 
          enabled: true, 
          applies_to: 'both',
          label_en: 'Credit Card',
          label_fr: null,
          instructions_en: null,
          instructions_fr: null,
          display_order: 0 
        }])
        setSelected('credit_card')
        setShouldAutoAdvance(true)
      } finally {
        setLoading(false)
      }
    }
    fetchOptions()
  }, [restaurantSlug, orderType])

  // Auto-advance to credit card payment when it's the only option
  useEffect(() => {
    if (shouldAutoAdvance && !loading) {
      onSelect('credit_card')
    }
  }, [shouldAutoAdvance, loading, onSelect])

  const handleContinue = () => {
    if (selected) {
      onSelect(selected)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Choose how you'd like to pay</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  // If auto-advancing, show nothing while transitioning
  if (shouldAutoAdvance) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Method
        </CardTitle>
        <CardDescription>Choose how you'd like to pay for your order</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selected} onValueChange={setSelected} className="space-y-3">
          {options.map((option) => {
            const Icon = PAYMENT_ICONS[option.payment_type] || CreditCard
            const label = option.label_en || DEFAULT_LABELS[option.payment_type] || option.payment_type
            
            return (
              <div key={option.payment_type} className="flex items-center space-x-3">
                <RadioGroupItem 
                  value={option.payment_type} 
                  id={option.payment_type}
                  data-testid={`radio-payment-${option.payment_type}`}
                />
                <Label 
                  htmlFor={option.payment_type} 
                  className="flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="font-medium">{label}</span>
                    {option.instructions_en && (
                      <p className="text-sm text-muted-foreground">{option.instructions_en}</p>
                    )}
                    {option.payment_type === 'cash' && (
                      <p className="text-sm text-muted-foreground">
                        Pay with cash when you receive your order
                      </p>
                    )}
                    {option.payment_type.includes('at_door') && (
                      <p className="text-sm text-muted-foreground">
                        Pay with card when your order arrives
                      </p>
                    )}
                  </div>
                </Label>
              </div>
            )
          })}
        </RadioGroup>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onBack} data-testid="button-payment-back">
            Back
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selected}
            className="flex-1"
            style={brandedButtonStyle}
            data-testid="button-payment-continue"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
