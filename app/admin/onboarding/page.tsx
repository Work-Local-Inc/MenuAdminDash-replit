"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function OnboardingDashboardPage() {
  // Fetch dashboard data
  const { data: dashboard, isLoading: isLoadingDashboard } = useQuery<any>({
    queryKey: ['/api/onboarding/dashboard'],
  })

  // Fetch step stats
  const { data: stepStats = [], isLoading: isLoadingStats } = useQuery<any[]>({
    queryKey: ['/api/onboarding/stats'],
  })

  if (isLoadingDashboard || isLoadingStats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Restaurant Onboarding</h1>
          <p className="text-muted-foreground">Track and manage restaurant onboarding progress</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const overview = dashboard?.overview || {}
  const atRisk = dashboard?.at_risk || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-onboarding-title">
          Restaurant Onboarding
        </h1>
        <p className="text-muted-foreground">Track and manage restaurant onboarding progress</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Restaurants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_restaurants?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview.completed?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview.total_restaurants > 0 
                ? `${((overview.completed / overview.total_restaurants) * 100).toFixed(1)}%`
                : '0%'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{overview.in_progress?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overview.total_restaurants > 0 
                ? `${((overview.in_progress / overview.total_restaurants) * 100).toFixed(1)}%`
                : '0%'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{overview.avg_completion?.toFixed(1) || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Step Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Step Statistics</CardTitle>
          <CardDescription>Completion rate for each onboarding step</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stepStats.map((stat: any) => (
              <div key={stat.step_name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stat.step_name}</span>
                    {stat.completion_percentage < 50 && (
                      <Badge variant="destructive" className="text-xs">
                        Bottleneck
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {stat.completed_count} / {stat.total_count}
                    </span>
                    <span className="font-bold">{stat.completion_percentage?.toFixed(1)}%</span>
                  </div>
                </div>
                <Progress value={stat.completion_percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* At-Risk Restaurants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>At-Risk Restaurants</CardTitle>
              <CardDescription>Restaurants stuck in onboarding (sorted by priority)</CardDescription>
            </div>
            {atRisk.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {atRisk.length} Need Help
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {atRisk.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead className="text-right">Days Stuck</TableHead>
                  <TableHead className="text-right">Priority Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRisk.slice(0, 20).map((restaurant: any) => (
                  <TableRow key={restaurant.id} data-testid={`row-restaurant-${restaurant.id}`}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/restaurants/${restaurant.id}`} className="hover:underline">
                        {restaurant.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={restaurant.completion} className="h-2 w-24" />
                        <span className="text-sm font-medium">{restaurant.completion}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {restaurant.current_step?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={restaurant.days_stuck >= 30 ? "text-red-600 font-bold" : ""}>
                        {restaurant.days_stuck}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={
                        restaurant.priority_score >= 100 ? "destructive" :
                        restaurant.priority_score >= 50 ? "default" :
                        "secondary"
                      }>
                        {restaurant.priority_score?.toFixed(0)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/restaurants/${restaurant.id}?tab=onboarding`}>
                        <Button variant="outline" size="sm" data-testid={`button-help-${restaurant.id}`}>
                          Help
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All on track!</h3>
              <p className="text-muted-foreground">No restaurants currently need help with onboarding</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottleneck Alert */}
      {stepStats.some((stat: any) => stat.completion_percentage < 10) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Bottleneck Detected</AlertTitle>
          <AlertDescription>
            {stepStats
              .filter((stat: any) => stat.completion_percentage < 10)
              .map((stat: any) => (
                <div key={stat.step_name}>
                  <strong>{stat.step_name}</strong> step has only {stat.completion_percentage?.toFixed(1)}% completion rate. 
                  This is blocking {stat.total_count - stat.completed_count} restaurants from progressing.
                </div>
              ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
