"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, UserCircle, Pencil, Trash2, Mail, Phone } from "lucide-react"

const contactSchema = z.object({
  title: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  receives_orders: z.boolean().default(false),
  receives_statements: z.boolean().default(false),
  receives_marketing: z.boolean().default(false),
  preferred_language: z.enum(["en", "fr"]).default("en"),
  is_active: z.boolean().default(true),
})

type ContactFormValues = z.infer<typeof contactSchema>

interface RestaurantContactsProps {
  restaurantId: string
}

export function RestaurantContacts({ restaurantId }: RestaurantContactsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<any>(null)
  const { toast } = useToast()

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'contacts'],
  })

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      title: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      receives_orders: false,
      receives_statements: false,
      receives_marketing: false,
      preferred_language: "en",
      is_active: true,
    },
  })

  // Create contact
  const createContact = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, restaurant_id: restaurantId }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'contacts'] })
      toast({ title: "Success", description: "Contact created successfully" })
      setIsDialogOpen(false)
      form.reset()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  // Update contact
  const updateContact = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ContactFormValues }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'contacts'] })
      toast({ title: "Success", description: "Contact updated successfully" })
      setIsDialogOpen(false)
      setEditingContact(null)
      form.reset()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  // Delete contact
  const deleteContact = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/contacts/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'contacts'] })
      toast({ title: "Success", description: "Contact deleted successfully" })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const onSubmit = async (data: ContactFormValues) => {
    if (editingContact) {
      await updateContact.mutateAsync({ id: editingContact.id, data })
    } else {
      await createContact.mutateAsync(data)
    }
  }

  const handleEdit = (contact: any) => {
    setEditingContact(contact)
    form.reset({
      title: contact.title || "",
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      receives_orders: contact.receives_orders || false,
      receives_statements: contact.receives_statements || false,
      receives_marketing: contact.receives_marketing || false,
      preferred_language: contact.preferred_language || "en",
      is_active: contact.is_active ?? true,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      deleteContact.mutate(id)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Restaurant Contacts</CardTitle>
            <CardDescription>Manage contact persons for this restaurant</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingContact(null)
              form.reset()
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-contact">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
                <DialogDescription>
                  {editingContact ? "Update contact details" : "Add a new contact person"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Manager, Owner, etc." data-testid="input-title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" data-testid="input-first-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" data-testid="input-last-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (Optional)</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contact@restaurant.com" data-testid="input-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="(514) 555-0100" data-testid="input-phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="preferred_language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Language</FormLabel>
                        <FormControl>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                value="en"
                                checked={field.value === "en"}
                                onChange={() => field.onChange("en")}
                                data-testid="radio-lang-en"
                              />
                              English
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                value="fr"
                                checked={field.value === "fr"}
                                onChange={() => field.onChange("fr")}
                                data-testid="radio-lang-fr"
                              />
                              French
                            </label>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-sm font-medium">Communication Preferences</p>
                    
                    <FormField
                      control={form.control}
                      name="receives_orders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-receives-orders"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Receives Orders</FormLabel>
                            <FormDescription>
                              Contact will receive order notifications
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="receives_statements"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-receives-statements"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Receives Statements</FormLabel>
                            <FormDescription>
                              Contact will receive financial statements
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="receives_marketing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-receives-marketing"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Receives Marketing</FormLabel>
                            <FormDescription>
                              Contact will receive marketing communications
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-active"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Active Contact</FormLabel>
                            <FormDescription>
                              Contact is currently active
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false)
                        setEditingContact(null)
                        form.reset()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createContact.isPending || updateContact.isPending}
                      data-testid="button-submit-contact"
                    >
                      {editingContact ? "Update Contact" : "Add Contact"}
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
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No contacts found</p>
            <p className="text-sm text-muted-foreground">Add your first contact to get started</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Receives</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact: any) => (
                  <TableRow key={contact.id} data-testid={`row-contact-${contact.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </div>
                        {contact.title && (
                          <div className="text-sm text-muted-foreground">{contact.title}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {contact.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.receives_orders && <Badge variant="outline" className="text-xs">Orders</Badge>}
                        {contact.receives_statements && <Badge variant="outline" className="text-xs">Statements</Badge>}
                        {contact.receives_marketing && <Badge variant="outline" className="text-xs">Marketing</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="uppercase text-sm">{contact.preferred_language || "EN"}</TableCell>
                    <TableCell>
                      <Badge variant={contact.is_active ? "default" : "secondary"}>
                        {contact.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(contact)}
                          data-testid={`button-edit-${contact.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(contact.id)}
                          data-testid={`button-delete-${contact.id}`}
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
