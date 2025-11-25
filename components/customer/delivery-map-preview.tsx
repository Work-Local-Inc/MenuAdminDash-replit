"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, CheckCircle, AlertCircle, DollarSign, ShoppingCart, MapIcon, Store } from "lucide-react"
import "mapbox-gl/dist/mapbox-gl.css"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const ZONE_COLORS = [
  { fill: '#3b82f6', stroke: '#1d4ed8', name: 'Blue' },
  { fill: '#10b981', stroke: '#059669', name: 'Green' },
  { fill: '#f59e0b', stroke: '#d97706', name: 'Amber' },
  { fill: '#ef4444', stroke: '#dc2626', name: 'Red' },
  { fill: '#8b5cf6', stroke: '#7c3aed', name: 'Purple' },
  { fill: '#ec4899', stroke: '#db2777', name: 'Pink' },
  { fill: '#06b6d4', stroke: '#0891b2', name: 'Cyan' },
  { fill: '#84cc16', stroke: '#65a30d', name: 'Lime' },
]

interface DeliveryZone {
  id: number
  name: string
  delivery_fee: number
  min_order: number | null
  polygon: {
    type: string
    coordinates: any
  }
}

interface DeliveryMapPreviewProps {
  latitude?: number
  longitude?: number
  address?: string
  restaurantId: number
  onZoneValidated?: (zone: DeliveryZone | null, isWithinZone: boolean) => void
}

