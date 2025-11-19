import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// ==================== TYPES ====================

export interface ModifierGroup {
  id: number;
  dish_id: number;
  name: string;
  display_order: number;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  created_at: string;
  updated_at?: string;
}

export interface Modifier {
  id: number;
  modifier_group_id: number;
  name: string;
  price: number;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateModifierGroupData {
  name: string;
  is_required?: boolean;
  min_selections?: number;
  max_selections?: number;
}

export interface UpdateModifierGroupData {
  name?: string;
  is_required?: boolean;
  min_selections?: number;
  max_selections?: number;
}

export interface CreateModifierData {
  name: string;
  price: number;
  is_default?: boolean;
}

export interface UpdateModifierData {
  name?: string;
  price?: number;
  is_default?: boolean;
}

// ==================== MODIFIER GROUPS ====================

export function useModifierGroups(dishId: number) {
  return useQuery<ModifierGroup[]>({
    queryKey: ['/api/menu/dishes', dishId, 'modifier-groups'],
    enabled: !!dishId,
  });
}

export function useCreateModifierGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ dishId, data }: { dishId: number; data: CreateModifierGroupData }) => {
      const res = await fetch(`/api/menu/dishes/${dishId}/modifier-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create modifier group');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/menu/dishes', variables.dishId, 'modifier-groups'],
      });
      toast({
        title: 'Success',
        description: 'Modifier group created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useUpdateModifierGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      dishId,
      groupId,
      data,
    }: {
      dishId: number;
      groupId: number;
      data: UpdateModifierGroupData;
    }) => {
      const res = await fetch(`/api/menu/dishes/${dishId}/modifier-groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update modifier group');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/menu/dishes', variables.dishId, 'modifier-groups'],
      });
      toast({
        title: 'Success',
        description: 'Modifier group updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useDeleteModifierGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ dishId, groupId }: { dishId: number; groupId: number }) => {
      const res = await fetch(`/api/menu/dishes/${dishId}/modifier-groups/${groupId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete modifier group');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/menu/dishes', variables.dishId, 'modifier-groups'],
      });
      // Also invalidate all modifiers for groups that belonged to this dish
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [key, dishIdParam, type, groupIdParam] = query.queryKey;
          return (
            key === '/api/menu/dishes' &&
            dishIdParam === variables.dishId &&
            type === 'modifier-groups'
          );
        },
      });
      toast({
        title: 'Success',
        description: 'Modifier group deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useReorderModifierGroups() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ dishId, groupIds }: { dishId: number; groupIds: number[] }) => {
      const res = await fetch(`/api/menu/dishes/${dishId}/modifier-groups/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_ids: groupIds }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to reorder modifier groups');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/menu/dishes', variables.dishId, 'modifier-groups'],
      });
      toast({
        title: 'Success',
        description: 'Modifier groups reordered successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

// ==================== MODIFIERS ====================

export function useModifiers(dishId: number, groupId: number) {
  return useQuery<Modifier[]>({
    queryKey: ['/api/menu/dishes', dishId, 'modifier-groups', groupId, 'modifiers'],
    enabled: !!dishId && !!groupId,
  });
}

export function useCreateModifier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      dishId,
      groupId,
      data,
    }: {
      dishId: number;
      groupId: number;
      data: CreateModifierData;
    }) => {
      const res = await fetch(`/api/menu/dishes/${dishId}/modifier-groups/${groupId}/modifiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create modifier');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          '/api/menu/dishes',
          variables.dishId,
          'modifier-groups',
          variables.groupId,
          'modifiers',
        ],
      });
      toast({
        title: 'Success',
        description: 'Modifier created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useUpdateModifier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      dishId,
      groupId,
      modifierId,
      data,
    }: {
      dishId: number;
      groupId: number;
      modifierId: number;
      data: UpdateModifierData;
    }) => {
      const res = await fetch(
        `/api/menu/dishes/${dishId}/modifier-groups/${groupId}/modifiers/${modifierId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update modifier');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          '/api/menu/dishes',
          variables.dishId,
          'modifier-groups',
          variables.groupId,
          'modifiers',
        ],
      });
      toast({
        title: 'Success',
        description: 'Modifier updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useDeleteModifier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      dishId,
      groupId,
      modifierId,
    }: {
      dishId: number;
      groupId: number;
      modifierId: number;
    }) => {
      const res = await fetch(
        `/api/menu/dishes/${dishId}/modifier-groups/${groupId}/modifiers/${modifierId}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete modifier');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          '/api/menu/dishes',
          variables.dishId,
          'modifier-groups',
          variables.groupId,
          'modifiers',
        ],
      });
      toast({
        title: 'Success',
        description: 'Modifier deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

export function useReorderModifiers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      dishId,
      groupId,
      modifierIds,
    }: {
      dishId: number;
      groupId: number;
      modifierIds: number[];
    }) => {
      const res = await fetch(
        `/api/menu/dishes/${dishId}/modifier-groups/${groupId}/modifiers/reorder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modifier_ids: modifierIds }),
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to reorder modifiers');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          '/api/menu/dishes',
          variables.dishId,
          'modifier-groups',
          variables.groupId,
          'modifiers',
        ],
      });
      toast({
        title: 'Success',
        description: 'Modifiers reordered successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}
