"use client"

import { useState, useEffect } from "react"
import { useRestaurants, useDeleteRestaurant } from "@/lib/hooks/use-restaurants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Filter, MoreVertical, Plus, Download, Edit, Trash2, Copy, ExternalLink } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { createRestaurantSlug } from "@/lib/utils/slugify"

const provinces = ["All", "ON", "BC", "QC", "AB"]
const cities = ["All", "Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"]
const statuses = ["All", "active", "suspended", "inactive"]

export default function RestaurantsPage() {
  const [selectedRestaurants, setSelectedRestaurants] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [provinceFilter, setProvinceFilter] = useState("All")
  const [cityFilter, setCityFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")

  const { data: restaurants = [], isLoading } = useRestaurants({
    province: provinceFilter !== "All" ? provinceFilter : undefined,
    city: cityFilter !== "All" ? cityFilter : undefined,
    status: statusFilter !== "All" ? statusFilter : undefined,
    search: searchQuery || undefined,
  })
  
  const deleteRestaurant = useDeleteRestaurant()

  const filteredRestaurants = restaurants

  const toggleRestaurant = (id: number) => {
    setSelectedRestaurants(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    setSelectedRestaurants(
      selectedRestaurants.length === filteredRestaurants.length
        ? []
        : filteredRestaurants.map((r: any) => r.id)
    )
  }

  const exportToCSV = () => {
    const headers = ["ID", "Name", "Status", "City", "Province", "Orders", "Revenue"]
    const rows = filteredRestaurants.map((r: any) => [
      r.id, r.name, r.status, r.city, r.province, r.orders, r.revenue
    ])
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "restaurants.csv"
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Restaurants</h1>
          <p className="text-muted-foreground">
            Manage all restaurants on the platform
          </p>
        </div>
        <Link href="/admin/restaurants/add">
          <Button data-testid="button-add-restaurant">
            <Plus className="mr-2 h-4 w-4" />
            Add Restaurant
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Restaurants ({filteredRestaurants.length})</CardTitle>
          <CardDescription>
            Filter and manage your restaurant listings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-restaurants"
                />
              </div>
            </div>
            <Select value={provinceFilter} onValueChange={setProvinceFilter}>
              <SelectTrigger className="w-full md:w-[180px]" data-testid="select-province">
                <SelectValue placeholder="Province" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map(province => (
                  <SelectItem key={province} value={province}>{province}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full md:w-[180px]" data-testid="select-city">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportToCSV} data-testid="button-export">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedRestaurants.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-muted p-3">
              <span className="text-sm text-muted-foreground">
                {selectedRestaurants.length} selected
              </span>
              <Button variant="outline" size="sm" data-testid="button-bulk-activate">
                Activate
              </Button>
              <Button variant="outline" size="sm" data-testid="button-bulk-suspend">
                Suspend
              </Button>
              <Button variant="outline" size="sm" data-testid="button-bulk-delete">
                <Trash2 className="mr-2 h-3 w-3" />
                Delete
              </Button>
            </div>
          )}

          {/* Data Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRestaurants.length === filteredRestaurants.length}
                      onCheckedChange={toggleAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading restaurants...
                    </TableCell>
                  </TableRow>
                ) : filteredRestaurants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No restaurants found
                    </TableCell>
                  </TableRow>
                ) : filteredRestaurants.map((restaurant: any) => (
                  <TableRow key={restaurant.id} data-testid={`row-restaurant-${restaurant.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRestaurants.includes(restaurant.id)}
                        onCheckedChange={() => toggleRestaurant(restaurant.id)}
                        data-testid={`checkbox-restaurant-${restaurant.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono">{restaurant.id}</TableCell>
                    <TableCell className="font-medium">{restaurant.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          restaurant.status === "active" ? "default" :
                          restaurant.status === "suspended" ? "destructive" :
                          "secondary"
                        }
                      >
                        {restaurant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{restaurant.city || 'N/A'}, {restaurant.province || 'N/A'}</TableCell>
                    <TableCell className="text-right">{restaurant.orders || 0}</TableCell>
                    <TableCell className="text-right">{formatCurrency(restaurant.revenue || 0, 'CAD')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${restaurant.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild data-testid={`menu-view-menu-${restaurant.id}`}>
                            <Link href={`/r/${createRestaurantSlug(restaurant.id, restaurant.name)}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Menu
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem data-testid={`menu-edit-${restaurant.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem data-testid={`menu-clone-${restaurant.id}`}>
                            <Copy className="mr-2 h-4 w-4" />
                            Clone
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            data-testid={`menu-delete-${restaurant.id}`}
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this restaurant?')) {
                                deleteRestaurant.mutate(restaurant.id.toString())
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
