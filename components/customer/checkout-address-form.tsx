"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { Plus, MapPin, Check } from 'lucide-react'

interface DeliveryAddress {
  id?: number
  address_label?: string
  street_address: string
  unit?: string
  city_id: number
  city_name?: string
  postal_code: string
  delivery_instructions?: string
}

interface CheckoutAddressFormProps {
  userId: number
  onAddressConfirmed: (address: DeliveryAddress) => void
}

export function CheckoutAddressForm({ userId, onAddressConfirmed }: CheckoutAddressFormProps) {
  const { toast } = useToast()
  const supabase = createClient()
  
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // New address form fields
  const [streetAddress, setStreetAddress] = useState('')
  const [unit, setUnit] = useState('')
  const [cityId, setCityId] = useState(1) // Toronto by default
  const [postalCode, setPostalCode] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [addressLabel, setAddressLabel] = useState('')

  useEffect(() => {
    loadSavedAddresses()
  }, [userId])

  const loadSavedAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('user_delivery_addresses')
        .select(`
          *,
          city:cities(name)
        `)
        .eq('user_id', userId)
        .order('is_default', { ascending: false })

      if (error) throw error

      const addresses = (data || []).map((addr: any) => ({
        id: addr.id,
        address_label: addr.address_label,
        street_address: addr.street_address,
        unit: addr.unit,
        city_id: addr.city_id,
        city_name: addr.city?.name,
        postal_code: addr.postal_code,
        delivery_instructions: addr.delivery_instructions,
      }))

      setSavedAddresses(addresses)
      
      // Auto-select default address
      const defaultAddr = addresses.find((a: any) => data.find((d: any) => d.id === a.id)?.is_default)
      if (defaultAddr?.id) {
        setSelectedAddressId(defaultAddr.id)
      }
    } catch (error: any) {
      console.error('Error loading addresses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNewAddress = async () => {
    if (!streetAddress || !postalCode) {
      toast({
        title: "Missing information",
        description: "Please fill in street address and postal code",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('user_delivery_addresses')
        .insert({
          user_id: userId,
          street_address: streetAddress,
          unit: unit || null,
          city_id: cityId,
          postal_code: postalCode.toUpperCase().replace(/\s/g, ''),
          delivery_instructions: deliveryInstructions || null,
          address_label: addressLabel || null,
          is_default: savedAddresses.length === 0, // First address is default
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Address saved",
        description: "Your delivery address has been saved",
      })

      // Reload addresses and select the new one
      await loadSavedAddresses()
      setSelectedAddressId(data.id)
      setShowNewAddressForm(false)
      
      // Reset form
      setStreetAddress('')
      setUnit('')
      setPostalCode('')
      setDeliveryInstructions('')
      setAddressLabel('')
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save address",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleContinue = () => {
    const selected = savedAddresses.find(a => a.id === selectedAddressId)
    if (!selected) {
      toast({
        title: "No address selected",
        description: "Please select a delivery address",
        variant: "destructive",
      })
      return
    }

    onAddressConfirmed(selected)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Address</CardTitle>
        <CardDescription>
          Where should we deliver your order?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Saved Addresses */}
        {savedAddresses.length > 0 && !showNewAddressForm && (
          <div className="space-y-3">
            <Label>Select a saved address</Label>
            <RadioGroup value={selectedAddressId?.toString()} onValueChange={(val) => setSelectedAddressId(parseInt(val))}>
              {savedAddresses.map((address) => (
                <div key={address.id} className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value={address.id!.toString()} id={`address-${address.id}`} data-testid={`radio-address-${address.id}`} />
                  <Label htmlFor={`address-${address.id}`} className="flex-1 cursor-pointer">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        {address.address_label && (
                          <p className="font-medium">{address.address_label}</p>
                        )}
                        <p className="text-sm">
                          {address.street_address}
                          {address.unit && `, Unit ${address.unit}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.city_name}, {address.postal_code}
                        </p>
                        {address.delivery_instructions && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Instructions: {address.delivery_instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Add New Address Button */}
        {!showNewAddressForm && (
          <Button
            variant="outline"
            onClick={() => setShowNewAddressForm(true)}
            className="w-full"
            data-testid="button-add-new-address"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Address
          </Button>
        )}

        {/* New Address Form */}
        {showNewAddressForm && (
          <div className="space-y-4 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">New Delivery Address</h3>
              {savedAddresses.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewAddressForm(false)}
                  data-testid="button-cancel-new-address"
                >
                  Cancel
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address-label">Label (optional)</Label>
              <Input
                id="address-label"
                placeholder="e.g., Home, Work, Office"
                value={addressLabel}
                onChange={(e) => setAddressLabel(e.target.value)}
                data-testid="input-address-label"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="street-address">Street Address *</Label>
              <Input
                id="street-address"
                placeholder="123 Main Street"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                required
                data-testid="input-street-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit/Apt (optional)</Label>
                <Input
                  id="unit"
                  placeholder="Unit 5B"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  data-testid="input-unit"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal-code">Postal Code *</Label>
                <Input
                  id="postal-code"
                  placeholder="M5V 3A8"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  required
                  data-testid="input-postal-code"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-instructions">Delivery Instructions (optional)</Label>
              <Textarea
                id="delivery-instructions"
                placeholder="e.g., Ring doorbell, leave at door"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                rows={2}
                data-testid="input-delivery-instructions"
              />
            </div>

            <Button
              onClick={handleSaveNewAddress}
              disabled={submitting}
              className="w-full"
              data-testid="button-save-new-address"
            >
              <Check className="w-4 h-4 mr-2" />
              {submitting ? "Saving..." : "Save Address"}
            </Button>
          </div>
        )}

        {/* Continue Button */}
        {!showNewAddressForm && savedAddresses.length > 0 && (
          <Button
            onClick={handleContinue}
            disabled={!selectedAddressId}
            className="w-full"
            size="lg"
            data-testid="button-continue-to-payment"
          >
            Continue to Payment
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
