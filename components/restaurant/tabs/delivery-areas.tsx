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

      return () => {
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
    if (!mapLoaded || !mapRef.current || !drawRef.current || areas.length === 0) return
    
    // Skip if currently editing
    if (showAreaDialog || selectedArea) return

    try {
      drawRef.current.deleteAll()

      // Calculate bounds from all polygons
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
      let hasPolygons = false

      areas.forEach((area) => {
        if (area.polygon && area.polygon.coordinates && drawRef.current) {
          hasPolygons = true
          
          // Add polygon to map
          drawRef.current.add({
            type: "Feature",
            properties: {
              id: area.id,
              name: area.name,
              delivery_fee: area.delivery_fee,
            },
            geometry: area.polygon,
          })
          
          // Calculate bounds from coordinates
          const coords = area.polygon.coordinates[0] // First ring of polygon
          if (coords) {
            coords.forEach((coord: number[]) => {
              if (coord[0] < minLng) minLng = coord[0]
              if (coord[0] > maxLng) maxLng = coord[0]
              if (coord[1] < minLat) minLat = coord[1]
              if (coord[1] > maxLat) maxLat = coord[1]
            })
          }
        }
      })
      
      // Fit map to bounds if we have polygons
      if (hasPolygons && mapRef.current && minLng !== Infinity) {
        console.log("[Delivery Areas] Fitting map to bounds:", { minLng, maxLng, minLat, maxLat })
        mapRef.current.fitBounds(
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Delivery Areas</h3>
          <p className="text-sm text-muted-foreground">Draw delivery zones and set fees</p>
        </div>
        <Button onClick={startDrawing} disabled={isDrawing} data-testid="button-draw-area">
          <Plus className="h-4 w-4 mr-2" />
          {isDrawing ? "Drawing..." : "Draw New Area"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div ref={mapContainerRef} className="h-[500px] rounded-lg" data-testid="map-container" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery Zones</CardTitle>
              <CardDescription>{areas.length} area{areas.length !== 1 ? 's' : ''} configured</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {areas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No delivery areas yet</p>
              ) : (
                areas.map((area) => (
                  <div key={area.id} className="p-3 border rounded-lg space-y-2" data-testid={`area-${area.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{area.name}</p>
                          {!area.is_active && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                        {area.description && (
                          <p className="text-xs text-muted-foreground">{area.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>${area.delivery_fee.toFixed(2)}</span>
                      </div>
                      {area.min_order && (
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          <span>Min: ${area.min_order.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(area)} data-testid={`button-edit-${area.id}`}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(area)} data-testid={`button-delete-${area.id}`}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
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
