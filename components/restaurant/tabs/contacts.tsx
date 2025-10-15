"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface RestaurantContactsProps {
  restaurantId: string
}

export function RestaurantContacts({ restaurantId }: RestaurantContactsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>Manage restaurant contact persons</CardDescription>
          </div>
          <Button data-testid="button-add-contact">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Contact management coming soon...</p>
      </CardContent>
    </Card>
  )
}
