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
import { Plus, MapPin, Check, Shield, UserCircle } from 'lucide-react'
import { GooglePlacesAutocomplete } from './google-places-autocomplete'
import Link from 'next/link'

interface DeliveryAddress {
  id?: number
  address_label?: string
  street_address: string
  unit?: string
  city_id?: number // Optional for guest checkout
  city_name?: string
  city?: string // City string from Google Places (for guests)
  province?: string // Province string from Google Places (for guests)
  postal_code: string
  delivery_instructions?: string
  email?: string // For guest checkouts
}

interface CheckoutAddressFormProps {
  userId?: number // Optional for guest checkout
  onAddressConfirmed: (address: DeliveryAddress) => void
  onSignInClick?: () => void // Optional callback for sign in button
}

export function CheckoutAddressForm({ userId, onAddressConfirmed, onSignInClick }: CheckoutAddressFormProps) {
  const { toast } = useToast()
  const supabase = createClient()
  
  // Derive guest status from userId
  const isGuest = !userId
  
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(isGuest) // Auto-show for guests
  const [loading, setLoading] = useState(!isGuest) // Skip loading for guests
  const [submitting, setSubmitting] = useState(false)
  
  // New address form fields
  const [email, setEmail] = useState('') // For guest checkout
  const [streetAddress, setStreetAddress] = useState('')
  const [unit, setUnit] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [addressLabel, setAddressLabel] = useState('')

  useEffect(() => {
    if (!isGuest && userId) {
      loadSavedAddresses()
    }
  }, [userId, isGuest])

  const loadSavedAddresses = async () => {
    if (!userId) return
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
      const defaultAddr = addresses.find((a: any) => (data as any[]).find((d: any) => d.id === a.id)?.is_default)
      if (defaultAddr?.id) {
        setSelectedAddressId(defaultAddr.id)
      }
    } catch (error: any) {
      console.error('Error loading addresses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAddress = async () => {
    // Validate address fields first
    if (!streetAddress || !postalCode) {
      toast({
        title: "Missing information",
        description: "Please fill in street address and postal code",
        variant: "destructive",
      })
      return
    }

    // Guest-specific validation
    if (isGuest && (!email || !email.includes('@'))) {
      toast({
        title: "Email required",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      if (isGuest) {
        // GUEST: Skip API, directly pass address to parent
        const guestAddress: DeliveryAddress = {
          street_address: streetAddress,
          unit: unit || undefined,
          city: city, // From Google Places autocomplete
          province: province, // From Google Places autocomplete
          postal_code: postalCode.toUpperCase().replace(/\s/g, ''),
          delivery_instructions: deliveryInstructions || undefined,
          email: email,
          // DO NOT include city_id for guests
        }
        
        onAddressConfirmed(guestAddress)
      } else {
        // AUTHENTICATED: Save to database via API
        const response = await fetch('/api/customer/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            street_address: streetAddress,
            unit: unit || null,
            city_id: null,
            postal_code: postalCode.toUpperCase().replace(/\s/g, ''),
            delivery_instructions: deliveryInstructions || null,
            address_label: addressLabel || null,
            is_default: savedAddresses.length === 0,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to save address')
        }

        const savedAddress = await response.json()

        toast({
          title: "Address saved",
          description: "Your delivery address has been saved",
        })

        // Pass the saved address directly to continue to payment
        onAddressConfirmed(savedAddress)
      }
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
          {isGuest ? 'Enter your delivery information to continue' : 'Where should we deliver your order?'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Guest Sign-In Prompt */}
        {isGuest && onSignInClick && (
          <div className="bg-muted/50 border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <UserCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Have an account?</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Sign in to use saved addresses and track your orders
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onSignInClick}
                  data-testid="button-sign-in-address-form"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        )}

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

        {/* Continue Button for Saved Address */}
        {savedAddresses.length > 0 && !showNewAddressForm && (
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
              <h3 className="font-medium">{isGuest ? 'Delivery Information' : 'New Delivery Address'}</h3>
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

            {/* Email field for guest checkout */}
            {isGuest && (
              <div className="space-y-2">
                <Label htmlFor="guest-email">Email Address *</Label>
                <Input
                  id="guest-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-guest-email"
                />
                <p className="text-xs text-muted-foreground">
                  We'll send your order confirmation to this email
                </p>
              </div>
            )}

            {!isGuest && (
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
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="street-address">Street Address *</Label>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3" />
                  <span>Verified address</span>
                </div>
              </div>
              <GooglePlacesAutocomplete
                value={streetAddress}
                onChange={setStreetAddress}
                onAddressSelect={(address) => {
                  setStreetAddress(address.street_address)
                  setCity(address.city)
                  setProvince(address.province)
                  setPostalCode(address.postal_code)
                }}
                placeholder="Start typing your address..."
                testId="input-street-address"
              />
              <p className="text-xs text-muted-foreground">
                Select from dropdown to verify address and prevent fraud
              </p>
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
                  onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                  required
                  data-testid="input-postal-code"
                  disabled={!!(city && province)} // Disabled when Google Places fills it
                  className={city && province ? "bg-muted" : ""}
                />
                {postalCode && (
                  <p className="text-xs text-muted-foreground">
                    {city && province 
                      ? `✓ Auto-filled from Google Places (${city}, ${province})` 
                      : 'Enter manually if Google Places unavailable'}
                  </p>
                )}
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
              onClick={handleSubmitAddress}
              disabled={submitting}
              className="w-full"
              size="lg"
              data-testid={isGuest ? "button-guest-continue" : "button-save-new-address"}
            >
              <Check className="w-4 h-4 mr-2" />
              {submitting ? "Processing..." : (isGuest ? "Continue to Payment" : "Save & Continue to Payment")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
