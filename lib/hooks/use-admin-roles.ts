import { useQuery } from '@tanstack/react-query'

export interface AdminRole {
  id: number
  name: string
  description: string | null
  is_system_role: boolean
  permissions: any
  created_at: string
}

export function useAdminRoles() {
  return useQuery<AdminRole[]>({
    queryKey: ['/api/roles'],
    select: (data: any) => data?.data || data,
  })
}

/**
 * Determines which roles the current admin can assign to new admins
 * 
 * Simplified 2-Role Permission System:
 * - Super Admin (1): Can create any role including other Super Admins and Restaurant Admins
 * - Restaurant Admin (2): Cannot create other admins
 */
export function getAssignableRoles(currentAdminRoleId: number | null, allRoles: AdminRole[]): AdminRole[] {
  if (!currentAdminRoleId) return []

  // Super Admin can assign any role
  if (currentAdminRoleId === 1) {
    // Filter to only valid roles (1 = Super Admin, 2 = Restaurant Admin)
    return allRoles.filter(role => role.id === 1 || role.id === 2)
  }

  // Restaurant Admin (2) cannot create other admins
  return []
}

/**
 * Checks if the current admin has permission to create admins
 */
export function canCreateAdmins(currentAdminRoleId: number | null): boolean {
  if (!currentAdminRoleId) return false
  // Only Super Admin (1) can create admins in the simplified schema
  return currentAdminRoleId === 1
}
