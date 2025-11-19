"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, MessageSquare, User, Calendar, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface FeedbackUser {
  id: string
  full_name: string | null
  email: string
}

interface Feedback {
  id: number
  restaurant_id: number
  user_id: string
  rating: number
  comment: string | null
  created_at: string
  admin_response: string | null
  response_at: string | null
  users: FeedbackUser | null
}

interface RestaurantFeedbackProps {
  restaurantId: string
}

export function RestaurantFeedback({ restaurantId }: RestaurantFeedbackProps) {
  const { toast } = useToast()
  const [selectedRating, setSelectedRating] = useState<string>("all")
  const [responseText, setResponseText] = useState<{ [key: number]: string }>({})

  const { data: feedback, isLoading, error, isError } = useQuery<Feedback[]>({
    queryKey: ["/api/restaurants", restaurantId, "feedback", selectedRating],
    queryFn: async () => {
      const url = selectedRating === "all" 
        ? `/api/restaurants/${restaurantId}/feedback`
        : `/api/restaurants/${restaurantId}/feedback?rating=${selectedRating}`
      const response = await fetch(url)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || "Failed to fetch feedback")
      }
      return response.json()
    },
  })

  const responseMutation = useMutation({
    mutationFn: async ({ feedbackId, response }: { feedbackId: number; response: string }) => {
      return apiRequest(`/api/restaurants/${restaurantId}/feedback/${feedbackId}`, {
        method: "PATCH",
        body: JSON.stringify({ admin_response: response }),
      })
    },
    onSuccess: () => {
      // Invalidate all feedback queries for this restaurant (all rating filters)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/api/restaurants" && 
          query.queryKey[1] === restaurantId && 
          query.queryKey[2] === "feedback"
      })
      setResponseText({})
      toast({
        title: "Response submitted",
        description: "Your response has been posted successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
    )
  }

  const handleSubmitResponse = (feedbackId: number) => {
    const response = responseText[feedbackId]?.trim()
    if (!response) {
      toast({
        title: "Error",
        description: "Response cannot be empty",
        variant: "destructive",
      })
      return
    }
    responseMutation.mutate({ feedbackId, response })
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Customer Feedback</h3>
        <Tabs value={selectedRating} onValueChange={setSelectedRating}>
          <TabsList>
            <TabsTrigger value="all" data-testid="filter-all">All</TabsTrigger>
            <TabsTrigger value="5" data-testid="filter-5-star">5⭐</TabsTrigger>
            <TabsTrigger value="4" data-testid="filter-4-star">4⭐</TabsTrigger>
            <TabsTrigger value="3" data-testid="filter-3-star">3⭐</TabsTrigger>
            <TabsTrigger value="2" data-testid="filter-2-star">2⭐</TabsTrigger>
            <TabsTrigger value="1" data-testid="filter-1-star">1⭐</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-destructive/10 p-3 mb-4">
              <MessageSquare className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to load feedback</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {error?.message || "An error occurred while fetching customer feedback"}
            </p>
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "feedback"] })}
              data-testid="button-retry-feedback"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && (!feedback || feedback.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No feedback yet</h3>
            <p className="text-sm text-muted-foreground text-center">
              {selectedRating === "all" 
                ? "Customer feedback will appear here once reviews are submitted"
                : `No ${selectedRating}-star reviews yet`
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Feedback List */}
      {!isLoading && !isError && feedback && feedback.length > 0 && (
        <div className="space-y-4">
          {feedback.map((item) => (
            <Card key={item.id} data-testid={`feedback-${item.id}`}>
              <CardHeader className="space-y-3">
                {/* Rating & User Info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    {renderStars(item.rating)}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span data-testid={`user-name-${item.id}`}>
                        {item.users?.full_name || item.users?.email || "Anonymous User"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span data-testid={`date-${item.id}`}>
                        {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" data-testid={`rating-badge-${item.id}`}>
                    {item.rating} Star{item.rating !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {/* User Comment */}
                {item.comment && (
                  <div className="pt-2 border-t">
                    <p className="text-sm" data-testid={`comment-${item.id}`}>
                      {item.comment}
                    </p>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Admin Response (if exists) */}
                {item.admin_response && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Admin Response</Badge>
                      {item.response_at && (
                        <span className="text-xs text-muted-foreground" data-testid={`response-date-${item.id}`}>
                          {format(new Date(item.response_at), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm" data-testid={`admin-response-${item.id}`}>
                      {item.admin_response}
                    </p>
                  </div>
                )}

                {/* Admin Response Form (only if no response exists) */}
                {!item.admin_response && (
                  <div className="space-y-3 pt-2 border-t">
                    <label className="text-sm font-medium">Admin Response</label>
                    <Textarea
                      placeholder="Write your response to this feedback..."
                      value={responseText[item.id] || ""}
                      onChange={(e) => setResponseText({ ...responseText, [item.id]: e.target.value })}
                      rows={3}
                      data-testid={`textarea-response-${item.id}`}
                    />
                    <Button
                      onClick={() => handleSubmitResponse(item.id)}
                      disabled={responseMutation.isPending || !responseText[item.id]?.trim()}
                      size="sm"
                      data-testid={`button-submit-response-${item.id}`}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {responseMutation.isPending ? "Submitting..." : "Submit Response"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
