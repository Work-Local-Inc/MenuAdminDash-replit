"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

const formSchema = z.object({
  notes: z.string().optional(),
})

interface Step8Props {
  restaurantId: number | null
  onComplete: () => void
}

export function Step8Complete({ restaurantId, onComplete }: Step8Props) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      notes: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "Restaurant ID is missing. Please complete previous steps first.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          ...values,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to complete onboarding')
      }

      const data = await res.json()

      toast({
        title: "Success!",
        description: `Restaurant "${data.restaurant_name}" has been activated and is now live!`,
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
    }
  }

  return (
    <div className="space-y-6">
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-900 dark:text-green-100">
          <strong>Almost there!</strong>
          <br />
          You've completed all the required setup steps. Review the restaurant details and activate when ready.
        </AlertDescription>
      </Alert>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Before activating:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Verify all restaurant information is correct</li>
            <li>Confirm menu items and prices are accurate</li>
            <li>Test delivery zones cover the correct areas</li>
            <li>Ensure operating hours match actual schedule</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Review Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any notes about the onboarding process or special considerations..."
                    rows={5}
                    {...field}
                    data-testid="input-notes"
                  />
                </FormControl>
                <FormDescription>
                  These notes will be saved for your records
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
            data-testid="button-complete-onboarding"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-5 w-5" />
            )}
            Complete Onboarding & Activate Restaurant
          </Button>
        </form>
      </Form>
    </div>
  )
}
