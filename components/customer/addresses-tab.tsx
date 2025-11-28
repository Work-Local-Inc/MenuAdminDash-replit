"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { MapPin, Plus, Edit, Trash2, Check, X } from 'lucide-react'

interface AddressesTabProps {
  userId: number
}

export function AddressesTab({ userId }: AddressesTabProps) {
  const { toast } = useToast()
  const supabase = createClient() as any
  
  const [addresses, setAddresses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Form fields
  const [addressLabel, setAddressLabel] = useState('')
  const [streetAddress, setStreetAddress] = useState('')
  const [unit, setUnit] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadAddresses()
  }, [userId])

  const loadAddresses = async () => {
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

      setAddresses(data || [])
    } catch (error: any) {
      console.error('Error loading addresses:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setAddressLabel('')
    setStreetAddress('')
    setUnit('')
    setPostalCode('')
    setDeliveryInstructions('')
    setEditingId(null)
    setShowAddForm(false)
  }

  const handleSave = async () => {
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
      const addressData = {
        user_id: userId,
        street_address: streetAddress,
        unit: unit || null,
        city_id: 1, // Toronto by default
        postal_code: postalCode.toUpperCase().replace(/\s/g, ''),
        delivery_instructions: deliveryInstructions || null,
        address_label: addressLabel || null,
        is_default: addresses.length === 0,
      }

      if (editingId) {
        const { error } = await supabase
          .from('user_delivery_addresses')
          .update(addressData as any)
          .eq('id', editingId)

        if (error) throw error

        toast({
          title: "Address updated",
          description: "Your delivery address has been updated",
        })
      } else {
        const { error } = await supabase
          .from('user_delivery_addresses')
          .insert(addressData as any)

        if (error) throw error

        toast({
          title: "Address saved",
          description: "Your delivery address has been saved",
        })
      }

      await loadAddresses()
      resetForm()
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

  const handleEdit = (address: any) => {
    setEditingId(address.id)
    setAddressLabel(address.address_label || '')
    setStreetAddress(address.street_address)
    setUnit(address.unit || '')
    setPostalCode(address.postal_code)
    setDeliveryInstructions(address.delivery_instructions || '')
    setShowAddForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_delivery_addresses')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Address deleted",
        description: "Your delivery address has been removed",
      })

      await loadAddresses()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete address",
        variant: "destructive",
      })
    }
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
    <div className="space-y-4">
      {/* Saved Addresses */}
      {addresses.map((address) => (
        <Card key={address.id} data-testid={`address-card-${address.id}`}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {address.address_label && (
                      <span className="font-medium">{address.address_label}</span>
                    )}
                    {address.is_default && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <p className="text-sm">
                    {address.street_address}
                    {address.unit && `, Unit ${address.unit}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {address.city?.name}, {address.postal_code}
                  </p>
                  {address.delivery_instructions && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Instructions: {address.delivery_instructions}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(address)}
                  data-testid={`button-edit-address-${address.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(address.id)}
                  data-testid={`button-delete-address-${address.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add/Edit Address Form */}
      {showAddForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Address' : 'Add New Address'}</CardTitle>
            <CardDescription>
              {editingId ? 'Update your delivery address' : 'Add a new delivery address'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={submitting}
                data-testid="button-cancel"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={submitting}
                className="flex-1"
                data-testid="button-save-address"
              >
                <Check className="w-4 h-4 mr-2" />
                {submitting ? "Saving..." : "Save Address"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          onClick={() => setShowAddForm(true)}
          className="w-full"
          variant="outline"
          data-testid="button-add-address"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Address
        </Button>
      )}
    </div>
  )
}
