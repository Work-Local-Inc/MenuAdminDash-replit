"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Clock } from "lucide-react"

const TEMPLATES = [
  {
    name: "24/7",
    description: "Open 24 hours, 7 days a week",
    icon: "🌙",
  },
  {
    name: "Mon-Fri 9-5",
    description: "Standard business hours",
    icon: "💼",
  },
  {
    name: "Mon-Fri 11-9, Sat-Sun 11-10",
    description: "Common restaurant hours",
    icon: "🍽️",
  },
  {
    name: "Lunch & Dinner",
    description: "Split shifts: 11am-2pm and 5pm-9pm",
    icon: "⏰",
  },
]

interface Step4Props {
  restaurantId: number | null
  onComplete: () => void
}

export function Step4Schedule({ restaurantId, onComplete }: Step4Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleApplyTemplate(templateName: string) {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "Restaurant ID is missing. Please complete previous steps first.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setSelectedTemplate(templateName)
    try {
      const res = await fetch('/api/onboarding/apply-schedule-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          template_name: templateName,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to apply schedule template')
      }

      const data = await res.json()

      toast({
        title: "Success",
        description: `Applied "${templateName}" template - created ${data.schedule_count || 14} schedule records`,
      })

      onComplete()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setSelectedTemplate(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        <p>Choose a schedule template to quickly set up your restaurant's operating hours. You can customize these later in the restaurant settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((template) => (
          <Card 
            key={template.name}
            className="hover-elevate cursor-pointer transition-all"
            data-testid={`template-${template.name}`}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{template.icon}</span>
                {template.name}
              </CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleApplyTemplate(template.name)}
                disabled={isLoading}
                className="w-full"
                variant={selectedTemplate === template.name ? "default" : "outline"}
                data-testid={`button-apply-${template.name}`}
              >
                {isLoading && selectedTemplate === template.name && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Clock className="mr-2 h-4 w-4" />
                Apply Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
