"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Role, PermissionMatrix as PermissionMatrixType } from '@/lib/rbac'
import { PermissionMatrix } from './permission-matrix'
import { useToast } from '@/hooks/use-toast'
import { Lock } from 'lucide-react'

interface RoleFormDialogProps {
  role: Role | null
  open: boolean
  onClose: () => void
}

export function RoleFormDialog({ role, open, onClose }: RoleFormDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<PermissionMatrixType>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const isEditing = role !== null
  const isSystemRole = role?.is_system_role === true

  // Initialize form with role data
  useEffect(() => {
    if (role) {
      setName(role.name)
      setDescription(role.description || '')
      setPermissions(role.permissions || {})
    } else {
      setName('')
      setDescription('')
      setPermissions({})
    }
  }, [role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Build payload - exclude name field for system roles (names cannot be changed)
      const payload: any = {
        description: description.trim() || null,
        permissions
      }
      
      // Only include name for custom roles or new roles
      if (!isSystemRole) {
        payload.name = name.trim()
      }

      const url = isEditing ? `/api/roles/${role.id}` : '/api/roles'
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save role')
      }

      toast({
        title: isEditing ? 'Role Updated' : 'Role Created',
        description: `${data.name} has been ${isEditing ? 'updated' : 'created'} successfully.`
      })

      onClose()
    } catch (error: any) {
      console.error('Error saving role:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save role',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? (
              <div className="flex items-center gap-2">
                {isSystemRole && <Lock className="h-4 w-4 text-muted-foreground" />}
                Edit Role: {role.name}
              </div>
            ) : (
              'Create New Role'
            )}
          </DialogTitle>
          <DialogDescription>
            {isSystemRole 
              ? 'System roles cannot have their name changed, but you can modify their permissions.'
              : 'Configure the role name, description, and permissions.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Regional Manager"
                required
                disabled={isSystemRole}
                data-testid="input-role-name"
              />
              {isSystemRole && (
                <p className="text-xs text-muted-foreground">
                  System role names cannot be changed
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this role is for..."
                rows={3}
                data-testid="textarea-role-description"
              />
            </div>
          </div>

          {/* Permission Matrix */}
          <div className="space-y-2">
            <Label>Permissions</Label>
            <PermissionMatrix
              permissions={permissions}
              onChange={setPermissions}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !name.trim()}
              data-testid="button-save-role"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
