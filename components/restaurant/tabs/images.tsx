"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, Trash2, GripVertical, ImagePlus, Edit } from "lucide-react"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

interface RestaurantImage {
  id: number
  restaurant_id: number
  image_url: string
  description: string | null
  display_order: number
  created_at: string
}

interface RestaurantImagesProps {
  restaurantId: string
}

export function RestaurantImages({ restaurantId }: RestaurantImagesProps) {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editingImage, setEditingImage] = useState<RestaurantImage | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [localImages, setLocalImages] = useState<RestaurantImage[]>([])

  const { data: images = [], isLoading } = useQuery<RestaurantImage[]>({
    queryKey: ['/api/restaurants', restaurantId, 'images'],
  })
  
  // Sync local images with query data (only when not dragging)
  useEffect(() => {
    if (draggedIndex === null) {
      setLocalImages(images)
    }
  }, [images, draggedIndex])

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Upload to Supabase Storage
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'restaurant-images')
      formData.append('folder', `restaurant-${restaurantId}`)

      const uploadResponse = await apiRequest('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })

      // Create database record
      return apiRequest(`/api/restaurants/${restaurantId}/images`, {
        method: 'POST',
        body: JSON.stringify({
          image_url: uploadResponse.url,
          display_order: images.length,
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'images'] })
      setSelectedFile(null)
      toast({ title: 'Image uploaded successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ imageId, description }: { imageId: number; description: string }) =>
      apiRequest(`/api/restaurants/${restaurantId}/images`, {
        method: 'PATCH',
        body: JSON.stringify({
          image_id: imageId,
          description,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'images'] })
      setEditingImage(null)
      toast({ title: 'Description updated successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const reorderMutation = useMutation({
    mutationFn: async (imageOrders: { id: number; display_order: number }[]) =>
      apiRequest(`/api/restaurants/${restaurantId}/images/reorder`, {
        method: 'POST',
        body: JSON.stringify({ imageOrders }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'images'] })
      toast({ title: 'Images reordered successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (imageId: number) =>
      apiRequest(`/api/restaurants/${restaurantId}/images?image_id=${imageId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'images'] })
      toast({ title: 'Image deleted successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      await uploadMutation.mutateAsync(selectedFile)
    } finally {
      setUploading(false)
    }
  }

  const handleEditDescription = (image: RestaurantImage) => {
    setEditingImage(image)
    setEditDescription(image.description || '')
  }

  const handleSaveDescription = () => {
    if (!editingImage) return
    updateMutation.mutate({
      imageId: editingImage.id,
      description: editDescription,
    })
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    // Update local state to show visual feedback
    const newImages = [...localImages]
    const draggedItem = newImages[draggedIndex]
    newImages.splice(draggedIndex, 1)
    newImages.splice(index, 0, draggedItem)

    setLocalImages(newImages)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedIndex === null) return

    // Create array of {id, display_order} for all images based on current local order
    const imageOrders = localImages.map((img, idx) => ({
      id: img.id,
      display_order: idx,
    }))

    // Submit batch update
    reorderMutation.mutate(imageOrders)
    
    setDraggedIndex(null)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Image Gallery</CardTitle>
          <CardDescription>Manage restaurant photos and gallery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Image Gallery</CardTitle>
              <CardDescription>Manage restaurant photos - drag to reorder</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="max-w-xs"
                data-testid="input-image-upload"
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                data-testid="button-upload-image"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {localImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImagePlus className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No images yet. Upload your first image to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {localImages.map((image, index) => (
                <div
                  key={image.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className="relative group cursor-move border rounded-lg overflow-hidden hover-elevate"
                  data-testid={`image-card-${image.id}`}
                >
                  <div className="absolute top-2 left-2 z-10 bg-background/80 rounded-md p-1">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <img
                    src={image.image_url}
                    alt={image.description || 'Restaurant image'}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="text-xs text-white line-clamp-2">
                      {image.description || 'No description'}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleEditDescription(image)}
                      data-testid={`button-edit-${image.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(image.id)}
                      data-testid={`button-delete-${image.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image Description</DialogTitle>
            <DialogDescription>
              Add a description to help users understand this image
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Enter image description..."
              rows={3}
              maxLength={500}
              data-testid="textarea-description"
            />
            <p className="text-xs text-muted-foreground">
              {editDescription.length}/500 characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingImage(null)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDescription}
              disabled={updateMutation.isPending}
              data-testid="button-save-description"
            >
              Save Description
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
