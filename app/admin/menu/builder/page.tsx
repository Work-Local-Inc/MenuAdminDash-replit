"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SearchableRestaurantSelect } from "@/components/admin/searchable-restaurant-select";
import { useRestaurants } from "@/lib/hooks/use-restaurants";
import { useRouter, useSearchParams } from "next/navigation";
import { RestaurantMenuBuilder } from "@/components/restaurant/tabs/menu-builder";

export default function MenuBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialRestaurantId = searchParams.get("restaurant") || "";
  const [selectedRestaurantId, setSelectedRestaurantId] =
    useState<string>(initialRestaurantId);

  const { data: restaurants = [], isLoading: loadingRestaurants } =
    useRestaurants();

  useEffect(() => {
    const urlRestaurantId = searchParams.get("restaurant") || "";
    if (urlRestaurantId !== selectedRestaurantId) {
      setSelectedRestaurantId(urlRestaurantId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (
      !loadingRestaurants &&
      restaurants.length === 1 &&
      !selectedRestaurantId
    ) {
      const onlyRestaurant = restaurants[0];
      const restaurantId = onlyRestaurant?.id?.toString();
      if (restaurantId && searchParams.get("restaurant") !== restaurantId) {
        setSelectedRestaurantId(restaurantId);
        router.push(`/admin/menu/builder?restaurant=${restaurantId}`);
      }
    }
  }, [
    loadingRestaurants,
    restaurants,
    selectedRestaurantId,
    router,
    searchParams,
  ]);

  const handleRestaurantChange = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    if (restaurantId) {
      router.push(`/admin/menu/builder?restaurant=${restaurantId}`);
    } else {
      router.push("/admin/menu/builder");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1
          className="text-3xl font-bold tracking-tight"
          data-testid="text-page-title"
        >
          Menu Builder
        </h1>
        <p className="text-muted-foreground">
          Manage your complete menu in one place - categories, dishes, and
          modifier groups
        </p>
      </div>

      {/* Restaurant Selector - hidden when only one restaurant is available */}
      {(loadingRestaurants || restaurants.length > 1) && (
        <Card>
          <CardHeader>
            <CardTitle>Select Restaurant</CardTitle>
            <CardDescription>
              Choose a restaurant to manage its menu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchableRestaurantSelect
              restaurants={restaurants}
              value={selectedRestaurantId}
              onValueChange={handleRestaurantChange}
              isLoading={loadingRestaurants}
              placeholder="Select a restaurant"
              data-testid="select-restaurant"
            />
          </CardContent>
        </Card>
      )}

      {!selectedRestaurantId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium mb-2">No Restaurant Selected</p>
            <p className="text-muted-foreground">
              Please select a restaurant above to start building your menu
            </p>
          </CardContent>
        </Card>
      ) : (
        <RestaurantMenuBuilder restaurantId={selectedRestaurantId} />
      )}
    </div>
  );
}
