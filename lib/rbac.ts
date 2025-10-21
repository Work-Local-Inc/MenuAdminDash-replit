/**
 * RBAC (Role-Based Access Control) Utilities
 * 
 * Permission Structure:
 * {
 *   "restaurants": { "create": true, "edit": true, "delete": true, "view": true },
 *   "users": { "create": true, "edit": true, "delete": true, "view": true },
 *   "orders": { "manage": true, "view": true },
 *   "reports": { "view": true },
 *   "settings": { "manage": true },
 *   "menu": { "edit": true }
 * }
 */

// ============================================
// TypeScript Types
// ============================================

export type PermissionResource = 
  | 'restaurants' 
  | 'users' 
  | 'orders' 
  | 'reports' 
  | 'settings'
  | 'menu'
  | 'coupons'
  | 'franchise'
  | 'blacklist'
  | 'accounting'

export type PermissionAction = 
  | 'create' 
  | 'edit' 
  | 'delete' 
  | 'view' 
  | 'manage'

export type PermissionMatrix = {
  [resource in PermissionResource]?: {
    [action in PermissionAction]?: boolean
  }
}

export interface Role {
  id: number
  uuid: string
  name: string
  description: string | null
  permissions: PermissionMatrix
  is_system_role: boolean
  created_at: string
  updated_at: string
}

export interface AdminUserWithRole {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  role_id?: number | null
  role?: Role | null
}

// ============================================
// Permission Checking Functions
// ============================================

/**
 * Check if a permission matrix allows a specific action on a resource
 */
export function hasPermission(
  permissions: PermissionMatrix | null | undefined,
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  if (!permissions) return false
  
  const resourcePermissions = permissions[resource]
  if (!resourcePermissions) return false
  
  return resourcePermissions[action] === true
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(
  permissions: PermissionMatrix | null | undefined,
  checks: Array<{ resource: PermissionResource; action: PermissionAction }>
): boolean {
  if (!permissions) return false
  
  return checks.some(({ resource, action }) => 
    hasPermission(permissions, resource, action)
  )
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(
  permissions: PermissionMatrix | null | undefined,
  checks: Array<{ resource: PermissionResource; action: PermissionAction }>
): boolean {
  if (!permissions) return false
  
  return checks.every(({ resource, action }) => 
    hasPermission(permissions, resource, action)
  )
}

/**
 * Check if role is a system role (cannot be deleted)
 */
export function isSystemRole(role: Role | null | undefined): boolean {
  return role?.is_system_role === true
}

/**
 * Check if user is Super Admin (full access to everything)
 */
export function isSuperAdmin(role: Role | null | undefined): boolean {
  return role?.name === 'Super Admin' && role?.is_system_role === true
}

/**
 * Check if user is Restaurant Manager
 */
export function isRestaurantManager(role: Role | null | undefined): boolean {
  return role?.name === 'Restaurant Manager' && role?.is_system_role === true
}

/**
 * Check if user is Staff (read-only)
 */
export function isStaff(role: Role | null | undefined): boolean {
  return role?.name === 'Staff' && role?.is_system_role === true
}

// ============================================
// Permission Helpers (Commonly Used Checks)
// ============================================

export const canCreateRestaurant = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'restaurants', 'create')

export const canEditRestaurant = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'restaurants', 'edit')

export const canDeleteRestaurant = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'restaurants', 'delete')

export const canViewRestaurants = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'restaurants', 'view')

export const canCreateUser = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'users', 'create')

export const canEditUser = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'users', 'edit')

export const canDeleteUser = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'users', 'delete')

export const canViewUsers = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'users', 'view')

export const canManageOrders = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'orders', 'manage')

export const canViewOrders = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'orders', 'view')

export const canViewReports = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'reports', 'view')

export const canManageSettings = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'settings', 'manage')

export const canEditMenu = (permissions: PermissionMatrix | null | undefined) =>
  hasPermission(permissions, 'menu', 'edit')

// ============================================
// Default Permission Sets
// ============================================

export const SUPER_ADMIN_PERMISSIONS: PermissionMatrix = {
  restaurants: { create: true, edit: true, delete: true, view: true },
  users: { create: true, edit: true, delete: true, view: true },
  orders: { manage: true, view: true },
  reports: { view: true },
  settings: { manage: true },
  menu: { edit: true },
  coupons: { create: true, edit: true, delete: true, view: true },
  franchise: { create: true, edit: true, delete: true, view: true },
  blacklist: { create: true, edit: true, delete: true, view: true },
  accounting: { manage: true, view: true }
}

export const RESTAURANT_MANAGER_PERMISSIONS: PermissionMatrix = {
  restaurants: { edit: true, view: true },
  orders: { manage: true, view: true },
  menu: { edit: true },
  reports: { view: true },
  coupons: { create: true, edit: true, view: true }
}

export const STAFF_PERMISSIONS: PermissionMatrix = {
  restaurants: { view: true },
  orders: { view: true },
  reports: { view: true }
}

// ============================================
// Permission Labels (for UI)
// ============================================

export const PERMISSION_RESOURCES = [
  { value: 'restaurants', label: 'Restaurants', icon: 'Store' },
  { value: 'users', label: 'Admin Users', icon: 'Users' },
  { value: 'orders', label: 'Orders', icon: 'ShoppingCart' },
  { value: 'reports', label: 'Reports & Analytics', icon: 'BarChart' },
  { value: 'settings', label: 'System Settings', icon: 'Settings' },
  { value: 'menu', label: 'Menu Management', icon: 'UtensilsCrossed' },
  { value: 'coupons', label: 'Coupons & Promotions', icon: 'Tag' },
  { value: 'franchise', label: 'Franchise Management', icon: 'Building2' },
  { value: 'blacklist', label: 'Blacklist & Security', icon: 'Shield' },
  { value: 'accounting', label: 'Accounting & Statements', icon: 'DollarSign' }
] as const

export const PERMISSION_ACTIONS = [
  { value: 'view', label: 'View', description: 'Can view this resource' },
  { value: 'create', label: 'Create', description: 'Can create new items' },
  { value: 'edit', label: 'Edit', description: 'Can edit existing items' },
  { value: 'delete', label: 'Delete', description: 'Can delete items' },
  { value: 'manage', label: 'Manage', description: 'Full management access' }
] as const

// ============================================
// Validation
// ============================================

/**
 * Validate permission matrix structure
 */
export function validatePermissionMatrix(permissions: unknown): permissions is PermissionMatrix {
  if (!permissions || typeof permissions !== 'object') return false
  
  const matrix = permissions as Record<string, unknown>
  
  for (const [resource, actions] of Object.entries(matrix)) {
    if (typeof actions !== 'object' || actions === null) return false
    
    for (const [action, value] of Object.entries(actions)) {
      if (typeof value !== 'boolean') return false
    }
  }
  
  return true
}
