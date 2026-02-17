"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Info } from "lucide-react";
import { SearchableRestaurantSelect } from "@/components/admin/searchable-restaurant-select";
import { useRestaurants } from "@/lib/hooks/use-restaurants";
import { RestaurantModifierGroups } from "@/components/restaurant/tabs/modifier-groups";

export default function ModifierGroupsPage() {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  const { data: restaurants = [], isLoading: loadingRestaurants } =
    useRestaurants();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            data-testid="text-page-title"
          >
            Modifier Groups
          </h1>
          <p
            className="text-muted-foreground mt-1"
            data-testid="text-page-description"
          >
            Manage modifier groups for your restaurant categories
          </p>
        </div>
      </div>

      {/* Restaurant Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="restaurant-select" className="min-w-fit">
              Select Restaurant
            </Label>
            <div className="w-full max-w-md">
              <SearchableRestaurantSelect
                restaurants={restaurants}
                value={selectedRestaurantId}
                onValueChange={setSelectedRestaurantId}
                isLoading={loadingRestaurants}
                placeholder="Choose a restaurant..."
                data-testid="select-restaurant"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedRestaurantId ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Info className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Select a Restaurant</h3>
            <p className="text-muted-foreground">
              Choose a restaurant above to view and manage its modifier groups
            </p>
          </CardContent>
        </Card>
      ) : (
        <RestaurantModifierGroups restaurantId={selectedRestaurantId} />
      )}
    </div>
  );
}
