export default function RestaurantLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-muted rounded animate-pulse" />
                <div className="h-8 w-64 bg-muted rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Nav Skeleton */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-24 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      
      {/* Menu Grid Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-card border rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
