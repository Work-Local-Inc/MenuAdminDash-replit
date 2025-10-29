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
 * Permission Rules:
 * - Super Admin (1): Can create ANY role including other Super Admins
 * - Manager (2): Can create Staff (6) and Restaurant Manager (5) only
 * - Support (3): Can create Staff (6) and Restaurant Manager (5) only
 * - Restaurant Manager (5): Cannot create other admins
 * - Staff (6): Cannot create other admins
 */
export function getAssignableRoles(currentAdminRoleId: number | null, allRoles: AdminRole[]): AdminRole[] {
  if (!currentAdminRoleId) return []

  // Super Admin can assign any role
  if (currentAdminRoleId === 1) {
    return allRoles
  }

  // Manager and Support can only assign Staff and Restaurant Manager
  if (currentAdminRoleId === 2 || currentAdminRoleId === 3) {
    return allRoles.filter(role => role.id === 5 || role.id === 6)
  }

  // Restaurant Manager and Staff cannot create other admins
  return []
}

/**
 * Checks if the current admin has permission to create admins
 */
export function canCreateAdmins(currentAdminRoleId: number | null): boolean {
  if (!currentAdminRoleId) return false
  // Only Super Admin (1), Manager (2), and Support (3) can create admins
  return [1, 2, 3].includes(currentAdminRoleId)
}
