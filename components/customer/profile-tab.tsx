"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface ProfileTabProps {
  user: any
}

export function ProfileTab({ user }: ProfileTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Your personal details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input value={user.first_name || ''} disabled />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input value={user.last_name || ''} disabled />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user.email || ''} disabled />
        </div>

        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={user.phone || 'Not provided'} disabled />
        </div>

        <p className="text-sm text-muted-foreground">
          To update your profile information, please contact support.
        </p>
      </CardContent>
    </Card>
  )
}