export function DeliveryMapPreview({ 
  latitude, 
  longitude, 
  address,
  restaurantId,
  onZoneValidated 
}: DeliveryMapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const customerMarkerRef = useRef<any>(null)
  const restaurantMarkerRef = useRef<any>(null)
  
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [matchedZone, setMatchedZone] = useState<DeliveryZone | null>(null)
  const [isWithinDeliveryArea, setIsWithinDeliveryArea] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapboxLoaded, setMapboxLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [restaurantCenter, setRestaurantCenter] = useState<[number, number] | null>(null)

  const hasCustomerLocation = latitude !== undefined && longitude !== undefined

  const calculateZonesCenter = useCallback((zonesData: DeliveryZone[]): [number, number] | null => {
    if (!zonesData || zonesData.length === 0) return null
    
    const allCoords: number[][] = []
    zonesData.forEach(zone => {
      if (zone.polygon?.coordinates) {
        const coords = zone.polygon.coordinates
        if (zone.polygon.type === 'Polygon' && coords[0]) {
          allCoords.push(...coords[0])
        } else if (zone.polygon.type === 'MultiPolygon') {
          coords.forEach((poly: number[][][]) => {
            if (poly[0]) allCoords.push(...poly[0])
          })
        }
      }
    })
    
    if (allCoords.length === 0) return null
    
    const sumLng = allCoords.reduce((sum, coord) => sum + coord[0], 0)
    const sumLat = allCoords.reduce((sum, coord) => sum + coord[1], 0)
    return [sumLng / allCoords.length, sumLat / allCoords.length]
  }, [])

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      setMapError('Map configuration missing')
      setLoading(false)
      return
    }

    import('mapbox-gl').then((mapboxgl) => {
      mapboxgl.default.accessToken = MAPBOX_TOKEN
      setMapboxLoaded(true)
    }).catch(() => {
      setMapError('Failed to load map')
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxLoaded || !MAPBOX_TOKEN) return

    import('mapbox-gl').then((mapboxgl) => {
      if (!mapContainerRef.current) return

      const initialCenter: [number, number] = hasCustomerLocation 
        ? [longitude!, latitude!] 
        : restaurantCenter || [-79.3832, 43.6532]

      const map = new mapboxgl.default.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: initialCenter,
        zoom: 12,
        interactive: true,
        attributionControl: false,
      })

      map.addControl(new mapboxgl.default.NavigationControl({ showCompass: false }), "top-right")

      map.on("load", () => {
        mapRef.current = map
        setMapLoaded(true)
      })

      return () => {
        if (customerMarkerRef.current) {
          customerMarkerRef.current.remove()
        }
        if (restaurantMarkerRef.current) {
          restaurantMarkerRef.current.remove()
        }
        map.remove()
        mapRef.current = null
      }
    })
  }, [mapboxLoaded, hasCustomerLocation, latitude, longitude, restaurantCenter])

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const url = hasCustomerLocation
          ? `/api/customer/validate-delivery?restaurantId=${restaurantId}&lat=${latitude}&lng=${longitude}`
          : `/api/customer/validate-delivery?restaurantId=${restaurantId}`
        
        const response = await fetch(url)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('[DeliveryMap] API error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch delivery zones')
        }
        
        const data = await response.json()
        const fetchedZones = data.zones || []
        setZones(fetchedZones)
        
        const center = calculateZonesCenter(fetchedZones)
        if (center) {
          setRestaurantCenter(center)
        }
        
        if (hasCustomerLocation) {
          setMatchedZone(data.matchedZone || null)
          setIsWithinDeliveryArea(data.isWithinDeliveryArea)
          
          if (onZoneValidated) {
            onZoneValidated(data.matchedZone || null, data.isWithinDeliveryArea)
          }
        }
      } catch (error) {
        console.error('[DeliveryMap] Error fetching zones:', error)
        if (hasCustomerLocation) {
          setIsWithinDeliveryArea(false)
          if (onZoneValidated) {
            onZoneValidated(null, false)
          }
        }
      } finally {
        setLoading(false)
      }
    }

    if (restaurantId) {
      fetchZones()
    }
  }, [restaurantId, latitude, longitude, hasCustomerLocation, onZoneValidated, calculateZonesCenter])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || !mapboxLoaded) return

    import('mapbox-gl').then((mapboxgl) => {
      if (restaurantCenter && !restaurantMarkerRef.current) {
        const restaurantEl = document.createElement('div')
        restaurantEl.className = 'restaurant-marker'
        restaurantEl.innerHTML = `
          <div style="
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg style="width: 18px; height: 18px; color: white;" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3L4 9v12h16V9l-8-6zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 8.5 12 8.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z"/>
            </svg>
          </div>
        `
        
        restaurantMarkerRef.current = new mapboxgl.default.Marker({ element: restaurantEl, anchor: 'center' })
          .setLngLat(restaurantCenter)
          .addTo(map)
      }

      if (hasCustomerLocation && latitude !== undefined && longitude !== undefined) {
        map.flyTo({
          center: [longitude, latitude],
          zoom: 13,
          duration: 1000,
        })

        if (customerMarkerRef.current) {
          customerMarkerRef.current.setLngLat([longitude, latitude])
        } else {
          const el = document.createElement('div')
          el.className = 'delivery-marker'
          el.innerHTML = `
            <div style="
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg style="transform: rotate(45deg); width: 20px; height: 20px; color: white;" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          `
          
          customerMarkerRef.current = new mapboxgl.default.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([longitude, latitude])
            .addTo(map)
        }
      }
    })
  }, [latitude, longitude, mapLoaded, mapboxLoaded, hasCustomerLocation, restaurantCenter])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded || zones.length === 0) return

    zones.forEach((zone, index) => {
      const sourceId = `zone-source-${index}`
      const fillId = `zone-fill-${index}`
      const outlineId = `zone-outline-${index}`
      const color = ZONE_COLORS[index % ZONE_COLORS.length]

      if (map.getLayer(fillId)) map.removeLayer(fillId)
      if (map.getLayer(outlineId)) map.removeLayer(outlineId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)

      if (zone.polygon && zone.polygon.coordinates) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: zone.name },
            geometry: zone.polygon,
          }
        })

        const isMatched = matchedZone?.id === zone.id

        map.addLayer({
          id: fillId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': isMatched ? '#22c55e' : color.fill,
            'fill-opacity': isMatched ? 0.4 : 0.2,
          }
        })

        map.addLayer({
          id: outlineId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': isMatched ? '#16a34a' : color.stroke,
            'line-width': isMatched ? 3 : 2,
          }
        })
      }
    })

    if (zones.length > 0) {
      const allCoords: number[][] = []
      zones.forEach(zone => {
        if (zone.polygon?.coordinates) {
          const coords = zone.polygon.coordinates
          if (zone.polygon.type === 'Polygon' && coords[0]) {
            allCoords.push(...coords[0])
          } else if (zone.polygon.type === 'MultiPolygon') {
            coords.forEach((poly: number[][][]) => {
              if (poly[0]) allCoords.push(...poly[0])
            })
          }
        }
      })
      
      if (allCoords.length > 0) {
        const bounds = allCoords.reduce((bounds, coord) => {
          return {
            minLng: Math.min(bounds.minLng, coord[0]),
            maxLng: Math.max(bounds.maxLng, coord[0]),
            minLat: Math.min(bounds.minLat, coord[1]),
            maxLat: Math.max(bounds.maxLat, coord[1]),
          }
        }, { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity })

        if (hasCustomerLocation && latitude !== undefined && longitude !== undefined) {
          bounds.minLng = Math.min(bounds.minLng, longitude)
          bounds.maxLng = Math.max(bounds.maxLng, longitude)
          bounds.minLat = Math.min(bounds.minLat, latitude)
          bounds.maxLat = Math.max(bounds.maxLat, latitude)
        }

        map.fitBounds(
          [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
          { padding: 50, duration: 1000 }
        )
      }
    }
  }, [zones, matchedZone, mapLoaded, latitude, longitude, hasCustomerLocation])

  return (
    <Card className="overflow-hidden" data-testid="delivery-map-preview">
      {mapError ? (
        <div className="w-full h-48 bg-muted flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MapIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Map preview unavailable</p>
          </div>
        </div>
      ) : (
        <div 
          ref={mapContainerRef} 
          className="w-full h-48 relative bg-muted"
          data-testid="delivery-map-container"
        >
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}
      
      <div className="p-4 space-y-3">
        {hasCustomerLocation && address ? (
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-delivery-address">
                {address}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Store className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" data-testid="text-delivery-zones-preview">
                Delivery Zones
              </p>
              <p className="text-xs text-muted-foreground">
                Enter your address to check if delivery is available
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{hasCustomerLocation ? 'Checking delivery availability...' : 'Loading delivery zones...'}</span>
          </div>
        ) : !hasCustomerLocation ? (
          zones.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {zones.slice(0, 4).map((zone, idx) => (
                <Badge key={zone.id} variant="outline" className="gap-1 text-xs" style={{ borderColor: ZONE_COLORS[idx % ZONE_COLORS.length].stroke }}>
                  {zone.name}: ${zone.delivery_fee.toFixed(2)}
                </Badge>
              ))}
              {zones.length > 4 && (
                <Badge variant="outline" className="gap-1 text-xs">
                  +{zones.length - 4} more
                </Badge>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700" data-testid="text-no-zones">
                No delivery zone restrictions
              </span>
            </div>
          )
        ) : isWithinDeliveryArea && matchedZone ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700" data-testid="text-delivery-available">
                Delivery available to your address
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1" data-testid="badge-delivery-fee">
                <DollarSign className="w-3 h-3" />
                Delivery: ${matchedZone.delivery_fee.toFixed(2)}
              </Badge>
              {matchedZone.min_order && matchedZone.min_order > 0 && (
                <Badge variant="outline" className="gap-1" data-testid="badge-min-order">
                  <ShoppingCart className="w-3 h-3" />
                  Min: ${matchedZone.min_order.toFixed(2)}
                </Badge>
              )}
            </div>
          </div>
        ) : zones.length === 0 ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700" data-testid="text-no-zones">
              No delivery zone restrictions
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700" data-testid="text-delivery-unavailable">
              This address is outside the delivery area
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
