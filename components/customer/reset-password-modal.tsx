"use client"

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react'

interface ResetPasswordModalProps {
  onPasswordReset?: () => void
}

export function ResetPasswordModal({ onPasswordReset }: ResetPasswordModalProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const supabase = createClient()

  const isOpen = searchParams.get('reset_password') === 'true'

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setShowConfirmPassword(false)
      setSuccess(false)
    }
  }, [isOpen])

  const removeResetParam = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('reset_password')
    const newQuery = params.toString()
    const newUrl = newQuery ? `${pathname}?${newQuery}` : pathname
    router.replace(newUrl)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      removeResetParam()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
      })
      return
    }

    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setSuccess(true)

      toast({
        title: "Password Updated",
        description: "Your password has been set successfully. You're now signed in.",
      })

      setTimeout(() => {
        removeResetParam()
        onPasswordReset?.()
      }, 1500)
    } catch (error: any) {
      console.error('Password reset error:', error)
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description: error.message || "Failed to update password. The link may have expired.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-reset-password">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {success ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Password Updated
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5" />
                Set New Password
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {success
              ? "Your password has been updated and you're now signed in."
              : "Enter your new password below to complete the reset."}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center py-4 gap-2">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
            <p className="text-sm text-muted-foreground">Redirecting you back...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  data-testid="input-reset-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-reset-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Min 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  data-testid="input-reset-confirm-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  data-testid="button-toggle-reset-confirm"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              data-testid="button-submit-reset-password"
            >
              {isSubmitting ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
