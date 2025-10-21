/**
 * Server-side permission checking utilities
 * This file can safely import next/headers and @supabase/ssr
 * DO NOT import this file from client components
 */

import { NextRequest } from 'next/server'
import { verifyAdminAuth } from '@/lib/auth/admin-check'
import { hasPermission, PermissionResource, PermissionAction } from '@/lib/rbac'

/**
 * Verify admin auth and check for specific permission
 * Throws error if auth fails or permission check fails
 * Returns auth context with user, adminUser, role, and permissions
 * 
 * Usage in API routes:
 * ```
 * const authContext = await verifyAdminAuthWithPermission(request, 'restaurants', 'create')
 * // Now you can safely create a restaurant
 * ```
 */
export async function verifyAdminAuthWithPermission(
  request: NextRequest,
  resource: PermissionResource,
  action: PermissionAction
) {
  // Verify authentication and get user context
  const authContext = await verifyAdminAuth(request)
  
  // Check if user has the required permission
  if (!hasPermission(authContext.permissions, resource, action)) {
    console.error('[Permission Check] Access denied:', {
      email: authContext.adminUser.email,
      role: authContext.role?.name || 'No role assigned',
      required: `${resource}:${action}`
    })
    throw new Error(`Forbidden - requires ${resource}:${action} permission`)
  }
  
  return authContext
}

/**
 * Check permission and return boolean (no throw)
 * Useful for conditional logic in API routes
 */
export async function checkPermission(
  request: NextRequest,
  resource: PermissionResource,
  action: PermissionAction
): Promise<boolean> {
  try {
    await verifyAdminAuthWithPermission(request, resource, action)
    return true
  } catch {
    return false
  }
}
