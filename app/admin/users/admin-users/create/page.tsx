"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateAdminUser, useMyAdminInfo } from '@/lib/hooks/use-admin-users'
import { useAdminRoles, getAssignableRoles, canCreateAdmins } from '@/lib/hooks/use-admin-roles'
import { useRestaurants } from '@/lib/hooks/use-restaurants'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, AlertCircle, CheckCircle2, Shield, Store } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function CreateAdminUserPage() {
  const router = useRouter()
  const createAdmin = useCreateAdminUser()
  const { data: currentAdmin, isLoading: loadingAdmin } = useMyAdminInfo()
  const { data: allRoles, isLoading: loadingRoles } = useAdminRoles()
  const { data: restaurants, isLoading: loadingRestaurants } = useRestaurants({ status: 'active' })
  
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role_id: '',
    restaurant_ids: [] as number[],
  })
  const [result, setResult] = useState<any>(null)

  // Check if current user can create admins
  const currentRoleId = currentAdmin?.role_id
  const hasPermission = canCreateAdmins(currentRoleId)
  
  // Get assignable roles for current admin
  const assignableRoles = allRoles ? getAssignableRoles(currentRoleId, allRoles) : []

  // Show loading state while checking permissions
  if (loadingAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/users/admin-users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create Admin User</h1>
            <p className="text-muted-foreground">Loading permissions...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = await createAdmin.mutateAsync({
      ...formData,
      role_id: parseInt(formData.role_id),
      restaurant_ids: formData.restaurant_ids
    })
    setResult(data)
  }

  const toggleRestaurant = (restaurantId: number) => {
    setFormData(prev => ({
      ...prev,
      restaurant_ids: prev.restaurant_ids.includes(restaurantId)
        ? prev.restaurant_ids.filter(id => id !== restaurantId)
        : [...prev.restaurant_ids, restaurantId]
    }))
  }

  if (!hasPermission) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/users/admin-users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Permission Denied</h1>
            <p className="text-muted-foreground">You do not have permission to create admin users</p>
          </div>
        </div>

        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Insufficient Permissions</AlertTitle>
          <AlertDescription>
            Only Super Admins, Managers, and Support staff can create new admin users.
            Restaurant Managers and Staff do not have this permission.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (result) {
    const selectedRole = allRoles?.find(r => r.id === parseInt(formData.role_id))
    const isAutomated = result[0]?.automated === true
    
    // AUTOMATED FLOW: Restaurant Owner created successfully
    if (isAutomated) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/users/admin-users">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Restaurant Owner Created!</h1>
              <p className="text-muted-foreground">Account created and activated successfully</p>
            </div>
          </div>

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>✅ Restaurant Owner Created Successfully!</AlertTitle>
            <AlertDescription>
              The account is fully activated and restaurants have been assigned automatically.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Send these credentials to the new restaurant owner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Admin ID</Label>
                    <p className="font-mono text-sm">{result[0]?.admin_user_id}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium">{result[0]?.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                    <code className="bg-background px-3 py-2 rounded block font-mono text-sm">
                      {result[0]?.temp_password}
                    </code>
                    <p className="text-xs text-muted-foreground mt-1">
                      ⚠️ Save this password securely - it won't be shown again
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <p className="text-sm"><span className="text-green-600 font-semibold">Active</span></p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Restaurants Assigned</Label>
                    <p className="text-sm">{result[0]?.restaurants_assigned} restaurant(s)</p>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Next Steps
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Send the email and temporary password to: {result[0]?.email}</li>
                    <li>Instruct them to login and change their password immediately</li>
                    <li>They will have access to {result[0]?.restaurants_assigned} assigned restaurant(s)</li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-4">
                <Link href="/admin/users/admin-users" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back to Admin Users
                  </Button>
                </Link>
                <Button onClick={() => {
                  setResult(null)
                  setFormData({ email: '', first_name: '', last_name: '', phone: '', role_id: '', restaurant_ids: [] })
                }} className="flex-1">
                  Create Another Owner
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // MANUAL FLOW: Super Admin / Other roles
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/users/admin-users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Admin User Created</h1>
            <p className="text-muted-foreground">Follow the manual steps below to complete setup</p>
          </div>
        </div>

        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Admin Request Created Successfully!</AlertTitle>
          <AlertDescription>
            Admin user ID: {result[0]?.admin_user_id || 'N/A'} • Role: {selectedRole?.name || 'N/A'} • Status: {result[0]?.status || 'pending'}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Manual Setup Required</CardTitle>
            <CardDescription>
              Supabase doesn't allow creating auth users via client-side API. Complete these steps:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Step 1: Create Auth Account in Supabase Dashboard</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    Go to:{' '}
                    <a
                      href="https://supabase.com/dashboard/project/nthpbtdjhhnwfxqsxbvy/auth/users"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Supabase Auth Users Dashboard
                    </a>
                  </li>
                  <li>Click "Add User" → "Create new user"</li>
                  <li>Enter email: <code className="bg-background px-2 py-1 rounded">{formData.email}</code></li>
                  <li>Set a temporary password</li>
                  <li>Check "Auto Confirm User"</li>
                  <li>Click "Create user"</li>
                  <li><strong>Copy the UUID</strong> of the newly created user</li>
                </ol>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Step 2: Link Auth Account & Assign Role</h3>
                <p className="text-sm mb-2">Run this SQL in Supabase SQL Editor:</p>
                <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`UPDATE menuca_v3.admin_users
SET 
  auth_user_id = '<PASTE_UUID_HERE>',
  role_id = ${formData.role_id},
  status = 'active'
WHERE email = '${formData.email}';`}
                </pre>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Step 3: Assign Restaurants (Optional)</h3>
                <p className="text-sm">
                  After activation, you can assign restaurants to this {selectedRole?.name || 'admin'} in the admin users list.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Step 4: Send Credentials</h3>
                <p className="text-sm">Send the new admin:</p>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                  <li>Email: {formData.email}</li>
                  <li>Role: {selectedRole?.name || 'N/A'}</li>
                  <li>Temporary password (from Step 1)</li>
                  <li>Login URL with instructions to reset password on first login</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <Link href="/admin/users/admin-users" className="flex-1">
                <Button variant="outline" className="w-full">
                  Back to Admin Users
                </Button>
              </Link>
              <Button onClick={() => {
                setResult(null)
                setFormData({ email: '', first_name: '', last_name: '', phone: '', role_id: '', restaurant_ids: [] })
              }} className="flex-1">
                Create Another Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users/admin-users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Admin User</h1>
          <p className="text-muted-foreground">Create a new admin user request (requires manual setup)</p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Manual Process Required</AlertTitle>
        <AlertDescription>
          Creating admin users requires manual steps in Supabase Dashboard to create the auth account.
          You'll receive detailed instructions after submitting this form.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Admin User Details</CardTitle>
          <CardDescription>Enter the information for the new admin user</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="input-email"
                placeholder="admin@menu.ca"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  data-testid="input-first-name"
                  placeholder="John"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  data-testid="input-last-name"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="input-phone"
                placeholder="+1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role_id}
                onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                required
              >
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {loadingRoles ? (
                    <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                  ) : assignableRoles.length === 0 ? (
                    <SelectItem value="none" disabled>No roles available</SelectItem>
                  ) : (
                    assignableRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.is_system_role && <Shield className="inline h-3 w-3 mr-1" />}
                        {role.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {currentRoleId === 1 
                  ? "As a Super Admin, you can assign any role"
                  : "You can only assign Staff and Restaurant Manager roles"
                }
              </p>
            </div>

            {/* Restaurant Selection - Only for Restaurant Managers */}
            {formData.role_id === "5" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  <Label>Assign Restaurants *</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select which restaurant(s) this manager will have access to:
                </p>
                
                {loadingRestaurants ? (
                  <div className="text-sm text-muted-foreground">Loading restaurants...</div>
                ) : restaurants && restaurants.restaurants && restaurants.restaurants.length > 0 ? (
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                    {restaurants.restaurants.map((restaurant: any) => (
                      <div key={restaurant.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`restaurant-${restaurant.id}`}
                          checked={formData.restaurant_ids.includes(restaurant.id)}
                          onCheckedChange={() => toggleRestaurant(restaurant.id)}
                          data-testid={`checkbox-restaurant-${restaurant.id}`}
                        />
                        <Label 
                          htmlFor={`restaurant-${restaurant.id}`} 
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {restaurant.name} {restaurant.city && `• ${restaurant.city}`}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No active restaurants found. Please ensure there are active restaurants before creating a Restaurant Manager.
                    </AlertDescription>
                  </Alert>
                )}
                
                {formData.restaurant_ids.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.restaurant_ids.length} restaurant(s) selected
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Link href="/admin/users/admin-users" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={
                  createAdmin.isPending || 
                  !formData.role_id ||
                  (formData.role_id === "5" && formData.restaurant_ids.length === 0)
                }
                className="flex-1"
                data-testid="button-submit"
              >
                {createAdmin.isPending ? 'Creating...' : (
                  formData.role_id === "5" ? 'Create Restaurant Owner' : 'Create Admin Request'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
