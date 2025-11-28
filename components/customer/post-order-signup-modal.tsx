"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, UserPlus, Sparkles } from 'lucide-react'

const signupFormSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  name: z.string().optional(),
  phone: z.string().optional(),
})

type SignupFormData = z.infer<typeof signupFormSchema>

interface PostOrderSignupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guestEmail: string
  onSuccess?: () => void
}

export function PostOrderSignupModal({
  open,
  onOpenChange,
  guestEmail,
  onSuccess,
}: PostOrderSignupModalProps) {
  const { toast } = useToast()
  const [isSuccess, setIsSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema) as any,
    defaultValues: {
      email: guestEmail,
      password: '',
      name: '',
      phone: '',
    },
  })

  // BUG FIX 1: Update form when guestEmail prop changes
  useEffect(() => {
    if (guestEmail) {
      form.reset({ 
        email: guestEmail, 
        password: '', 
        name: '', 
        phone: '' 
      })
    }
  }, [guestEmail, form])

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/customer/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name || undefined,
          phone: data.phone || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create account')
      }

      const result = await response.json()

      // Show success state
      setIsSuccess(true)

      toast({
        title: "Account Created Successfully!",
        description: "You can now enjoy faster checkout on your next order.",
      })

      // Auto-close after showing success
      setTimeout(() => {
        onOpenChange(false)
        if (onSuccess) {
          onSuccess()
        }
      }, 2000)
    } catch (error: any) {
      console.error('Signup error:', error)
      
      // Check for duplicate email error
      if (error.message?.includes('already exists') || error.message?.includes('already been registered')) {
        toast({
          title: "Account Already Exists",
          description: "An account with this email already exists. You can log in on your next visit.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error Creating Account",
          description: error.message || "Please try again later",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    onOpenChange(false)
    if (onSuccess) {
      onSuccess()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        data-testid="dialog-post-order-signup"
      >
        {isSuccess ? (
          // Success State
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">
              Account Created!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your account has been created successfully. Enjoy faster checkout on your next order!
            </DialogDescription>
          </div>
        ) : (
          // Signup Form
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle className="text-xl">
                  Save Time on Your Next Order
                </DialogTitle>
              </div>
              <DialogDescription className="text-base">
                Create an account to save your info for faster checkout next time. It only takes a moment!
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                {/* Email (readonly) */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          readOnly
                          className="bg-muted"
                          data-testid="input-signup-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password (required) */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Password <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Create a strong password"
                          data-testid="input-signup-password"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Min 8 characters, with uppercase, lowercase, number, and special character
                      </p>
                    </FormItem>
                  )}
                />

                {/* Name (optional) */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="John Doe"
                          data-testid="input-signup-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone (optional) */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="(555) 123-4567"
                          data-testid="input-signup-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSkip}
                    disabled={isSubmitting}
                    className="flex-1"
                    data-testid="button-skip-signup"
                  >
                    Maybe Later
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                    data-testid="button-create-account"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Creating Account..." : "Create Account"}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
