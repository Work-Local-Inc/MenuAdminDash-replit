"use client"

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  PERMISSION_RESOURCES,
  PERMISSION_ACTIONS,
  PermissionMatrix as PermissionMatrixType,
  PermissionResource,
  PermissionAction
} from '@/lib/rbac'

interface PermissionMatrixProps {
  permissions: PermissionMatrixType
  onChange: (permissions: PermissionMatrixType) => void
  disabled?: boolean
}

export function PermissionMatrix({ permissions, onChange, disabled = false }: PermissionMatrixProps) {
  const handleToggle = (resource: PermissionResource, action: PermissionAction, checked: boolean) => {
    const updated = { ...permissions }
    
    if (!updated[resource]) {
      updated[resource] = {}
    }
    
    updated[resource] = {
      ...updated[resource],
      [action]: checked
    }
    
    onChange(updated)
  }

  const isChecked = (resource: PermissionResource, action: PermissionAction): boolean => {
    return permissions[resource]?.[action] === true
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Configure which actions this role can perform on each resource
      </div>

      {/* Table Header */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 font-medium">Resource</th>
              {PERMISSION_ACTIONS.map(action => (
                <th key={action.value} className="text-center p-3 font-medium min-w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>{action.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {action.description}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_RESOURCES.map((resource, idx) => (
              <tr 
                key={resource.value}
                className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
              >
                <td className="p-3 font-medium">
                  <div className="flex items-center gap-2">
                    {resource.label}
                  </div>
                </td>
                {PERMISSION_ACTIONS.map(action => {
                  // Some actions don't make sense for certain resources
                  const isApplicable = checkActionApplicability(resource.value as PermissionResource, action.value as PermissionAction)
                  
                  return (
                    <td key={action.value} className="text-center p-3">
                      {isApplicable ? (
                        <div className="flex justify-center">
                          <Checkbox
                            checked={isChecked(resource.value as PermissionResource, action.value as PermissionAction)}
                            onCheckedChange={(checked) => 
                              handleToggle(
                                resource.value as PermissionResource, 
                                action.value as PermissionAction, 
                                checked === true
                              )
                            }
                            disabled={disabled}
                            data-testid={`checkbox-${resource.value}-${action.value}`}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            const allPermissions: PermissionMatrixType = {}
            PERMISSION_RESOURCES.forEach(resource => {
              allPermissions[resource.value as PermissionResource] = {}
              PERMISSION_ACTIONS.forEach(action => {
                if (checkActionApplicability(resource.value as PermissionResource, action.value as PermissionAction)) {
                  allPermissions[resource.value as PermissionResource]![action.value as PermissionAction] = true
                }
              })
            })
            onChange(allPermissions)
          }}
          disabled={disabled}
          className="text-sm text-primary hover:underline"
        >
          Select All
        </button>
        <span className="text-muted-foreground">·</span>
        <button
          type="button"
          onClick={() => onChange({})}
          disabled={disabled}
          className="text-sm text-primary hover:underline"
        >
          Clear All
        </button>
      </div>
    </div>
  )
}

/**
 * Check if an action is applicable for a resource
 * For example, "manage" doesn't make sense for "restaurants" (we use create/edit/delete instead)
 */
function checkActionApplicability(resource: PermissionResource, action: PermissionAction): boolean {
  const notApplicable: Record<PermissionResource, PermissionAction[]> = {
    restaurants: ['manage'],
    users: ['manage'],
    orders: ['create', 'edit', 'delete'], // Orders use "manage" instead
    reports: ['create', 'edit', 'delete', 'manage'], // Reports are view-only
    settings: ['create', 'edit', 'delete', 'view'], // Settings use "manage" only
    menu: ['create', 'delete', 'view', 'manage'], // Menu uses "edit" only
    coupons: ['manage'],
    franchise: ['manage'],
    blacklist: ['manage'],
    accounting: ['create', 'edit', 'delete'] // Accounting uses "manage" or "view"
  }

  return !notApplicable[resource]?.includes(action)
}
