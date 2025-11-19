"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface OnboardingProps {
  restaurantId: number
}

const STEP_NAMES: Record<string, string> = {
  basic_info: "Basic Info",
  location: "Location",
  contact: "Contact",
  schedule: "Schedule",
  menu: "Menu",
  payment: "Payment",
  delivery: "Delivery",
  testing: "Testing",
}

const STEP_DESCRIPTIONS: Record<string, string> = {
  basic_info: "Restaurant name, description, and basic details",
  location: "Address, city, province, and coordinates",
  contact: "Primary contact, phone, email",
  schedule: "Operating hours for each day of the week",
  menu: "Menu items and categories",
  payment: "Payment methods and processing setup",
  delivery: "Delivery zones and fee configuration",
  testing: "Test orders and final verification",
}

export function Onboarding({ restaurantId }: OnboardingProps) {
  const { toast } = useToast()

  // Fetch onboarding status
  const { data: onboarding, isLoading } = useQuery<any>({
    queryKey: ['/api/restaurants', restaurantId, 'onboarding'],
  })

  // Update step mutation
  const updateStep = useMutation({
    mutationFn: async ({ step, completed }: { step: string; completed: boolean }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/onboarding/steps/${step}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update step')
      }
      return res.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'onboarding'] })
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/dashboard'] })
      toast({
        title: "Success",
        description: `${STEP_NAMES[variables.step]} ${variables.completed ? 'completed' : 'unmarked'}`,
      })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const handleToggleStep = (step: string, currentCompleted: boolean) => {
    updateStep.mutate({ step, completed: !currentCompleted })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!onboarding) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No onboarding data found for this restaurant
        </AlertDescription>
      </Alert>
    )
  }

  const completionPercentage = onboarding.completion_percentage || 0
  const steps = onboarding.steps || []
  const daysInOnboarding = onboarding.days_in_onboarding || 0

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Onboarding Progress</CardTitle>
              <CardDescription>
                {onboarding.onboarding_completed ? 'Completed' : 'In Progress'}
                {' • '}
                {daysInOnboarding} {daysInOnboarding === 1 ? 'day' : 'days'} in onboarding
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{completionPercentage}%</div>
              <p className="text-sm text-muted-foreground">Complete</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={completionPercentage} className="h-4" />
          {onboarding.onboarding_completed && onboarding.completed_at && (
            <p className="text-sm text-muted-foreground mt-2">
              Completed {formatDistanceToNow(new Date(onboarding.completed_at), { addSuffix: true })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Steps Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Steps</CardTitle>
          <CardDescription>Click to mark steps as complete or incomplete</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step: any, index: number) => {
              const stepKey = step.step_name.toLowerCase().replace(/\s+/g, '_')
              const isCompleted = step.is_completed
              const completedAt = step.completed_at

              return (
                <div
                  key={step.step_name}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${
                    isCompleted ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : 'bg-card'
                  }`}
                  data-testid={`step-${stepKey}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => handleToggleStep(stepKey, isCompleted)}
                      disabled={updateStep.isPending}
                      className="mt-1"
                      data-testid={`checkbox-${stepKey}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <h3 className="font-semibold">
                          {index + 1}. {step.step_name}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {STEP_DESCRIPTIONS[stepKey]}
                      </p>
                      {isCompleted && completedAt && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Completed {formatDistanceToNow(new Date(completedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  {isCompleted && (
                    <Badge variant="default" className="bg-green-600">
                      Complete
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Indicator */}
      {!onboarding.onboarding_completed && onboarding.current_step && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Current Step:</strong> {STEP_NAMES[onboarding.current_step] || onboarding.current_step}
            <br />
            This is the next step that needs to be completed.
          </AlertDescription>
        </Alert>
      )}

      {/* Completion Alert */}
      {onboarding.onboarding_completed && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900 dark:text-green-100">
            <strong>Onboarding Complete!</strong>
            <br />
            This restaurant has completed all onboarding steps and is ready to go live.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
