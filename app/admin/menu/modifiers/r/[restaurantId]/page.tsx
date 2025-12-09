"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Pizza, 
  Utensils, 
  Search, 
  Layers,
  Edit,
  Plus,
  ArrowLeft,
  ChevronRight,
  Grid3X3,
  List,
  CircleDot,
  MapPin,
  Archive
} from "lucide-react"
import { useRestaurant } from "@/lib/hooks/use-restaurants"
import Link from "next/link"
import { ModifierGroupModal } from "@/components/admin/menu/modifiers/modifier-group-modal"

interface ModifierGroupListItem {
  id: number
  name: string
  source: 'simple' | 'combo'
  is_required: boolean
  min_selections: number
  max_selections: number
  modifier_count: number
  linked_dish_count: number
  supports_placements: boolean
  supports_size_pricing: boolean
}


const SourceIcon = ({ source }: { source: 'simple' | 'combo' }) => {
  if (source === 'combo') {
    return <Pizza className="h-4 w-4 text-orange-500" />
  }
  return <Utensils className="h-4 w-4 text-blue-500" />
}

const SourceBadge = ({ source }: { source: 'simple' | 'combo' }) => {
  const config = {
    combo: { label: 'Pizza/Combo', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
    simple: { label: 'Standard', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' }
  }
  const { label, className } = config[source]
  return <Badge variant="outline" className={className}>{label}</Badge>
}

interface ModifierGroupGridProps {
  groups: ModifierGroupListItem[]
  viewMode: 'grid' | 'list'
  getSelectionLabel: (group: ModifierGroupListItem) => string
  onSelectGroup: (id: number) => void
  isInactive?: boolean
}

const ModifierGroupGrid = ({ groups, viewMode, getSelectionLabel, onSelectGroup, isInactive }: ModifierGroupGridProps) => {
  if (viewMode === 'list') {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        {groups.map(group => (
          <div
            key={group.id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover-elevate transition-all ${isInactive ? 'opacity-60' : ''}`}
            onClick={() => onSelectGroup(group.id)}
            data-testid={`row-modifier-group-${group.id}`}
          >
            <SourceIcon source={group.source} />
            <div className="flex-1 min-w-0">
              <span className="font-medium truncate">{group.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{group.modifier_count} options</span>
              <span>•</span>
              <span>{group.linked_dish_count} dishes</span>
            </div>
            {group.is_required && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map(group => (
        <Card 
          key={group.id} 
          className={`cursor-pointer hover-elevate transition-all ${isInactive ? 'opacity-60' : ''}`}
          onClick={() => onSelectGroup(group.id)}
          data-testid={`card-modifier-group-${group.id}`}
        >
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-muted">
                  <SourceIcon source={group.source} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{group.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {getSelectionLabel(group)}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {group.modifier_count} option{group.modifier_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <SourceBadge source={group.source} />
              {group.is_required && (
                <Badge variant="destructive" className="text-xs">Required</Badge>
              )}
              {group.supports_placements && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  Placements
                </Badge>
              )}
              {group.supports_size_pricing && (
                <Badge variant="outline" className="text-xs">
                  Size Pricing
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <span className="text-sm text-muted-foreground">
                {group.linked_dish_count === 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">Not linked to any dishes</span>
                ) : (
                  `Linked to ${group.linked_dish_count} dish${group.linked_dish_count !== 1 ? 'es' : ''}`
                )}
              </span>
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation()
                onSelectGroup(group.id)
              }}>
                <Edit className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function RestaurantModifiersPage() {
  const params = useParams()
  const restaurantId = params.restaurantId as string
  
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: restaurant, isLoading: loadingRestaurant } = useRestaurant(restaurantId)

  const { data: modifierGroups = [], isLoading: loadingGroups } = useQuery<ModifierGroupListItem[]>({
    queryKey: ['modifier-groups', restaurantId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/menu/unified-modifiers/groups?restaurant_id=${restaurantId}`)
      if (!res.ok) throw new Error('Failed to fetch modifier groups')
      return res.json()
    },
    enabled: !!restaurantId,
  })

  const selectedGroup = modifierGroups.find(g => g.id === selectedGroupId) || null

  const filteredGroups = modifierGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSource = sourceFilter === 'all' || group.source === sourceFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && group.linked_dish_count > 0) ||
      (statusFilter === 'inactive' && group.linked_dish_count === 0)
    return matchesSearch && matchesSource && matchesStatus
  })

  const activeGroups = filteredGroups.filter(g => g.linked_dish_count > 0)
  const inactiveGroups = filteredGroups.filter(g => g.linked_dish_count === 0)

  const getSelectionLabel = (group: ModifierGroupListItem) => {
    if (group.is_required) {
      if (group.min_selections === group.max_selections) {
        return `Pick ${group.min_selections}`
      }
      return `Pick ${group.min_selections}-${group.max_selections}`
    }
    return group.max_selections > 0 ? `Up to ${group.max_selections}` : 'Optional'
  }

  if (loadingRestaurant) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/menu/modifiers">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              Modifier Library
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-restaurant-name">
              {restaurant?.name || 'Loading...'}
            </p>
          </div>
        </div>
        <Button data-testid="button-create-modifier">
          <Plus className="mr-2 h-4 w-4" />
          Create Modifier Group
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search modifier groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-modifiers"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40" data-testid="select-source-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="simple">Standard</SelectItem>
                <SelectItem value="combo">Pizza/Combo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive (0 dishes)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                data-testid="button-view-grid"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingGroups ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Modifier Groups Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || sourceFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'This restaurant has no modifier groups yet'}
            </p>
            <Button data-testid="button-create-first-modifier">
              <Plus className="mr-2 h-4 w-4" />
              Create First Modifier Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {statusFilter === 'all' && inactiveGroups.length > 0 && activeGroups.length > 0 ? (
            <>
              <ModifierGroupGrid
                groups={activeGroups}
                viewMode={viewMode}
                getSelectionLabel={getSelectionLabel}
                onSelectGroup={setSelectedGroupId}
              />
              
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Inactive ({inactiveGroups.length} not linked to any dishes)
                  </h3>
                </div>
                <ModifierGroupGrid
                  groups={inactiveGroups}
                  viewMode={viewMode}
                  getSelectionLabel={getSelectionLabel}
                  onSelectGroup={setSelectedGroupId}
                  isInactive
                />
              </div>
            </>
          ) : (
            <ModifierGroupGrid
              groups={filteredGroups}
              viewMode={viewMode}
              getSelectionLabel={getSelectionLabel}
              onSelectGroup={setSelectedGroupId}
              isInactive={statusFilter === 'inactive'}
            />
          )}
        </div>
      )}

      <ModifierGroupModal
        group={selectedGroup}
        restaurantId={restaurantId}
        open={!!selectedGroupId}
        onClose={() => setSelectedGroupId(null)}
      />
    </div>
  )
}
