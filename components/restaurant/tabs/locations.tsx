"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, MapPin, Pencil, Trash2 } from "lucide-react";
import { GooglePlacesAutocomplete } from "@/components/customer/google-places-autocomplete";

const locationSchema = z.object({
  street_address: z.string().min(1, "Street address is required"),
  city_id: z.coerce.number().positive("Please select a city"),
  province_id: z.coerce.number().positive("Please select a province"),
  postal_code: z
    .string()
    .min(1, "Postal code is required")
    .regex(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, "Invalid Canadian postal code"),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type LocationFormValues = z.infer<typeof locationSchema>;

interface RestaurantLocationsProps {
  restaurantId: string;
}

export function RestaurantLocations({
  restaurantId,
}: RestaurantLocationsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [addressText, setAddressText] = useState("");
  const [resolvedCity, setResolvedCity] = useState("");
  const [resolvedProvince, setResolvedProvince] = useState("");
  const { toast } = useToast();

  // Fetch locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["/api/restaurants", restaurantId, "locations"],
  });

  // Fetch provinces for dropdown
  const { data: provinces = [] } = useQuery({
    queryKey: ["/api/provinces"],
  });

  // Fetch cities for dropdown
  const { data: cities = [] } = useQuery({
    queryKey: ["/api/cities"],
  });

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema) as any,
    defaultValues: {
      street_address: "",
      city_id: 0,
      province_id: 0,
      postal_code: "",
      latitude: undefined,
      longitude: undefined,
      phone: "",
      email: "",
      is_primary: false,
      is_active: true,
    },
  });

  // Create location
  const createLocation = useMutation({
    mutationFn: async (data: LocationFormValues) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, restaurant_id: restaurantId }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/restaurants", restaurantId, "locations"],
      });
      toast({ title: "Success", description: "Location created successfully" });
      setIsDialogOpen(false);
      setAddressText("");
      setResolvedCity("");
      setResolvedProvince("");
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update location
  const updateLocation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: LocationFormValues;
    }) => {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/locations/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/restaurants", restaurantId, "locations"],
      });
      toast({ title: "Success", description: "Location updated successfully" });
      setIsDialogOpen(false);
      setEditingLocation(null);
      setAddressText("");
      setResolvedCity("");
      setResolvedProvince("");
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete location
  const deleteLocation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/locations/${id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/restaurants", restaurantId, "locations"],
      });
      toast({ title: "Success", description: "Location deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: LocationFormValues) => {
    if (editingLocation) {
      await updateLocation.mutateAsync({ id: editingLocation.id, data });
    } else {
      await createLocation.mutateAsync(data);
    }
  };

  const handleEdit = (location: any) => {
    setEditingLocation(location);
    setAddressText(location.street_address || "");
    setResolvedCity(getCityName(location.city_id));
    setResolvedProvince(getProvinceName(location.province_id));
    form.reset({
      street_address: location.street_address || "",
      city_id: location.city_id || 0,
      province_id: location.province_id || 0,
      postal_code: location.postal_code || "",
      latitude: location.latitude || undefined,
      longitude: location.longitude || undefined,
      phone: location.phone || "",
      email: location.email || "",
      is_primary: location.is_primary || false,
      is_active: location.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this location?")) {
      deleteLocation.mutate(id);
    }
  };

  const getCityName = (cityId: number) => {
    const city = cities.find((c: any) => c.id === cityId);
    return city?.name || `City #${cityId}`;
  };

  const getProvinceName = (provinceId: number) => {
    const province = provinces.find((p: any) => p.id === provinceId);
    return province?.short_name || `Province #${provinceId}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Restaurant Locations</CardTitle>
            <CardDescription>
              Manage physical locations for this restaurant
            </CardDescription>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingLocation(null);
                setAddressText("");
                setResolvedCity("");
                setResolvedProvince("");
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-add-location">
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingLocation ? "Edit Location" : "Add New Location"}
                </DialogTitle>
                <DialogDescription>
                  {editingLocation
                    ? "Update location details"
                    : "Add a new physical location"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="street_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <GooglePlacesAutocomplete
                            value={addressText}
                            onChange={(val) => {
                              setAddressText(val);
                              field.onChange(val);
                            }}
                            onAddressSelect={(address) => {
                              setAddressText(address.street_address);
                              form.setValue(
                                "street_address",
                                address.street_address,
                              );
                              if (address.postal_code) {
                                form.setValue(
                                  "postal_code",
                                  address.postal_code.toUpperCase(),
                                );
                              }
                              if (address.latitude)
                                form.setValue("latitude", address.latitude);
                              if (address.longitude)
                                form.setValue("longitude", address.longitude);

                              // Match city name to city_id
                              const matchedCity = cities.find(
                                (c: any) =>
                                  c.name.toLowerCase() ===
                                  address.city.toLowerCase(),
                              );
                              if (matchedCity) {
                                form.setValue("city_id", matchedCity.id);
                                setResolvedCity(matchedCity.name);
                              } else {
                                setResolvedCity(address.city || "");
                              }

                              // Match province short_name to province_id
                              const matchedProvince = provinces.find(
                                (p: any) => p.short_name === address.province,
                              );
                              if (matchedProvince) {
                                form.setValue(
                                  "province_id",
                                  matchedProvince.id,
                                );
                                setResolvedProvince(
                                  `${matchedProvince.name} (${matchedProvince.short_name})`,
                                );
                              } else {
                                setResolvedProvince(address.province || "");
                              }
                            }}
                            placeholder="Start typing an address..."
                            testId="input-street-address"
                          />
                        </FormControl>
                        <FormDescription>
                          Search for the address to auto-fill city, province,
                          postal code, and coordinates
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <Input
                        value={
                          resolvedCity || getCityName(form.watch("city_id"))
                        }
                        readOnly
                        className="bg-muted"
                        data-testid="input-city-display"
                      />
                      {form.watch("city_id") === 0 && resolvedCity && (
                        <p className="text-xs text-amber-600">
                          &quot;{resolvedCity}&quot; not in city list — select
                          manually:
                        </p>
                      )}
                      {form.watch("city_id") === 0 && (
                        <Select
                          onValueChange={(val) => {
                            form.setValue("city_id", parseInt(val));
                            const c = cities.find(
                              (c: any) => c.id === parseInt(val),
                            );
                            if (c) setResolvedCity(c.name);
                          }}
                          value={form.watch("city_id")?.toString()}
                        >
                          <SelectTrigger
                            data-testid="select-city-fallback"
                            className="mt-1"
                          >
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((city: any) => (
                              <SelectItem
                                key={city.id}
                                value={city.id.toString()}
                              >
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage>
                        {form.formState.errors.city_id?.message}
                      </FormMessage>
                    </FormItem>

                    <FormItem>
                      <FormLabel>Province</FormLabel>
                      <Input
                        value={
                          resolvedProvince ||
                          getProvinceName(form.watch("province_id"))
                        }
                        readOnly
                        className="bg-muted"
                        data-testid="input-province-display"
                      />
                      {form.watch("province_id") === 0 && (
                        <Select
                          onValueChange={(val) => {
                            form.setValue("province_id", parseInt(val));
                            const p = provinces.find(
                              (p: any) => p.id === parseInt(val),
                            );
                            if (p)
                              setResolvedProvince(
                                `${p.name} (${p.short_name})`,
                              );
                          }}
                          value={form.watch("province_id")?.toString()}
                        >
                          <SelectTrigger
                            data-testid="select-province-fallback"
                            className="mt-1"
                          >
                            <SelectValue placeholder="Select province" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinces.map((province: any) => (
                              <SelectItem
                                key={province.id}
                                value={province.id.toString()}
                              >
                                {province.name} ({province.short_name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage>
                        {form.formState.errors.province_id?.message}
                      </FormMessage>
                    </FormItem>

                    <FormField
                      control={form.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="H2X 3L4"
                              data-testid="input-postal-code"
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.000001"
                              placeholder="45.5017"
                              data-testid="input-latitude"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.000001"
                              placeholder="-73.5673"
                              data-testid="input-longitude"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(514) 555-0100"
                              data-testid="input-phone"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="location@restaurant.com"
                              data-testid="input-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="is_primary"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Primary Location
                            </FormLabel>
                            <FormDescription>
                              Set as the main location for this restaurant
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <FormDescription>
                              Location is currently operational
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingLocation(null);
                        setAddressText("");
                        setResolvedCity("");
                        setResolvedProvince("");
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createLocation.isPending || updateLocation.isPending
                      }
                      data-testid="button-submit-location"
                    >
                      {editingLocation ? "Update Location" : "Add Location"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
          </div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No locations found</p>
            <p className="text-sm text-muted-foreground">
              Add your first location to get started
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>City & Province</TableHead>
                  <TableHead>Postal Code</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location: any) => (
                  <TableRow
                    key={location.id}
                    data-testid={`row-location-${location.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {location.street_address}
                        {location.is_primary && (
                          <Badge
                            variant="default"
                            data-testid={`badge-primary-${location.id}`}
                          >
                            Primary
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getCityName(location.city_id)},{" "}
                      {getProvinceName(location.province_id)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {location.postal_code}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {location.latitude && location.longitude ? (
                        <span>
                          {location.latitude.toFixed(4)},{" "}
                          {location.longitude.toFixed(4)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={location.is_active ? "default" : "secondary"}
                      >
                        {location.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(location)}
                          data-testid={`button-edit-${location.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(location.id)}
                          data-testid={`button-delete-${location.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
