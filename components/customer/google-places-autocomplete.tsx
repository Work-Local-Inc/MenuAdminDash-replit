"use client"

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useLoadScript } from '@react-google-maps/api'

const libraries: ("places")[] = ["places"]

interface GooglePlacesAutocompleteProps {
  onAddressSelect: (address: {
    street_address: string
    city: string
    province: string
    postal_code: string
    country: string
  }) => void
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  testId?: string
}

export function GooglePlacesAutocomplete({
  onAddressSelect,
  value,
  onChange,
  placeholder = "Start typing your address...",
  disabled = false,
  testId = "input-google-address"
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
    libraries,
  })

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return

    // Initialize Google Places Autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "ca" }, // Restrict to Canada
      fields: ["address_components", "formatted_address"],
      types: ["address"],
    })

    // Listen for place selection
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place || !place.address_components) return

      const components = place.address_components
      const addressData = {
        street_address: '',
        city: '',
        province: '',
        postal_code: '',
        country: 'Canada'
      }

      // Parse address components
      let streetNumber = ''
      let route = ''

      components.forEach(component => {
        const types = component.types
        
        if (types.includes('street_number')) {
          streetNumber = component.long_name
        }
        if (types.includes('route')) {
          route = component.long_name
        }
        if (types.includes('locality')) {
          addressData.city = component.long_name
        }
        if (types.includes('administrative_area_level_1')) {
          addressData.province = component.short_name
        }
        if (types.includes('postal_code')) {
          addressData.postal_code = component.long_name
        }
        if (types.includes('country')) {
          addressData.country = component.long_name
        }
      })

      // Combine street number and route
      addressData.street_address = `${streetNumber} ${route}`.trim()

      // Update input value
      onChange(addressData.street_address)

      // Notify parent component
      onAddressSelect(addressData)
    })

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isLoaded, onAddressSelect, onChange])

  if (loadError) {
    console.error('Google Maps load error:', loadError)
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Error loading address lookup. Enter manually."
        disabled={disabled}
        data-testid={testId}
      />
    )
  }

  if (!isLoaded) {
    return (
      <Input
        value={value}
        placeholder="Loading address lookup..."
        disabled={true}
        data-testid={testId}
      />
    )
  }

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      data-testid={testId}
      autoComplete="off"
    />
  )
}
