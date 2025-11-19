"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, X, Tag, UtensilsCrossed } from "lucide-react"

const addCuisineSchema = z.object({
  cuisine_name: z.string().min(1, "Please select a cuisine"),
})

const addTagSchema = z.object({
  tag_name: z.string().min(1, "Please select a tag"),
})

type AddCuisineFormValues = z.infer<typeof addCuisineSchema>
type AddTagFormValues = z.infer<typeof addTagSchema>

interface CategorizationProps {
  restaurantId: number
}

export function Categorization({ restaurantId }: CategorizationProps) {
  const [isCuisineDialogOpen, setIsCuisineDialogOpen] = useState(false)
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const { toast } = useToast()

  // Fetch restaurant cuisines
  const { data: restaurantCuisines = [], isLoading: isLoadingCuisines } = useQuery<any[]>({
    queryKey: ['/api/restaurants', restaurantId, 'cuisines'],
  })

  // Fetch restaurant tags
  const { data: restaurantTags = [], isLoading: isLoadingTags } = useQuery<any[]>({
    queryKey: ['/api/restaurants', restaurantId, 'tags'],
  })

  // Fetch all available cuisines
  const { data: allCuisines = [] } = useQuery<any[]>({
    queryKey: ['/api/cuisines'],
  })

  // Fetch all available tags
  const { data: allTags = [] } = useQuery<any[]>({
    queryKey: ['/api/tags'],
  })

  const cuisineForm = useForm<AddCuisineFormValues>({
    resolver: zodResolver(addCuisineSchema),
    defaultValues: {
      cuisine_name: "",
    },
  })

  const tagForm = useForm<AddTagFormValues>({
    resolver: zodResolver(addTagSchema),
    defaultValues: {
      tag_name: "",
    },
  })

  // Add cuisine mutation
  const addCuisine = useMutation({
    mutationFn: async (data: AddCuisineFormValues) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/cuisines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add cuisine')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'cuisines'] })
      toast({ title: "Success", description: "Cuisine added successfully" })
      setIsCuisineDialogOpen(false)
      cuisineForm.reset()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  // Add tag mutation
  const addTag = useMutation({
    mutationFn: async (data: AddTagFormValues) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add tag')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'tags'] })
      toast({ title: "Success", description: "Tag added successfully" })
      setIsTagDialogOpen(false)
      tagForm.reset()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  // Remove cuisine mutation
  const removeCuisine = useMutation({
    mutationFn: async (cuisineId: number) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/cuisines/${cuisineId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to remove cuisine')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'cuisines'] })
      toast({ title: "Success", description: "Cuisine removed successfully" })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  // Remove tag mutation
  const removeTag = useMutation({
    mutationFn: async (tagId: number) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/tags/${tagId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to remove tag')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'tags'] })
      toast({ title: "Success", description: "Tag removed successfully" })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const handleCuisineSubmit = (data: AddCuisineFormValues) => {
    addCuisine.mutate(data)
  }

  const handleTagSubmit = (data: AddTagFormValues) => {
    addTag.mutate(data)
  }

  // Group tags by category
  const tagsByCategory = restaurantTags.reduce((acc: any, item: any) => {
    const tag = item.restaurant_tags
    if (tag) {
      if (!acc[tag.category]) {
        acc[tag.category] = []
      }
      acc[tag.category].push(tag)
    }
    return acc
  }, {})

  // Get available cuisines (not already added)
  const assignedCuisineIds = new Set(
    restaurantCuisines.map((item: any) => item.cuisine_types?.id).filter(Boolean)
  )
  const availableCuisines = allCuisines.filter(
    (cuisine: any) => !assignedCuisineIds.has(cuisine.id)
  )

  // Get available tags (not already added)
  const assignedTagIds = new Set(
    restaurantTags.map((item: any) => item.restaurant_tags?.id).filter(Boolean)
  )
  const availableTags = allTags.filter(
    (tag: any) => !assignedTagIds.has(tag.id)
  )

  // Group available tags by category for the dropdown
  const availableTagsByCategory = availableTags.reduce((acc: any, tag: any) => {
    if (!acc[tag.category]) {
      acc[tag.category] = []
    }
    acc[tag.category].push(tag)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Cuisines Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Cuisines
              </CardTitle>
              <CardDescription>Cuisine types for restaurant discovery</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCuisineDialogOpen(true)}
              disabled={availableCuisines.length === 0}
              data-testid="button-add-cuisine"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Cuisine
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingCuisines ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : restaurantCuisines.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {restaurantCuisines.map((item: any) => (
                <Badge
                  key={item.cuisine_types?.id}
                  variant={item.is_primary ? "default" : "secondary"}
                  className="flex items-center gap-2"
                  data-testid={`badge-cuisine-${item.cuisine_types?.id}`}
                >
                  {item.cuisine_types?.name}
                  {item.is_primary && <span className="text-xs">(Primary)</span>}
                  <button
                    onClick={() => removeCuisine.mutate(item.cuisine_types?.id)}
                    className="ml-1 hover:opacity-70"
                    disabled={removeCuisine.isPending}
                    data-testid={`button-remove-cuisine-${item.cuisine_types?.id}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No cuisines assigned yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </CardTitle>
              <CardDescription>Feature tags for filtering and discovery</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setIsTagDialogOpen(true)}
              disabled={availableTags.length === 0}
              data-testid="button-add-tag"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tag
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTags ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : Object.keys(tagsByCategory).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(tagsByCategory).map(([category, tags]: [string, any]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                    {category}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: any) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="flex items-center gap-2"
                        data-testid={`badge-tag-${tag.id}`}
                      >
                        {tag.name}
                        <button
                          onClick={() => removeTag.mutate(tag.id)}
                          className="ml-1 hover:opacity-70"
                          disabled={removeTag.isPending}
                          data-testid={`button-remove-tag-${tag.id}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No tags assigned yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Cuisine Dialog */}
      <Dialog open={isCuisineDialogOpen} onOpenChange={setIsCuisineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cuisine</DialogTitle>
            <DialogDescription>
              Select a cuisine type to add to this restaurant
            </DialogDescription>
          </DialogHeader>
          <Form {...cuisineForm}>
            <form onSubmit={cuisineForm.handleSubmit(handleCuisineSubmit)} className="space-y-4">
              <FormField
                control={cuisineForm.control}
                name="cuisine_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuisine</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-cuisine">
                          <SelectValue placeholder="Select a cuisine" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableCuisines.map((cuisine: any) => (
                          <SelectItem key={cuisine.id} value={cuisine.name}>
                            {cuisine.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      First cuisine will be set as primary
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCuisineDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addCuisine.isPending} data-testid="button-submit-cuisine">
                  {addCuisine.isPending ? 'Adding...' : 'Add Cuisine'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
            <DialogDescription>
              Select a tag to add to this restaurant
            </DialogDescription>
          </DialogHeader>
          <Form {...tagForm}>
            <form onSubmit={tagForm.handleSubmit(handleTagSubmit)} className="space-y-4">
              <FormField
                control={tagForm.control}
                name="tag_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tag">
                          <SelectValue placeholder="Select a tag" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(availableTagsByCategory).map(([category, tags]: [string, any]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-sm font-semibold capitalize text-muted-foreground">
                              {category}
                            </div>
                            {tags.map((tag: any) => (
                              <SelectItem key={tag.id} value={tag.name}>
                                {tag.name}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Tags help customers discover your restaurant
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsTagDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addTag.isPending} data-testid="button-submit-tag">
                  {addTag.isPending ? 'Adding...' : 'Add Tag'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
