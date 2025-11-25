"use client"

import { useEffect, useRef, useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { MapPin, Plus, Edit, Trash2, DollarSign, ShoppingCart } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import mapboxgl from "mapbox-gl"
import MapboxDraw from "@mapbox/mapbox-gl-draw"
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css"
import "mapbox-gl/dist/mapbox-gl.css"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

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

interface DeliveryArea {
  id: number
  restaurant_id: number
  name: string
  description: string | null
  delivery_fee: number
  min_order: number | null
  polygon: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  is_active: boolean
  created_at: string
}

interface RestaurantDeliveryAreasProps {
  restaurantId: string
}

export function RestaurantDeliveryAreas({ restaurantId }: RestaurantDeliveryAreasProps) {
  const { toast } = useToast()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  
  const [isDrawing, setIsDrawing] = useState(false)
  const [showAreaDialog, setShowAreaDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedArea, setSelectedArea] = useState<DeliveryArea | null>(null)
  const [drawnPolygon, setDrawnPolygon] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    delivery_fee: "",
    min_order: "",
    is_active: true,
  })

  const { data: areas = [], isLoading } = useQuery<DeliveryArea[]>({
    queryKey: ["/api/restaurants", restaurantId, "delivery-areas"],
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/restaurants/${restaurantId}/delivery-areas`, {
        method: "POST",
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "delivery-areas"] })
      setShowAreaDialog(false)
      resetForm()
      toast({ title: "Delivery area created", description: "The delivery zone has been added successfully" })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/restaurants/${restaurantId}/delivery-areas/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "delivery-areas"] })
      setShowAreaDialog(false)
      resetForm()
      toast({ title: "Delivery area updated", description: "The delivery zone has been updated successfully" })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/restaurants/${restaurantId}/delivery-areas/${id}`, {
        method: "DELETE",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "delivery-areas"] })
      setShowDeleteDialog(false)
      setSelectedArea(null)
      toast({ title: "Delivery area deleted", description: "The delivery zone has been removed" })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const [mapLoaded, setMapLoaded] = useState(false)
  
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-79.3832, 43.6532], // Default Toronto center, will be updated when areas load
        zoom: 10,
      })

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: "simple_select",
      })

      map.on("load", () => {
        map.addControl(draw)
        map.addControl(new mapboxgl.NavigationControl(), "top-right")
        
        mapRef.current = map
        drawRef.current = draw
        setMapLoaded(true)
        
        // Trigger resize after a short delay to ensure container is fully rendered
        setTimeout(() => {
          map.resize()
        }, 100)
        
        console.log("[Delivery Areas] Map loaded successfully")
      })

      map.on("draw.create", (e: any) => {
        const feature = e.features?.[0]
        setDrawnPolygon(feature)
        setIsDrawing(false)
        setShowAreaDialog(true)
      })

      map.on("draw.update", (e: any) => {
        const feature = e.features?.[0]
        setDrawnPolygon(feature)
      })

      // Use ResizeObserver to handle container size changes
      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize()
        }
      })
      
      if (mapContainerRef.current) {
        resizeObserver.observe(mapContainerRef.current)
      }

      return () => {
        resizeObserver.disconnect()
        mapRef.current = null
        drawRef.current = null
        setMapLoaded(false)
        map.remove()
      }
    } catch (error) {
      console.error("Failed to initialize Mapbox:", error)
      // WebGL not available - component will show table view only
    }
  }, [])

  useEffect(() => {
    // Only update map if map is loaded and we have areas
    if (!mapLoaded || !mapRef.current || !drawRef.current) return
    
    // Skip if currently editing
    if (showAreaDialog || selectedArea) return

    const map = mapRef.current

    try {
      // Clear MapboxDraw (only used for drawing new zones)
      drawRef.current.deleteAll()
      
      // Remove existing zone layers and sources
      areas.forEach((_, index) => {
        const layerId = `zone-fill-${index}`
        const outlineId = `zone-outline-${index}`
        const labelId = `zone-label-${index}`
        const sourceId = `zone-source-${index}`
        
        if (map.getLayer(layerId)) map.removeLayer(layerId)
        if (map.getLayer(outlineId)) map.removeLayer(outlineId)
        if (map.getLayer(labelId)) map.removeLayer(labelId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      })
      
      // Also clean up any extra layers from previous renders
      for (let i = areas.length; i < areas.length + 10; i++) {
        const layerId = `zone-fill-${i}`
        const outlineId = `zone-outline-${i}`
        const labelId = `zone-label-${i}`
        const sourceId = `zone-source-${i}`
        
        if (map.getLayer(layerId)) map.removeLayer(layerId)
        if (map.getLayer(outlineId)) map.removeLayer(outlineId)
        if (map.getLayer(labelId)) map.removeLayer(labelId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      }

      if (areas.length === 0) return

      // Calculate bounds from all polygons
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
      let hasPolygons = false

      areas.forEach((area, index) => {
        if (area.polygon && area.polygon.coordinates) {
          hasPolygons = true
          const color = ZONE_COLORS[index % ZONE_COLORS.length]
          const sourceId = `zone-source-${index}`
          
          // Calculate centroid for label placement
          const coords = area.polygon.coordinates[0]
          let centroidLng = 0, centroidLat = 0
          if (coords && coords.length > 0) {
            coords.forEach((coord: number[]) => {
              centroidLng += coord[0]
              centroidLat += coord[1]
              if (coord[0] < minLng) minLng = coord[0]
              if (coord[0] > maxLng) maxLng = coord[0]
              if (coord[1] < minLat) minLat = coord[1]
              if (coord[1] > maxLat) maxLat = coord[1]
            })
            centroidLng /= coords.length
            centroidLat /= coords.length
          }
          
          // Add source for this zone
          map.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {
                id: area.id,
                name: area.name,
                delivery_fee: area.delivery_fee,
              },
              geometry: area.polygon,
            }
          })
          
          // Add fill layer
          map.addLayer({
            id: `zone-fill-${index}`,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': color.fill,
              'fill-opacity': 0.35,
            }
          })
          
          // Add outline layer
          map.addLayer({
            id: `zone-outline-${index}`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': color.stroke,
              'line-width': 3,
            }
          })
          
          // Add label source and layer
          const labelSourceId = `zone-label-source-${index}`
          if (map.getSource(labelSourceId)) map.removeSource(labelSourceId)
          
          map.addSource(labelSourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {
                name: area.name,
                fee: `$${area.delivery_fee.toFixed(2)}`,
              },
              geometry: {
                type: 'Point',
                coordinates: [centroidLng, centroidLat]
              }
            }
          })
          
          map.addLayer({
            id: `zone-label-${index}`,
            type: 'symbol',
            source: labelSourceId,
            layout: {
              'text-field': ['get', 'name'],
              'text-size': 12,
              'text-anchor': 'center',
              'text-allow-overlap': false,
            },
            paint: {
              'text-color': color.stroke,
              'text-halo-color': '#ffffff',
              'text-halo-width': 2,
            }
          })
        }
      })
      
      // Fit map to bounds if we have polygons
      if (hasPolygons && minLng !== Infinity) {
        console.log("[Delivery Areas] Fitting map to bounds:", { minLng, maxLng, minLat, maxLat })
        map.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 50, duration: 1000 }
        )
      }
    } catch (error) {
      console.error("[Delivery Areas] Error updating map:", error)
    }
  }, [areas, showAreaDialog, selectedArea, mapLoaded])

  const startDrawing = () => {
    if (drawRef.current) {
      drawRef.current.changeMode("draw_polygon")
      setIsDrawing(true)
    }
  }

  const handleEdit = (area: DeliveryArea) => {
    setSelectedArea(area)
    setFormData({
      name: area.name,
      description: area.description || "",
      delivery_fee: area.delivery_fee.toString(),
      min_order: area.min_order?.toString() || "",
      is_active: area.is_active,
    })
    
    // Set the polygon for the form even if map isn't available
    if (area.polygon) {
      setDrawnPolygon({
        type: "Feature",
        properties: { id: area.id },
        geometry: area.polygon,
      })
    }
    
    // Update map if available
    if (mapLoaded && drawRef.current && area.polygon) {
      try {
        // Clear all features first
        drawRef.current.deleteAll()
        
        // Add the polygon to be edited and get the feature ID
        const addedFeatures = drawRef.current.add({
          type: "Feature",
          properties: { id: area.id },
          geometry: area.polygon,
        })
        
        // Get the full feature from MapboxDraw using the returned ID
        if (addedFeatures && addedFeatures[0]) {
          const featureId = addedFeatures[0]
          const fullFeature = drawRef.current.get(featureId as string)
          if (fullFeature) {
            setDrawnPolygon(fullFeature)
          }
        }
        
        // Center map on this polygon
        if (mapRef.current && area.polygon.coordinates) {
          const coords = area.polygon.coordinates[0]
          if (coords && coords.length > 0) {
            let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
            coords.forEach((coord: number[]) => {
              if (coord[0] < minLng) minLng = coord[0]
              if (coord[0] > maxLng) maxLng = coord[0]
              if (coord[1] < minLat) minLat = coord[1]
              if (coord[1] > maxLat) maxLat = coord[1]
            })
            mapRef.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 50 })
          }
        }
      } catch (error) {
        console.error("[Delivery Areas] Error updating map for edit:", error)
      }
    }
    
    setShowAreaDialog(true)
  }

  const handleDelete = (area: DeliveryArea) => {
    setSelectedArea(area)
    setShowDeleteDialog(true)
  }

  const handleSubmit = () => {
    if (!drawnPolygon) {
      toast({ title: "Error", description: "Please draw a delivery zone on the map", variant: "destructive" })
      return
    }

    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      delivery_fee: parseFloat(formData.delivery_fee),
      min_order: formData.min_order ? parseFloat(formData.min_order) : undefined,
      polygon: drawnPolygon.geometry,
      is_active: formData.is_active,
    }

    if (selectedArea) {
      updateMutation.mutate({ id: selectedArea.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", description: "", delivery_fee: "", min_order: "", is_active: true })
    setSelectedArea(null)
    setDrawnPolygon(null)
    if (mapLoaded && drawRef.current) {
      try {
        drawRef.current.deleteAll()
        areas.forEach((area) => {
          if (area.polygon && drawRef.current) {
            drawRef.current.add({
              type: "Feature",
              properties: { id: area.id, name: area.name },
              geometry: area.polygon,
            })
          }
        })
      } catch (error) {
        console.error("[Delivery Areas] Error resetting map:", error)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Delivery Areas</h3>
          <p className="text-sm text-muted-foreground">Draw delivery zones and set fees</p>
        </div>
        <Button size="sm" onClick={startDrawing} disabled={isDrawing} data-testid="button-draw-area">
          <Plus className="h-4 w-4 mr-2" />
          {isDrawing ? "Drawing..." : "Draw New Area"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div ref={mapContainerRef} className="w-full h-[380px]" data-testid="map-container" />
          </CardContent>
        </Card>

        <Card className="h-fit max-h-[420px] overflow-hidden flex flex-col">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Delivery Zones</CardTitle>
            <CardDescription className="text-xs">{areas.length} area{areas.length !== 1 ? 's' : ''} configured</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 overflow-y-auto flex-1">
            <div className="space-y-2">
              {areas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No delivery areas yet</p>
              ) : (
                areas.map((area, index) => {
                  const color = ZONE_COLORS[index % ZONE_COLORS.length]
                  return (
                    <div key={area.id} className="p-2 border rounded-md" data-testid={`area-${area.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex gap-2 flex-1 min-w-0">
                          <div 
                            className="w-3 h-3 rounded-sm shrink-0 mt-0.5" 
                            style={{ backgroundColor: color.fill, border: `2px solid ${color.stroke}` }}
                            aria-label={`Zone color: ${color.name}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm truncate">{area.name}</p>
                              {!area.is_active && <Badge variant="secondary" className="text-[10px] px-1 py-0">Off</Badge>}
                            </div>
                            {area.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{area.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-0.5">
                                <DollarSign className="h-3 w-3" />
                                ${area.delivery_fee.toFixed(2)}
                              </span>
                              {area.min_order && (
                                <span className="flex items-center gap-0.5">
                                  <ShoppingCart className="h-3 w-3" />
                                  Min ${area.min_order.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(area)} aria-label="Edit delivery area" data-testid={`button-edit-${area.id}`}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(area)} aria-label="Delete delivery area" data-testid={`button-delete-${area.id}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAreaDialog} onOpenChange={(open) => { setShowAreaDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedArea ? "Edit" : "Add"} Delivery Area</DialogTitle>
            <DialogDescription>Configure delivery zone details and pricing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="area-name">Area Name *</Label>
              <Input
                id="area-name"
                placeholder="e.g., Downtown Toronto"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-area-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area-description">Description</Label>
              <Textarea
                id="area-description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                data-testid="textarea-area-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-fee">Delivery Fee ($) *</Label>
                <Input
                  id="delivery-fee"
                  type="number"
                  step="0.01"
                  placeholder="5.00"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
                  data-testid="input-delivery-fee"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-order">Min Order ($)</Label>
                <Input
                  id="min-order"
                  type="number"
                  step="0.01"
                  placeholder="20.00"
                  value={formData.min_order}
                  onChange={(e) => setFormData({ ...formData, min_order: e.target.value })}
                  data-testid="input-min-order"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="is-active">Active Zone</Label>
              <Switch
                id="is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                data-testid="switch-is-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAreaDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-area">
              {selectedArea ? "Update" : "Create"} Area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Area</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedArea?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedArea && deleteMutation.mutate(selectedArea.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
