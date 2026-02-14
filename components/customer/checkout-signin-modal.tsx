"use client"

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/lib/stores/cart-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, LogIn, UserPlus, KeyRound, Smartphone } from 'lucide-react'
import { SiGoogle } from 'react-icons/si'
import { getApiBaseUrl } from '@/lib/api-utils'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
})

type SignInFormData = z.infer<typeof signInSchema>
type SignUpFormData = z.infer<typeof signUpSchema>

interface CheckoutSignInModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`
}

export function CheckoutSignInModal({
  open,
  onOpenChange,
  onSuccess,
}: CheckoutSignInModalProps) {
  const { toast } = useToast()
  const supabase = createClient()
  
  const [activeTab, setActiveTab] = useState<'phone' | 'signin' | 'signup'>('phone')
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [sendingReset, setSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [phoneStep, setPhoneStep] = useState<'enter' | 'verify'>('enter')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setPhoneStep('enter')
      setOtpCode('')
      setResendCountdown(0)
    }
  }, [open])

  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCountdown])

  const handleSendOtp = useCallback(async () => {
    const digits = phoneNumber.replace(/\D/g, '')
    if (digits.length < 10) {
      toast({ variant: "destructive", title: "Invalid phone number", description: "Please enter a valid 10-digit phone number" })
      return
    }
    setSendingOtp(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: '+1' + digits,
      })
      if (error) throw error
      setPhoneStep('verify')
      setResendCountdown(60)
      toast({ title: "Code Sent", description: "Check your phone for the verification code" })
    } catch (error: any) {
      console.error('Send OTP error:', error)
      toast({ variant: "destructive", title: "Failed to send code", description: error.message || "Could not send verification code. Please try again." })
    } finally {
      setSendingOtp(false)
    }
  }, [phoneNumber, supabase, toast])

  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length !== 6) {
      toast({ variant: "destructive", title: "Invalid code", description: "Please enter the 6-digit code" })
      return
    }
    const digits = phoneNumber.replace(/\D/g, '')
    setVerifyingOtp(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: '+1' + digits,
        token: otpCode,
        type: 'sms',
      })
      if (error) throw error

      if (data.user?.email) {
        try {
          await fetch(`${getApiBaseUrl()}/api/customer/oauth-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auth_user_id: data.user.id,
              email: data.user.email || '',
              first_name: data.user.user_metadata?.first_name,
              last_name: data.user.user_metadata?.last_name,
              phone: '+1' + digits,
            }),
          })
        } catch (err) {
          console.error('Exception calling OAuth profile API:', err)
        }
      }

      toast({ title: "Welcome!", description: "You've successfully signed in" })
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error('Verify OTP error:', error)
      toast({ variant: "destructive", title: "Verification Failed", description: error.message || "Invalid code. Please try again." })
    } finally {
      setVerifyingOtp(false)
    }
  }, [otpCode, phoneNumber, supabase, toast, onOpenChange, onSuccess])

  const handleResendOtp = useCallback(async () => {
    if (resendCountdown > 0) return
    const digits = phoneNumber.replace(/\D/g, '')
    setSendingOtp(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: '+1' + digits,
      })
      if (error) throw error
      setResendCountdown(60)
      toast({ title: "Code Resent", description: "Check your phone for the new verification code" })
    } catch (error: any) {
      console.error('Resend OTP error:', error)
      toast({ variant: "destructive", title: "Failed to resend", description: error.message || "Could not resend code. Please try again." })
    } finally {
      setSendingOtp(false)
    }
  }, [resendCountdown, phoneNumber, supabase, toast])

  // Sign In Form
  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  })

  // Sign Up Form
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
    },
  })

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      const slug = useCartStore.getState().restaurantSlug
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback?next=' + encodeURIComponent('/checkout' + (slug ? '?restaurant=' + slug : '')),
        },
      })
      if (error) throw error
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      toast({
        variant: "destructive",
        title: "Google Sign In Failed",
        description: error.message || "Could not sign in with Google. Please try again.",
      })
      setGoogleLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail) return
    setSendingReset(true)

    try {
      const slug = useCartStore.getState().restaurantSlug
      const returnTo = slug
        ? `/checkout?reset_password=true&restaurant=${slug}`
        : '/checkout?reset_password=true'
      const response = await fetch('/api/customer/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          returnTo,
          redirectUrl: window.location.origin,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to send reset email')

      setResetSent(true)
      toast({
        title: "Reset Link Sent",
        description: "Check your email for a password reset link.",
      })
    } catch (error: any) {
      console.error('Password reset error:', error)
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error.message || "Failed to send reset link. Please try again.",
      })
    } finally {
      setSendingReset(false)
    }
  }

  const handleSignIn = async (data: SignInFormData) => {
    setIsSubmitting(true)

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) throw error

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in",
      })

      // Close modal and trigger success callback
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message || "Invalid email or password. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignUp = async (data: SignUpFormData) => {
    setIsSubmitting(true)

    try {
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Failed to create account')
      }

      // Create user record in users table via OAuth profile API
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/customer/oauth-profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auth_user_id: authData.user.id,
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone || null,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Error creating user record:', errorData)
          // Don't fail signup - auth account is created, user record can be fixed later
        }
      } catch (err) {
        console.error('Exception calling OAuth profile API:', err)
        // Don't fail signup - auth account is created
      }

      // Send welcome email (don't fail signup if email fails)
      try {
        await fetch(`${getApiBaseUrl()}/api/customer/welcome-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
      }

      toast({
        title: "Account Created!",
        description: "Welcome! You can now enjoy faster checkout.",
      })

      // Close modal and trigger success callback
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Sign up error:', error)
      
      // Check for duplicate email error
      if (error.message?.includes('already exists') || error.message?.includes('already been registered')) {
        toast({
          title: "Account Already Exists",
          description: "An account with this email already exists. Please sign in instead.",
          variant: "destructive",
        })
        setActiveTab('signin')
      } else {
        toast({
          title: "Sign Up Failed",
          description: error.message || "Failed to create account. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        data-testid="dialog-checkout-signin"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Sign In to Continue</DialogTitle>
          <DialogDescription>
            Sign in to access your saved addresses and enjoy faster checkout
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'phone' | 'signin' | 'signup')} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="phone" data-testid="tab-phone">
              <Smartphone className="w-4 h-4 mr-1" />
              Phone
            </TabsTrigger>
            <TabsTrigger value="signin" data-testid="tab-signin">
              <LogIn className="w-4 h-4 mr-1" />
              Email
            </TabsTrigger>
            <TabsTrigger value="signup" data-testid="tab-create-account">
              <UserPlus className="w-4 h-4 mr-1" />
              Sign Up
            </TabsTrigger>
          </TabsList>

          {/* Phone OTP Tab */}
          <TabsContent value="phone" className="space-y-4 mt-4">
            {phoneStep === 'enter' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 border rounded-md bg-muted text-sm text-muted-foreground shrink-0">
                      +1
                    </div>
                    <Input
                      type="tel"
                      placeholder="(416) 555-0123"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      data-testid="input-phone-number"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={sendingOtp || phoneNumber.replace(/\D/g, '').length < 10}
                  onClick={handleSendOtp}
                  data-testid="button-send-otp"
                >
                  {sendingOtp ? "Sending..." : "Send Code"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <p className="text-sm text-muted-foreground">
                    Code sent to <span className="font-medium text-foreground">+1 {formatPhoneDisplay(phoneNumber)}</span>
                  </p>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => { setPhoneStep('enter'); setOtpCode('') }}
                    data-testid="button-edit-phone"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    data-testid="input-otp-code"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={verifyingOtp || otpCode.length !== 6}
                  onClick={handleVerifyOtp}
                  data-testid="button-verify-otp"
                >
                  {verifyingOtp ? "Verifying..." : "Verify Code"}
                </Button>
                <div className="text-center">
                  {resendCountdown > 0 ? (
                    <span className="text-sm text-muted-foreground" data-testid="text-resend-countdown">
                      Resend in {resendCountdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={handleResendOtp}
                      disabled={sendingOtp}
                      data-testid="button-resend-otp"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Sign In Tab */}
          <TabsContent value="signin" className="space-y-4 mt-4">
            {showForgotPassword ? (
              <div className="space-y-4">
                {resetSent ? (
                  <div className="text-center space-y-3 py-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <KeyRound className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-medium text-lg">Check Your Email</h3>
                    <p className="text-sm text-muted-foreground">
                      We sent a password reset link to <strong>{forgotEmail}</strong>. Click the link in the email to set a new password.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => {
                        setShowForgotPassword(false)
                        setResetSent(false)
                        setForgotEmail('')
                      }}
                      data-testid="button-back-to-signin"
                    >
                      Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">Reset Your Password</h3>
                      <p className="text-sm text-muted-foreground">
                        Enter your email address and we'll send you a link to reset your password.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        data-testid="input-forgot-email"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={sendingReset}
                      data-testid="button-send-reset-link"
                    >
                      {sendingReset ? "Sending..." : "Send Reset Link"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowForgotPassword(false)}
                      data-testid="button-cancel-forgot"
                    >
                      Back to Sign In
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <FormField
                    control={signInForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="you@example.com"
                            data-testid="input-signin-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signInForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <FormLabel>Password</FormLabel>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => {
                              setShowForgotPassword(true)
                              setForgotEmail(signInForm.getValues('email') || '')
                            }}
                            data-testid="button-forgot-password"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showSignInPassword ? "text" : "password"}
                              placeholder="••••••••"
                              data-testid="input-signin-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowSignInPassword(!showSignInPassword)}
                              data-testid="button-toggle-signin-password"
                            >
                              {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signInForm.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-remember-me"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal cursor-pointer">
                            Remember me
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                    data-testid="button-submit-signin"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            )}

          </TabsContent>
          
          {/* Create Account Tab */}
          <TabsContent value="signup" className="space-y-4 mt-4">
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={signUpForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="John"
                            data-testid="input-signup-firstname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signUpForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Doe"
                            data-testid="input-signup-lastname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="you@example.com"
                          data-testid="input-signup-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signUpForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="(416) 555-0123"
                          data-testid="input-signup-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showSignUpPassword ? "text" : "password"}
                            placeholder="••••••••"
                            data-testid="input-signup-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                            data-testid="button-toggle-signup-password"
                          >
                            {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Min 8 characters with uppercase, lowercase, number, and special character
                      </p>
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                  data-testid="button-submit-signup"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </Form>

          </TabsContent>
        </Tabs>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={googleLoading} data-testid="button-google-signin">
          <SiGoogle className="w-4 h-4 mr-2" />
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
