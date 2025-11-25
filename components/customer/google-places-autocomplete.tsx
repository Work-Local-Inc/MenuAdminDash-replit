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
    latitude?: number
    longitude?: number
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
  
  // Store callbacks in refs to prevent re-initialization on every render
  const onAddressSelectRef = useRef(onAddressSelect)
  const onChangeRef = useRef(onChange)
  
  // Update refs when callbacks change
  useEffect(() => {
    onAddressSelectRef.current = onAddressSelect
    onChangeRef.current = onChange
  }, [onAddressSelect, onChange])
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
    libraries,
  })

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return

    console.log('[Google Places] Initializing autocomplete')

    // Initialize Google Places Autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "ca" }, // Restrict to Canada
      fields: ["address_components", "formatted_address", "geometry"],
      types: ["address"],
    })

    // Listen for place selection
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place || !place.address_components) {
        console.log('[Google Places] No place data received')
        return
      }

      console.log('[Google Places] Place selected:', place.formatted_address)

      const components = place.address_components
      const addressData: {
        street_address: string
        city: string
        province: string
        postal_code: string
        country: string
        latitude?: number
        longitude?: number
      } = {
        street_address: '',
        city: '',
        province: '',
        postal_code: '',
        country: 'Canada',
        latitude: place.geometry?.location?.lat(),
        longitude: place.geometry?.location?.lng(),
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

      console.log('[Google Places] Parsed address:', addressData)

      // Update input value using ref
      onChangeRef.current(addressData.street_address)

      // Notify parent component using ref
      onAddressSelectRef.current(addressData)
    })

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [isLoaded]) // Only re-run when isLoaded changes

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
