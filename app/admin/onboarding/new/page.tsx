"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { ChevronLeft, ChevronRight, Check, AlertCircle } from "lucide-react"

import { Step1BasicInfo } from "@/components/onboarding/step1-basic-info"
import { Step2Location } from "@/components/onboarding/step2-location"
import { Step3Contact } from "@/components/onboarding/step3-contact"
import { Step4Schedule } from "@/components/onboarding/step4-schedule"
import { Step5Menu } from "@/components/onboarding/step5-menu"
import { Step7Delivery } from "@/components/onboarding/step7-delivery"
import { Step8Complete } from "@/components/onboarding/step8-complete"

const STEPS = [
  { id: 1, name: "Basic Info", description: "Restaurant name and details" },
  { id: 2, name: "Location", description: "Address and coordinates" },
  { id: 3, name: "Contact", description: "Primary contact information" },
  { id: 4, name: "Schedule", description: "Operating hours" },
  { id: 5, name: "Menu", description: "Menu items" },
  { id: 6, name: "Payment", description: "Payment methods (Skip for now)" },
  { id: 7, name: "Delivery", description: "Delivery zones" },
  { id: 8, name: "Complete", description: "Review and activate" },
]

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [restaurantId, setRestaurantId] = useState<number | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const handleStepComplete = (stepId: number, data?: any) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId])
    }
    
    // Store restaurant ID from step 1 - check multiple possible response formats
    if (stepId === 1 && data) {
      const id = data.restaurant_id || data[0]?.restaurant_id
      if (id) {
        setRestaurantId(id)
      }
    }

    // Auto-advance to next step (except for step 8)
    if (stepId < 8) {
      setCurrentStep(stepId + 1)
    }
  }

  const handleNext = () => {
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkipPayment = () => {
    // Mark payment as skipped
    if (!completedSteps.includes(6)) {
      setCompletedSteps([...completedSteps, 6])
    }
    setCurrentStep(7)
    toast({
      title: "Payment Step Skipped",
      description: "You can configure payment methods later in the restaurant settings.",
    })
  }

  const progress = (completedSteps.length / 8) * 100

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Restaurant Onboarding</h1>
        <p className="text-muted-foreground">
          Complete the 8-step process to add a new restaurant to the platform
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground">{completedSteps.length} of 8 steps completed</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Step Navigation */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.id)
          const isCurrent = currentStep === step.id
          
          return (
            <Button
              key={step.id}
              variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"}
              size="sm"
              onClick={() => setCurrentStep(step.id)}
              className="flex items-center gap-2"
              data-testid={`nav-step-${step.id}`}
            >
              {isCompleted && <Check className="h-4 w-4" />}
              <span>{step.id}. {step.name}</span>
              {isCurrent && <Badge variant="default" className="ml-1">Current</Badge>}
            </Button>
          )
        })}
      </div>

      {/* Current Step Content */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Step {currentStep}: {STEPS[currentStep - 1].name}
              </CardTitle>
              <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
            </div>
            {completedSteps.includes(currentStep) && (
              <Badge variant="default" className="bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <Step1BasicInfo 
              onComplete={(data) => handleStepComplete(1, data)} 
            />
          )}
          {currentStep === 2 && (
            <Step2Location 
              restaurantId={restaurantId}
              onComplete={() => handleStepComplete(2)} 
            />
          )}
          {currentStep === 3 && (
            <Step3Contact 
              restaurantId={restaurantId}
              onComplete={() => handleStepComplete(3)} 
            />
          )}
          {currentStep === 4 && (
            <Step4Schedule 
              restaurantId={restaurantId}
              onComplete={() => handleStepComplete(4)} 
            />
          )}
          {currentStep === 5 && (
            <Step5Menu 
              restaurantId={restaurantId}
              onComplete={() => handleStepComplete(5)} 
            />
          )}
          {currentStep === 6 && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Payment integration setup is handled separately. You can skip this step for now and configure payment methods later in the restaurant settings.
                </AlertDescription>
              </Alert>
              <Button onClick={handleSkipPayment} className="w-full">
                Skip Payment Setup (Configure Later)
              </Button>
            </div>
          )}
          {currentStep === 7 && (
            <Step7Delivery 
              restaurantId={restaurantId}
              onComplete={() => handleStepComplete(7)} 
            />
          )}
          {currentStep === 8 && (
            <Step8Complete 
              restaurantId={restaurantId}
              onComplete={() => {
                handleStepComplete(8)
                router.push(`/admin/restaurants/${restaurantId}`)
              }} 
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
          data-testid="button-back"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        {currentStep < 8 && currentStep !== 6 && (
          <Button
            variant="outline"
            onClick={handleNext}
            data-testid="button-next"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
