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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Globe,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
} from "lucide-react";

const subdomainSchema = z.object({
  subdomain: z
    .string()
    .min(1, "Subdomain is required")
    .regex(
      /^[a-z0-9]+([\.\-][a-z0-9]+)*$/,
      "Lowercase letters, numbers, dots and hyphens only",
    ),
  slug: z.string().min(1, "Slug is required"),
  name: z.string().min(1, "Display name is required"),
  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type SubdomainFormValues = z.infer<typeof subdomainSchema>;

interface RestaurantDomainsProps {
  restaurantId: string;
  restaurantName?: string;
  restaurantSlug?: string;
}

export function RestaurantDomains({
  restaurantId,
  restaurantName,
  restaurantSlug,
}: RestaurantDomainsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubdomain, setEditingSubdomain] = useState<any>(null);
  const { toast } = useToast();

  const { data: subdomains = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/restaurants", restaurantId, "subdomains"],
  });

  const form = useForm<SubdomainFormValues>({
    resolver: zodResolver(subdomainSchema) as any,
    defaultValues: {
      subdomain: "",
      slug: restaurantSlug || "",
      name: restaurantName || "",
      is_primary: false,
      is_active: true,
    },
  });

  const createSubdomain = useMutation({
    mutationFn: async (data: SubdomainFormValues) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/subdomains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create subdomain");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/restaurants", restaurantId, "subdomains"],
      });
      toast({
        title: "Success",
        description: "Subdomain created successfully",
      });
      setIsDialogOpen(false);
      form.reset({
        subdomain: "",
        slug: restaurantSlug || "",
        name: restaurantName || "",
        is_primary: false,
        is_active: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSubdomain = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<SubdomainFormValues>;
    }) => {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/subdomains/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update subdomain");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/restaurants", restaurantId, "subdomains"],
      });
      toast({
        title: "Success",
        description: "Subdomain updated successfully",
      });
      setIsDialogOpen(false);
      setEditingSubdomain(null);
      form.reset({
        subdomain: "",
        slug: restaurantSlug || "",
        name: restaurantName || "",
        is_primary: false,
        is_active: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSubdomain = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/subdomains/${id}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete subdomain");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/restaurants", restaurantId, "subdomains"],
      });
      toast({
        title: "Success",
        description: "Subdomain deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: SubdomainFormValues) => {
    if (editingSubdomain) {
      await updateSubdomain.mutateAsync({ id: editingSubdomain.id, data });
    } else {
      await createSubdomain.mutateAsync(data);
    }
  };

  const handleEdit = (subdomain: any) => {
    setEditingSubdomain(subdomain);
    form.reset({
      subdomain: subdomain.subdomain || "",
      slug: subdomain.slug || "",
      name: subdomain.name || "",
      is_primary: subdomain.is_primary ?? false,
      is_active: subdomain.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this subdomain?")) {
      deleteSubdomain.mutate(id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "URL copied to clipboard" });
  };

  const getFullUrl = (subdomain: string) => `https://${subdomain}.menuai.ca`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Subdomain Routing</CardTitle>
            <CardDescription>
              Manage custom subdomains for this restaurant (e.g.,
              yourrestaurant.menuai.ca)
            </CardDescription>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingSubdomain(null);
                form.reset({
                  subdomain: "",
                  slug: restaurantSlug || "",
                  name: restaurantName || "",
                  is_primary: false,
                  is_active: true,
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-add-subdomain">
                <Plus className="h-4 w-4 mr-2" />
                Add Subdomain
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingSubdomain ? "Edit Subdomain" : "Add New Subdomain"}
                </DialogTitle>
                <DialogDescription>
                  {editingSubdomain
                    ? "Update subdomain settings"
                    : "Create a new subdomain for this restaurant"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="subdomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subdomain</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              placeholder="myrestaurant"
                              data-testid="input-subdomain"
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value.toLowerCase())
                              }
                            />
                          </FormControl>
                          <span className="text-muted-foreground whitespace-nowrap">
                            .menuai.ca
                          </span>
                        </div>
                        <FormDescription>
                          The subdomain prefix (e.g., &quot;myrestaurant&quot;
                          for myrestaurant.menuai.ca)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Restaurant Slug</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="my-restaurant-123"
                            data-testid="input-slug"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          The URL slug for routing (usually restaurant-name-id)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="My Restaurant"
                            data-testid="input-name"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          The display name shown in the browser
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-4">
                    <FormField
                      control={form.control}
                      name="is_primary"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 flex-1">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Primary</FormLabel>
                            <FormDescription>
                              Main subdomain for this location
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
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 flex-1">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <FormDescription>
                              Subdomain is accessible
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
                        setEditingSubdomain(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createSubdomain.isPending || updateSubdomain.isPending
                      }
                      data-testid="button-submit-subdomain"
                    >
                      {editingSubdomain ? "Update Subdomain" : "Add Subdomain"}
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
            {Array(2)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
          </div>
        ) : subdomains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No subdomains configured</p>
            <p className="text-sm text-muted-foreground">
              Add a subdomain to enable custom URLs like
              yourrestaurant.menuai.ca
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subdomain URL</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subdomains.map((subdomain: any) => (
                  <TableRow
                    key={subdomain.id}
                    data-testid={`row-subdomain-${subdomain.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {subdomain.subdomain}.menuai.ca
                        </span>
                        {subdomain.is_primary && (
                          <Badge variant="secondary">Primary</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            copyToClipboard(getFullUrl(subdomain.subdomain))
                          }
                          data-testid={`button-copy-${subdomain.id}`}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <a
                          href={getFullUrl(subdomain.subdomain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {subdomain.slug}
                    </TableCell>
                    <TableCell>
                      {subdomain.is_active ? (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <XCircle className="h-4 w-4" />
                          <span>Inactive</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(subdomain)}
                          data-testid={`button-edit-${subdomain.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(subdomain.id)}
                          data-testid={`button-delete-${subdomain.id}`}
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
