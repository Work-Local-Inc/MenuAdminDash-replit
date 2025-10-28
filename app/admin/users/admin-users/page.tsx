"use client"

import { useState } from 'react'
import { useAdminUsers, useDeleteAdminUser } from '@/lib/hooks/use-admin-users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, UserPlus, Edit, Trash2, Shield } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useAdminUsers({
    search,
    role_id: roleFilter,
    status: statusFilter,
  })

  const deleteAdmin = useDeleteAdminUser()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: 'default',
      pending: 'secondary',
      suspended: 'destructive',
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Users</h1>
          <p className="text-muted-foreground">
            Manage admin users, roles, and restaurant assignments
          </p>
        </div>
        <Link href="/admin/users/admin-users/create">
          <Button data-testid="button-create-admin">
            <UserPlus className="mr-2 h-4 w-4" />
            Create Admin
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                <SelectItem value="1">Super Admin</SelectItem>
                <SelectItem value="5">Restaurant Manager</SelectItem>
                <SelectItem value="2">Manager</SelectItem>
                <SelectItem value="3">Support</SelectItem>
                <SelectItem value="6">Staff</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading admin users...
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No admin users found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>MFA</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data?.map((admin: any) => (
                    <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                      <TableCell className="font-medium">{admin.email}</TableCell>
                      <TableCell>
                        {admin.first_name} {admin.last_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {admin.admin_roles?.is_system_role && (
                            <Shield className="h-3 w-3 text-primary" />
                          )}
                          <span>{admin.admin_roles?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(admin.status)}</TableCell>
                      <TableCell>
                        {admin.mfa_enabled ? (
                          <Badge variant="default">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {admin.last_login_at ? formatDate(admin.last_login_at) : 'Never'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(admin.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-actions-${admin.id}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/users/admin-users/${admin.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/users/admin-users/${admin.id}/restaurants`}>
                                <Shield className="mr-2 h-4 w-4" />
                                Manage Restaurants
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm(`Delete admin user ${admin.email}?`)) {
                                  deleteAdmin.mutate(admin.id.toString())
                                }
                              }}
                              data-testid={`menu-delete-${admin.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {data?.count && data.count > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {data.data.length} of {data.count} admin users
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
