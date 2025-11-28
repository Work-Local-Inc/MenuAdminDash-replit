"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Globe, Shield, CheckCircle, XCircle, Pencil, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

const domainSchema = z.object({
  domain: z.string().min(1, "Domain is required").regex(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/, "Invalid domain format"),
  domain_type: z.string().default("custom"),
  is_enabled: z.boolean().default(true),
})

type DomainFormValues = z.infer<typeof domainSchema>

interface RestaurantDomainsProps {
  restaurantId: string
}

export function RestaurantDomains({ restaurantId }: RestaurantDomainsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDomain, setEditingDomain] = useState<any>(null)
  const { toast } = useToast()

  // Fetch domains
  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'domains'],
  })

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema) as any,
    defaultValues: {
      domain: "",
      domain_type: "custom",
      is_enabled: true,
    },
  })

  // Create domain
  const createDomain = useMutation({
    mutationFn: async (data: DomainFormValues) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, restaurant_id: restaurantId }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'domains'] })
      toast({ title: "Success", description: "Domain created successfully" })
      setIsDialogOpen(false)
      form.reset()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  // Update domain
  const updateDomain = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DomainFormValues }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/domains/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'domains'] })
      toast({ title: "Success", description: "Domain updated successfully" })
      setIsDialogOpen(false)
      setEditingDomain(null)
      form.reset()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  // Delete domain
  const deleteDomain = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/domains/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'domains'] })
      toast({ title: "Success", description: "Domain deleted successfully" })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const onSubmit = async (data: DomainFormValues) => {
    if (editingDomain) {
      await updateDomain.mutateAsync({ id: editingDomain.id, data })
    } else {
      await createDomain.mutateAsync(data)
    }
  }

  const handleEdit = (domain: any) => {
    setEditingDomain(domain)
    form.reset({
      domain: domain.domain || "",
      domain_type: domain.domain_type || "custom",
      is_enabled: domain.is_enabled ?? true,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this domain?")) {
      deleteDomain.mutate(id)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Custom Domains</CardTitle>
            <CardDescription>Manage custom domains and SSL certificates</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingDomain(null)
              form.reset()
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-domain">
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingDomain ? "Edit Domain" : "Add New Domain"}</DialogTitle>
                <DialogDescription>
                  {editingDomain ? "Update domain settings" : "Add a custom domain"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="restaurant.example.com" 
                            data-testid="input-domain"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the full domain name (e.g., restaurant.example.com)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="domain_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-domain-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="custom">Custom Domain</SelectItem>
                            <SelectItem value="subdomain">Subdomain</SelectItem>
                            <SelectItem value="primary">Primary Domain</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enabled</FormLabel>
                          <FormDescription>
                            Domain is active and accessible
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-enabled"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false)
                        setEditingDomain(null)
                        form.reset()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createDomain.isPending || updateDomain.isPending}
                      data-testid="button-submit-domain"
                    >
                      {editingDomain ? "Update Domain" : "Add Domain"}
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
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No domains found</p>
            <p className="text-sm text-muted-foreground">Add your first custom domain to get started</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>SSL Status</TableHead>
                  <TableHead>DNS Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain: any) => (
                  <TableRow key={domain.id} data-testid={`row-domain-${domain.id}`}>
                    <TableCell className="font-mono">{domain.domain}</TableCell>
                    <TableCell className="capitalize">{domain.domain_type || "custom"}</TableCell>
                    <TableCell>
                      {domain.ssl_verified ? (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Verified</span>
                          {domain.ssl_expires_at && (
                            <span className="text-muted-foreground ml-2">
                              (Expires {formatDate(domain.ssl_expires_at)})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <XCircle className="h-4 w-4" />
                          <span>Not Verified</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {domain.dns_verified ? (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <XCircle className="h-4 w-4" />
                          <span>Not Verified</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={domain.is_enabled ? "default" : "secondary"}>
                        {domain.is_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(domain)}
                          data-testid={`button-edit-${domain.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(domain.id)}
                          data-testid={`button-delete-${domain.id}`}
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
  )
}
