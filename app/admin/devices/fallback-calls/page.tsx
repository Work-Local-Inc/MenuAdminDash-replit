"use client"

export const dynamic = 'force-dynamic'

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import { formatDate, formatTime } from "@/lib/utils"
import { Phone, PhoneOff, PhoneCall } from "lucide-react"

interface FallbackCallRecord {
  order_id: number
  order_number: string
  restaurant_id: number
  restaurant_name: string
  created_at: string
  special_instructions: string
}

interface ParsedCall {
  phone: string
  status: "confirmed" | "called" | "failed"
  callSid: string
  errorMessage: string
}

function parseCallDetails(specialInstructions: string): ParsedCall {
  let phone = ""
  let status: "confirmed" | "called" | "failed" = "called"
  let callSid = ""
  let errorMessage = ""

  if (specialInstructions.includes("[TWILIO_FALLBACK_CONFIRMED]")) {
    status = "confirmed"
  }

  const placedMatches = Array.from(specialInstructions.matchAll(/\[TWILIO_FALLBACK_CALL\] Call placed to ([^\s.]+)\. SID: (\S+)/g))
  if (placedMatches.length > 0) {
    const lastMatch = placedMatches[placedMatches.length - 1]
    phone = lastMatch[1]
    callSid = lastMatch[2]
  }

  const failedMatches = Array.from(specialInstructions.matchAll(/\[TWILIO_FALLBACK_CALL\] Call failed to ([^\s.]+)\. Error: (.+)/g))
  if (failedMatches.length > 0) {
    const lastFailed = failedMatches[failedMatches.length - 1]
    phone = lastFailed[1]
    errorMessage = lastFailed[2].trim()
    if (status !== "confirmed") {
      status = "failed"
    }
  }

  if (placedMatches.length === 0 && failedMatches.length === 0) {
    const phoneMatch = specialInstructions.match(/\[TWILIO_FALLBACK_CALL\].*?to ([+\d]+)/)
    if (phoneMatch) {
      phone = phoneMatch[1]
    }
  }

  return { phone, status, callSid, errorMessage }
}

function StatusBadge({ status }: { status: "confirmed" | "called" | "failed" }) {
  switch (status) {
    case "confirmed":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 no-default-hover-elevate no-default-active-elevate" data-testid="badge-status-confirmed">
          <PhoneCall className="h-3 w-3 mr-1" />
          Confirmed
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive" data-testid="badge-status-failed">
          <PhoneOff className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      )
    default:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 no-default-hover-elevate no-default-active-elevate" data-testid="badge-status-called">
          <Phone className="h-3 w-3 mr-1" />
          Called
        </Badge>
      )
  }
}

export default function FallbackCallsPage() {
  const [restaurantFilter, setRestaurantFilter] = useState<string>("all")

  const { data: restaurants = [] } = useRestaurants()

  const { data: fallbackCalls = [], isLoading } = useQuery<FallbackCallRecord[]>({
    queryKey: ['/api/fallback-calls', restaurantFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (restaurantFilter !== "all") {
        params.set('restaurant_id', restaurantFilter)
      }
      const res = await fetch(`/api/fallback-calls?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch fallback calls')
      return res.json()
    },
  })

  const confirmedCount = fallbackCalls.filter(c => parseCallDetails(c.special_instructions).status === "confirmed").length
  const failedCount = fallbackCalls.filter(c => parseCallDetails(c.special_instructions).status === "failed").length
  const calledCount = fallbackCalls.filter(c => parseCallDetails(c.special_instructions).status === "called").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Fallback Call Log</h1>
        <p className="text-muted-foreground">Orders that triggered Twilio fallback calls and their outcomes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <PhoneCall className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-confirmed-count">{confirmedCount}</div>
            <p className="text-xs text-muted-foreground">Acknowledged via phone</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Called</CardTitle>
            <Phone className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-called-count">{calledCount}</div>
            <p className="text-xs text-muted-foreground">Call placed, no confirmation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <PhoneOff className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-failed-count">{failedCount}</div>
            <p className="text-xs text-muted-foreground">Call could not be placed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter fallback calls by restaurant</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
            <SelectTrigger className="w-full sm:w-[300px]" data-testid="select-restaurant-filter">
              <SelectValue placeholder="All Restaurants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Restaurants</SelectItem>
              {restaurants.map((r: any) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Fallback Calls</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `Showing ${fallbackCalls.length} fallback call records`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : fallbackCalls.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-empty-state">No fallback calls found</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Order Created</TableHead>
                    <TableHead>Phone Called</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Call SID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fallbackCalls.map((record) => {
                    const parsed = parseCallDetails(record.special_instructions)
                    return (
                      <TableRow key={record.order_id} data-testid={`row-fallback-${record.order_id}`}>
                        <TableCell className="font-medium font-mono" data-testid={`text-order-number-${record.order_id}`}>
                          #{record.order_number}
                        </TableCell>
                        <TableCell data-testid={`text-restaurant-${record.order_id}`}>
                          {record.restaurant_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div>{formatDate(record.created_at)}</div>
                          <div>{formatTime(record.created_at)}</div>
                        </TableCell>
                        <TableCell className="font-mono text-sm" data-testid={`text-phone-${record.order_id}`}>
                          {parsed.phone || "N/A"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={parsed.status} />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate" data-testid={`text-sid-${record.order_id}`}>
                          {parsed.callSid || (parsed.errorMessage ? `Error: ${parsed.errorMessage}` : "N/A")}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
