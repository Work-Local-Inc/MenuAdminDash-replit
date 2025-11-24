"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tag, Check } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ModifierGroup {
  id: number
  name: string
  modifiers: Array<{
    id: number
    name: string
    price: number
  }>
}

interface CategoryModifierAssociationProps {
  categoryId: number
  categoryName: string
  availableGroups: ModifierGroup[]
  associatedGroupIds: number[]
  onToggleAssociation: (groupId: number, isAssociated: boolean) => Promise<void>
}

export function CategoryModifierAssociation({
  categoryId,
  categoryName,
  availableGroups,
  associatedGroupIds,
  onToggleAssociation
}: CategoryModifierAssociationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Map<number, boolean>>(new Map())

  const handleToggle = async (groupId: number, currentlyAssociated: boolean) => {
    const newState = !currentlyAssociated
    setPendingChanges(prev => new Map(prev).set(groupId, true))
    
    try {
      await onToggleAssociation(groupId, newState)
    } finally {
      setPendingChanges(prev => {
        const next = new Map(prev)
        next.delete(groupId)
        return next
      })
    }
  }

  const associatedCount = associatedGroupIds.length

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={associatedCount > 0 ? "default" : "outline"}
          size="sm"
          data-testid={`button-manage-modifiers-${categoryId}`}
        >
          <Tag className="w-4 h-4 mr-2" />
          Modifier Groups
          {associatedCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {associatedCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" data-testid={`popover-modifiers-${categoryId}`}>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-1" data-testid="text-popover-title">
              Associate Modifier Groups
            </h4>
            <p className="text-xs text-muted-foreground" data-testid="text-popover-description">
              All dishes in <span className="font-medium">{categoryName}</span> will inherit these modifiers
            </p>
          </div>

          {availableGroups.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <p>No modifier groups available</p>
              <p className="text-xs mt-1">Create groups in Modifier Groups page</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              <div className="space-y-3">
                {availableGroups.map((group) => {
                  const isAssociated = associatedGroupIds.includes(group.id)
                  const isPending = pendingChanges.has(group.id)

                  return (
                    <div
                      key={group.id}
                      className="flex items-start space-x-3 p-2 rounded-md hover-elevate"
                      data-testid={`checkbox-container-group-${group.id}`}
                    >
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={isAssociated}
                        disabled={isPending}
                        onCheckedChange={() => handleToggle(group.id, isAssociated)}
                        data-testid={`checkbox-group-${group.id}`}
                      />
                      <div className="flex-1 flex items-start justify-between">
                        <div>
                          <Label
                            htmlFor={`group-${group.id}`}
                            className="text-sm font-medium cursor-pointer"
                            data-testid={`label-group-${group.id}`}
                          >
                            {group.name}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {group.modifiers.length} modifier{group.modifiers.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {isAssociated && (
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" data-testid={`icon-selected-${group.id}`} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
