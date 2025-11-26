"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useDevices, useToggleDevice } from "@/lib/hooks/use-devices"
import { formatDate, formatTime } from "@/lib/utils"
import { Search, Plus, Tablet, Wifi, WifiOff, Printer, Settings } from "lucide-react"
import { toast } from "sonner"

export default function DevicesPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const { data: devices = [], isLoading } = useDevices(
    statusFilter !== "all" ? { is_active: statusFilter === "active" } : undefined
  )
  const toggleDevice = useToggleDevice()

  const filteredDevices = devices.filter((device: any) => {
    const searchLower = search.toLowerCase()
    return (
      device.device_name?.toLowerCase().includes(searchLower) ||
      device.restaurant_name?.toLowerCase().includes(searchLower) ||
      device.uuid?.toLowerCase().includes(searchLower)
    )
  })

  const handleToggleActive = async (device: any) => {
    try {
      await toggleDevice.mutateAsync({
        id: device.id,
        is_active: !device.is_active,
      })
      toast.success(
        device.is_active
          ? `Device "${device.device_name}" deactivated`
          : `Device "${device.device_name}" activated`
      )
    } catch (error: any) {
      toast.error(error.message || "Failed to update device")
    }
  }

  // Stats
  const totalDevices = devices.length
  const activeDevices = devices.filter((d: any) => d.is_active).length
  const onlineDevices = devices.filter((d: any) => d.is_online).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground">Manage tablet devices for order printing</p>
        </div>
        <Link href="/admin/devices/register">
          <Button data-testid="button-register-device">
            <Plus className="h-4 w-4 mr-2" />
            Register Device
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Tablet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDevices}</div>
            <p className="text-xs text-muted-foreground">Registered devices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDevices}</div>
            <p className="text-xs text-muted-foreground">Enabled for operation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Now</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onlineDevices}</div>
            <p className="text-xs text-muted-foreground">Connected in last 2 min</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by device name, restaurant, or UUID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Devices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Devices</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `Showing ${filteredDevices.length} devices`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-12">
              <Tablet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No devices found</p>
              <Link href="/admin/devices/register">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Register Your First Device
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Device Name</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device: any) => (
                    <TableRow key={device.id} data-testid={`row-device-${device.id}`}>
                      <TableCell>
                        {device.is_online ? (
                          <Badge variant="default" className="bg-green-500">
                            <Wifi className="h-3 w-3 mr-1" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <WifiOff className="h-3 w-3 mr-1" />
                            Offline
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{device.device_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {device.uuid?.substring(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {device.restaurant_name || (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {device.last_check_at ? (
                          <div>
                            <div>{formatDate(device.last_check_at)}</div>
                            <div>{formatTime(device.last_check_at)}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {device.has_printing_support && (
                          <Badge variant="outline" className="mr-1">
                            <Printer className="h-3 w-3 mr-1" />
                            Print
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={device.is_active}
                          onCheckedChange={() => handleToggleActive(device)}
                          disabled={toggleDevice.isPending}
                          data-testid={`switch-active-${device.id}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
