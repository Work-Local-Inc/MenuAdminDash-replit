"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { useAdminUser } from "@/hooks/use-admin-user"
import { createClient } from "@/lib/supabase/client"
import { Loader2, User, Mail, Lock, Save } from "lucide-react"

export default function AdminProfilePage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { data: adminUser, isLoading: isLoadingAdmin } = useAdminUser()
  const supabase = createClient()

  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail) {
      toast({ title: "Error", description: "Please enter a new email address", variant: "destructive" })
      return
    }

    setIsUpdatingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      
      toast({ 
        title: "Email Update Requested", 
        description: "Please check your new email address to confirm the change." 
      })
      setNewEmail("")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update email"
      toast({ title: "Error", description: errorMessage, variant: "destructive" })
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) {
      toast({ title: "Error", description: "Please fill in all password fields", variant: "destructive" })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" })
      return
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" })
      return
    }

    setIsUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      
      toast({ title: "Success", description: "Your password has been updated." })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update password"
      toast({ title: "Error", description: errorMessage, variant: "destructive" })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  if (isLoadingAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-profile-title">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account email and password</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your current account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-medium" data-testid="text-profile-name">
                {adminUser?.first_name} {adminUser?.last_name}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium" data-testid="text-profile-email">{user?.email}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Role</Label>
              <p className="font-medium" data-testid="text-profile-role">
                {adminUser?.role_id === 1 ? "Super Admin" : "Restaurant Admin"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Update Email
            </CardTitle>
            <CardDescription>Change your login email address</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">New Email Address</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="Enter new email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  data-testid="input-new-email"
                />
              </div>
              <Button type="submit" disabled={isUpdatingEmail} data-testid="button-update-email">
                {isUpdatingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Email
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>
              <Button type="submit" disabled={isUpdatingPassword} data-testid="button-update-password">
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
