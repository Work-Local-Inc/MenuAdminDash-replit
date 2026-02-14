
"use client"
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, ArrowLeft, KeyRound, Smartphone, LogIn, UserPlus } from 'lucide-react'
import { SiGoogle } from 'react-icons/si'
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/api-utils'
import { ResetPasswordModal } from '@/components/customer/reset-password-modal'

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`
}

export default function CustomerLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()
  
  const redirect = searchParams.get('redirect') || '/customer/account'
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [sendingReset, setSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  
  // Signup state
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupFirstName, setSignupFirstName] = useState('')
  const [signupLastName, setSignupLastName] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [signingUp, setSigningUp] = useState(false)

  // Phone OTP state
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [phoneStep, setPhoneStep] = useState<'enter' | 'verify'>('enter')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [googleLoading, setGoogleLoading] = useState(false)

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
      setTimeout(() => {
        window.location.href = redirect
      }, 100)
    } catch (error: any) {
      console.error('Verify OTP error:', error)
      toast({ variant: "destructive", title: "Verification Failed", description: error.message || "Invalid code. Please try again." })
    } finally {
      setVerifyingOtp(false)
    }
  }, [otpCode, phoneNumber, supabase, toast, redirect])

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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      document.cookie = `oauth_redirect_to=${encodeURIComponent(redirect)};path=/;max-age=600;samesite=lax`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback?next=' + encodeURIComponent(redirect),
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
      const currentPath = window.location.pathname + window.location.search
      const separator = currentPath.includes('?') ? '&' : '?'
      const returnTo = currentPath + separator + 'reset_password=true'
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoggingIn(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })

      if (error) throw error

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in",
      })

      // Redirect to intended page
      setTimeout(() => {
        window.location.href = redirect
      }, 100)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid email or password",
      })
    } finally {
      setLoggingIn(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSigningUp(true)

    try {
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Failed to create account')
      }

      // Create user record in users table via server API
      // Server-side uses service role key with proper permissions
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/customer/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auth_user_id: authData.user.id,
            email: signupEmail,
            first_name: signupFirstName,
            last_name: signupLastName,
            phone: signupPhone || null,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Error creating user record:', errorData)
          // Don't fail signup - auth account is created, user record can be fixed later
        }
      } catch (err) {
        console.error('Exception calling signup API:', err)
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
        description: "Welcome to Menu.ca - you can now place orders",
      })

      // Redirect to intended page
      setTimeout(() => {
        window.location.href = redirect
      }, 100)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error.message || "Failed to create account",
      })
    } finally {
      setSigningUp(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-4" data-testid="button-back">
          <Link href={redirect}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-card px-6 py-3 rounded-lg shadow-md">
            <div className="flex items-center gap-1">
              <span className="bg-red-600 text-white font-bold text-xl px-2 py-1 rounded">M</span>
              <span className="text-foreground font-semibold text-xl">ENU.CA</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Account</CardTitle>
            <CardDescription>
              Sign in or create an account to place orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="phone" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="phone" data-testid="tab-phone">
                  <Smartphone className="w-4 h-4 mr-1" />
                  Phone
                </TabsTrigger>
                <TabsTrigger value="login" data-testid="tab-login">
                  <LogIn className="w-4 h-4 mr-1" />
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" data-testid="tab-signup">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Phone OTP Tab */}
              <TabsContent value="phone" className="space-y-4">
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
              
              <TabsContent value="login" className="space-y-4">
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
                          data-testid="button-back-to-login"
                        >
                          Back to Login
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
                          <Label htmlFor="forgot-email">Email</Label>
                          <Input
                            id="forgot-email"
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
                          Back to Login
                        </Button>
                      </form>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        data-testid="input-login-email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <Label htmlFor="login-password">Password</Label>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            setShowForgotPassword(true)
                            setForgotEmail(loginEmail)
                          }}
                          data-testid="button-forgot-password"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          data-testid="input-login-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          data-testid="button-toggle-login-password"
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loggingIn}
                      data-testid="button-submit-login"
                    >
                      {loggingIn ? "Logging in..." : "Log In"}
                    </Button>
                  </form>
                )}

              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-first-name">First Name</Label>
                      <Input
                        id="signup-first-name"
                        placeholder="John"
                        value={signupFirstName}
                        onChange={(e) => setSignupFirstName(e.target.value)}
                        required
                        data-testid="input-signup-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-last-name">Last Name</Label>
                      <Input
                        id="signup-last-name"
                        placeholder="Doe"
                        value={signupLastName}
                        onChange={(e) => setSignupLastName(e.target.value)}
                        required
                        data-testid="input-signup-last-name"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      data-testid="input-signup-email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone (optional)</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="(416) 555-0123"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      data-testid="input-signup-phone"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                        data-testid="input-signup-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        data-testid="button-toggle-signup-password"
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must be at least 6 characters
                    </p>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={signingUp}
                    data-testid="button-submit-signup"
                  >
                    {signingUp ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>

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
          </CardContent>
        </Card>
      </div>

      {/* Password Reset Modal - shown when user clicks reset link from email */}
      <ResetPasswordModal onPasswordReset={() => {
        router.push(redirect)
      }} />
    </div>
  )
}
