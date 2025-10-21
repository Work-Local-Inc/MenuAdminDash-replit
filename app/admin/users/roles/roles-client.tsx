"use client"

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Plus, Edit, Trash2, Shield, Lock } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Role } from '@/lib/rbac'
import { RoleFormDialog } from './role-form-dialog'

interface RolesClientProps {
  initialRoles: Role[]
  initialCount: number
}

export function RolesClient({ initialRoles, initialCount }: RolesClientProps) {
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/roles', search],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(search && { search }),
      })
      const res = await fetch(`/api/roles?${params}`)
      if (!res.ok) throw new Error('Failed to fetch roles')
      return res.json()
    },
    initialData: { data: initialRoles, count: initialCount },
  })

  const roles = data?.data || []
  const totalCount = data?.count || 0

  const handleCreateRole = () => {
    setSelectedRole(null)
    setIsFormOpen(true)
  }

  const handleEditRole = (role: Role) => {
    setSelectedRole(role)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setSelectedRole(null)
    refetch()
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Roles & Permissions</h1>
          <p className="text-muted-foreground">Manage roles and their permission levels</p>
        </div>
        <Button 
          onClick={handleCreateRole}
          data-testid="button-create-role"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            Total: {totalCount} role{totalCount !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No roles found
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role: Role) => (
                    <TableRow key={role.id} data-testid={`row-role-${role.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${role.id}`}>
                        <div className="flex items-center gap-2">
                          {role.is_system_role && (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          {role.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                        {role.description || '—'}
                      </TableCell>
                      <TableCell>
                        {role.is_system_role ? (
                          <Badge variant="default" className="gap-1">
                            <Shield className="h-3 w-3" />
                            System
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Custom</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(role.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditRole(role)}
                            data-testid={`button-edit-${role.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!role.is_system_role && (
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-delete-${role.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Form Dialog */}
      <RoleFormDialog
        role={selectedRole}
        open={isFormOpen}
        onClose={handleCloseForm}
      />
    </div>
  )
}
