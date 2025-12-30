'use client';

import { useState, useEffect } from 'react';
import { Plus, Minus, Circle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCartStore } from '@/lib/stores/cart-store';
import type { CartModifier, PlacementType } from '@/lib/stores/cart-store';
import type { ModifierGroupWithModifiers } from '@/lib/types/menu';

interface ComboModifier {
  id: number;
  combo_modifier_group_id: number;
  name: string;
  display_order: number;
  prices: Array<{ id: number; size_variant: string | null; price: number }>;
  placements: PlacementType[];
}

interface ComboModifierGroup {
  id: number;
  combo_group_section_id: number;
  name: string;
  type_code: string | null;
  is_selected: boolean;
  modifiers: ComboModifier[];
}

interface ComboGroupSection {
  id: number;
  combo_group_id: number;
  section_type: string | null;
  use_header: string | null;
  display_order: number;
  free_items: number;
  min_selection: number;
  max_selection: number;
  is_active: boolean;
  modifier_groups: ComboModifierGroup[];
}

interface ComboDishSelection {
  id: number;
  dish_id: number;
  dish_name: string;
  dish_display_name: string | null;
  size: number | null;
  course_id: number | null;
  course_name: string | null;
}

interface ComboGroup {
  id: number;
  name: string;
  description: string | null;
  combo_rules: any;
  combo_price: number | null;
  pricing_rules: any;
  display_order: number;
  is_active: boolean;
  is_available: boolean;
  number_of_items: number;
  display_header: string | null;
  has_special_section: boolean;
  dish_selections: ComboDishSelection[];
  sections: ComboGroupSection[];
}

interface DishModalProps {
  dish: any;
  restaurantId: number;
  isOpen: boolean;
  onClose: () => void;
  buttonStyle?: 'rounded' | 'square' | null;
}

export function DishModal({ dish, restaurantId, isOpen, onClose, buttonStyle }: DishModalProps) {
  const getButtonClassName = (isIcon: boolean = false) => {
    if (isIcon) return '';
    
    return buttonStyle === 'square' 
      ? 'rounded-none' 
      : buttonStyle === 'rounded' 
      ? 'rounded-full' 
      : '';
  };
  const [selectedSize, setSelectedSize] = useState<string>('Regular');
  const [selectedModifiers, setSelectedModifiers] = useState<CartModifier[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupWithModifiers[]>([]);
  const [comboGroups, setComboGroups] = useState<ComboGroup[]>([]);
  const [isLoadingModifiers, setIsLoadingModifiers] = useState(false);
  const [groupSelections, setGroupSelections] = useState<Record<number, number[]>>({});
  const [comboSelections, setComboSelections] = useState<Record<string, number[]>>({});
  const [modifierPlacements, setModifierPlacements] = useState<Record<number, PlacementType>>({});
  const [modifierQuantities, setModifierQuantities] = useState<Record<number, number>>({});
  // Special dish selections: key = `${comboGroupId}-${selectionIndex}`, value = dish selection id
  const [specialDishSelections, setSpecialDishSelections] = useState<Record<string, number>>({});
  
  const addItem = useCartStore((state) => state.addItem);
  
  useEffect(() => {
    if (isOpen && dish.id) {
      setIsLoadingModifiers(true);
      console.log(`[DishModal] Loading modifiers for dish ${dish.id}, is_combo:`, dish.is_combo);
      
      // Use modifier_groups from dish prop (from RPC), filter by is_active
      const dishModifierGroups = (dish.modifier_groups || []).map((group: any) => ({
        ...group,
        modifiers: (group.modifiers || []).filter((m: any) => m.is_active === true)
      }));
      console.log(`[DishModal] Simple modifiers from dish prop:`, dishModifierGroups.length, 'groups');
      setModifierGroups(dishModifierGroups);
      
      // Use combo_groups from dish prop (from RPC) - already filtered by is_active in the RPC
      const dishComboGroups = dish.combo_groups || [];
      console.log(`[DishModal] Combo groups from dish prop:`, dishComboGroups.length, 'groups');
      
      // Transform combo_groups to match the expected ComboGroup interface
      const transformedComboGroups = dishComboGroups.map((cg: any) => ({
        id: cg.id,
        name: cg.name,
        description: cg.description || null,
        combo_rules: cg.combo_rules || null,
        combo_price: cg.combo_price || null,
        pricing_rules: cg.pricing_rules || null,
        display_order: cg.display_order || 0,
        is_active: true,
        is_available: true,
        number_of_items: cg.number_of_items || 1,
        display_header: cg.display_header || null,
        has_special_section: cg.has_special_section || false,
        dish_selections: cg.dish_selections || [],
        sections: (cg.sections || []).map((section: any) => ({
          id: section.id,
          combo_group_id: cg.id,
          section_type: section.section_type || null,
          use_header: section.use_header || null,
          display_order: section.display_order || 0,
          free_items: section.free_items || 0,
          min_selection: section.min_selection || 0,
          max_selection: section.max_selection || 0,
          is_active: section.is_active !== false,
          modifier_groups: (section.modifier_groups || []).map((mg: any) => ({
            id: mg.id,
            combo_group_section_id: section.id,
            name: mg.name,
            type_code: mg.type_code || null,
            is_selected: mg.is_selected || false,
            modifiers: (mg.modifiers || []).map((mod: any) => ({
              id: mod.id,
              combo_modifier_group_id: mg.id,
              name: mod.name,
              display_order: mod.display_order || 0,
              prices: mod.prices || [],
              placements: mod.placements || ['whole']
            }))
          }))
        }))
      }));
      
      setComboGroups(transformedComboGroups);
      setIsLoadingModifiers(false);
    }
  }, [isOpen, dish]);
  
  useEffect(() => {
    if (isOpen) {
      const defaultSize = dish.prices?.[0]?.size_variant || 'Regular';
      setSelectedSize(defaultSize);
      setSelectedModifiers([]);
      setQuantity(1);
      setSpecialInstructions('');
      setGroupSelections({});
      setComboSelections({});
      setModifierPlacements({});
      setModifierQuantities({});
      setSpecialDishSelections({});
    }
  }, [isOpen, dish.prices]);
  
  const getSizeOptions = () => {
    if (dish.prices && Array.isArray(dish.prices) && dish.prices.length > 0) {
      const hasLabeledVariants = dish.prices.some((p: any) => p.size_variant !== null && p.size_variant !== undefined);
      
      const filteredPrices = hasLabeledVariants
        ? dish.prices.filter((p: any) => p.size_variant !== null && p.size_variant !== undefined)
        : dish.prices;
      
      return filteredPrices.map((p: any) => ({
        name: p.size_variant,
        price: p.price
      }));
    }
    if (dish.size_options) {
      return dish.size_options;
    }
    return [{ name: 'Regular', price: dish.base_price || 0 }];
  };
  
  const sizeOptions = getSizeOptions();
  const selectedSizeOption = sizeOptions.find((s: any) => s.name === selectedSize) || sizeOptions[0];
  const sizePrice = selectedSizeOption?.price || 0;
  
  const getModifierPrice = (modifier: any): number => {
    if (!modifier.prices || modifier.prices.length === 0) return 0;
    const priceForSize = modifier.prices.find((p: any) => p.size_variant === selectedSize);
    return priceForSize?.price || modifier.prices[0]?.price || 0;
  };

  const getComboModifierPrice = (modifier: ComboModifier): number => {
    if (!modifier.prices || modifier.prices.length === 0) return 0;
    const priceForSize = modifier.prices.find(p => p.size_variant === selectedSize);
    return priceForSize?.price || modifier.prices[0]?.price || 0;
  };

  const handleModifierToggle = (group: ModifierGroupWithModifiers, modifierId: number, checked: boolean) => {
    const currentSelections = groupSelections[group.id] || [];
    let newSelections: number[];

    if (group.max_selections === 1) {
      newSelections = checked ? [modifierId] : [];
    } else {
      if (checked) {
        if (group.max_selections === 0 || currentSelections.length < group.max_selections) {
          newSelections = [...currentSelections, modifierId];
        } else {
          return;
        }
      } else {
        newSelections = currentSelections.filter(id => id !== modifierId);
      }
    }

    setGroupSelections({ ...groupSelections, [group.id]: newSelections });

    const modifier = group.modifiers.find(m => m.id === modifierId);
    if (!modifier) return;

    const price = getModifierPrice(modifier);

    if (checked) {
      setSelectedModifiers([...selectedModifiers, {
        id: modifier.id,
        name: modifier.name,
        price,
      }]);
    } else {
      setSelectedModifiers(selectedModifiers.filter(m => m.id !== modifier.id));
      const newPlacements = { ...modifierPlacements };
      delete newPlacements[modifier.id];
      setModifierPlacements(newPlacements);
    }
  };

  const handleModifierQuantityChange = (
    group: ModifierGroupWithModifiers,
    modifier: any,
    delta: number
  ) => {
    const currentQty = modifierQuantities[modifier.id] || 0;
    const newQty = Math.max(0, currentQty + delta);
    
    // Check max_selections constraint (total quantity across all modifiers in group)
    if (delta > 0 && group.max_selections > 0) {
      const totalInGroup = Object.entries(modifierQuantities)
        .filter(([id]) => group.modifiers.some(m => m.id === parseInt(id)))
        .reduce((sum, [, qty]) => sum + qty, 0);
      if (totalInGroup >= group.max_selections) return;
    }
    
    setModifierQuantities(prev => ({ ...prev, [modifier.id]: newQty }));
    
    // Update selectedModifiers array
    const price = getModifierPrice(modifier);
    if (newQty === 0) {
      // Remove modifier
      setSelectedModifiers(prev => prev.filter(m => m.id !== modifier.id));
    } else {
      // Add or update modifier with quantity
      setSelectedModifiers(prev => {
        const existing = prev.find(m => m.id === modifier.id);
        if (existing) {
          return prev.map(m => m.id === modifier.id ? { ...m, quantity: newQty } : m);
        } else {
          return [...prev, { id: modifier.id, name: modifier.name, price, quantity: newQty }];
        }
      });
    }
  };

  const handleComboModifierQuantityChange = (
    section: ComboGroupSection,
    modifierGroup: ComboModifierGroup,
    modifier: ComboModifier,
    delta: number,
    instanceIndex: number = 0
  ) => {
    const sectionKey = getComboSectionKey(section.id, modifierGroup.id, instanceIndex);
    const currentQty = modifierQuantities[modifier.id] || 0;
    const newQty = Math.max(0, currentQty + delta);
    
    // Check max_selection constraint (total quantity across all modifiers in section)
    if (delta > 0 && section.max_selection > 0) {
      const totalInSection = section.modifier_groups.flatMap(mg => mg.modifiers)
        .reduce((sum, m) => sum + (modifierQuantities[m.id] || 0), 0);
      if (totalInSection >= section.max_selection) return;
    }
    
    // Create updated quantities map for price calculation
    const updatedQuantities = { ...modifierQuantities, [modifier.id]: newQty };
    
    setModifierQuantities(updatedQuantities);
    
    // Update comboSelections for tracking
    const currentSelections = comboSelections[sectionKey] || [];
    if (newQty === 0 && currentSelections.includes(modifier.id)) {
      setComboSelections(prev => ({ 
        ...prev, 
        [sectionKey]: currentSelections.filter(id => id !== modifier.id) 
      }));
    } else if (newQty > 0 && !currentSelections.includes(modifier.id)) {
      setComboSelections(prev => ({ 
        ...prev, 
        [sectionKey]: [...currentSelections, modifier.id] 
      }));
    }
    
    // Calculate paidQuantity for ALL modifiers in section atomically (positions may have shifted)
    const freeItems = section.free_items || 0;
    const allModifiersInSection = section.modifier_groups.flatMap(mg => mg.modifiers);
    
    // Build paidQty map for all modifiers in one pass
    let cumulativeTotal = 0;
    const paidQtyMap: Record<number, number> = {};
    
    for (const m of allModifiersInSection) {
      const qty = updatedQuantities[m.id] || 0;
      if (qty > 0) {
        const startPos = cumulativeTotal;
        const freeQty = Math.max(0, Math.min(qty, freeItems - startPos));
        paidQtyMap[m.id] = qty - freeQty;
        cumulativeTotal += qty;
      }
    }
    
    // Update selectedModifiers atomically with correct paidQuantity for all modifiers
    setSelectedModifiers(prev => {
      // Start with modifiers NOT in this section (preserve them)
      const sectionModifierIds = new Set(allModifiersInSection.map(m => m.id));
      const otherModifiers = prev.filter(m => !sectionModifierIds.has(m.id));
      
      // Build new modifiers for this section based on updatedQuantities
      // Preserve placement from modifierPlacements state
      const sectionModifiers: typeof prev = [];
      for (const m of allModifiersInSection) {
        const qty = updatedQuantities[m.id] || 0;
        if (qty > 0) {
          const mPrice = getComboModifierPrice(m);
          const placement = modifierPlacements[m.id];
          sectionModifiers.push({
            id: m.id,
            name: m.name,
            price: mPrice,
            quantity: qty,
            paidQuantity: paidQtyMap[m.id] || 0,
            ...(placement && { placement }),
          });
        }
      }
      
      return [...otherModifiers, ...sectionModifiers];
    });
  };

  const getComboSectionKey = (sectionId: number, groupId: number, instanceIndex: number = 0) => `${sectionId}-${groupId}-${instanceIndex}`;
  
  // Parse display_header (semicolon-separated) to get contextual labels
  const getContextualLabels = (displayHeader: string | null, numberOfItems: number): string[] => {
    if (displayHeader) {
      const labels = displayHeader.split(';').map(s => s.trim()).filter(Boolean);
      if (labels.length >= numberOfItems) return labels;
    }
    // Fallback labels
    const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];
    return Array.from({ length: numberOfItems }, (_, i) => ordinals[i] || `Item ${i + 1}`);
  };
  
  // Pizza topping keywords used for placement detection
  const toppingKeywords = ['topping', 'garniture', 'ingredient', 'add more', 'extra'];
  const defaultPlacements: PlacementType[] = ['whole', 'left', 'right'];

  // Check if a combo section should show pizza placements
  // Detect by section_type OR by common topping-related keywords in the header/names
  const isPizzaToppingSection = (section: ComboGroupSection): boolean => {
    if (section.section_type === 'custom_ingredients') return true;
    
    // Check section header
    const header = (section.use_header || '').toLowerCase();
    if (toppingKeywords.some(keyword => header.includes(keyword))) return true;
    
    // Also check modifier group names within the section
    for (const mg of section.modifier_groups) {
      const groupName = (mg.name || '').toLowerCase();
      if (toppingKeywords.some(keyword => groupName.includes(keyword))) return true;
    }
    
    return false;
  };

  // Check if a simple modifier group should show pizza placements
  const isSimpleModifierToppingGroup = (group: { name: string }): boolean => {
    const groupName = (group.name || '').toLowerCase();
    return toppingKeywords.some(keyword => groupName.includes(keyword));
  };

  const handleComboModifierToggle = (
    section: ComboGroupSection,
    modifierGroup: ComboModifierGroup,
    modifier: ComboModifier,
    checked: boolean,
    instanceIndex: number = 0,
    instanceLabel: string = ''
  ) => {
    const sectionKey = getComboSectionKey(section.id, modifierGroup.id, instanceIndex);
    const currentSelections = comboSelections[sectionKey] || [];
    let newSelections: number[];

    if (section.max_selection === 1) {
      newSelections = checked ? [modifier.id] : [];
      if (!checked) {
        const oldModifierId = currentSelections[0];
        if (oldModifierId) {
          setSelectedModifiers(prev => prev.filter(m => m.id !== oldModifierId));
          const newPlacements = { ...modifierPlacements };
          delete newPlacements[oldModifierId];
          setModifierPlacements(newPlacements);
        }
      }
    } else {
      if (checked) {
        if (section.max_selection === 0 || currentSelections.length < section.max_selection) {
          newSelections = [...currentSelections, modifier.id];
        } else {
          return;
        }
      } else {
        newSelections = currentSelections.filter(id => id !== modifier.id);
      }
    }

    setComboSelections({ ...comboSelections, [sectionKey]: newSelections });

    const freeItems = section.free_items || 0;
    const fullPrice = getComboModifierPrice(modifier);
    const defaultPlacement: PlacementType = modifier.placements?.includes('whole') ? 'whole' : (modifier.placements?.[0] || 'whole');

    if (checked) {
      // Calculate paidQuantity based on position in selection order
      const positionInSelection = newSelections.indexOf(modifier.id);
      const isPaid = positionInSelection >= freeItems;
      
      if (modifier.placements && modifier.placements.length > 0) {
        setModifierPlacements(prev => ({ ...prev, [modifier.id]: defaultPlacement }));
      }
      setSelectedModifiers(prev => [...prev, {
        id: modifier.id,
        name: modifier.name,
        price: fullPrice,
        quantity: 1,
        paidQuantity: isPaid ? 1 : 0,
        placement: modifier.placements && modifier.placements.length > 0 ? defaultPlacement : undefined,
      }]);
    } else {
      // Remove the modifier and recalculate prices atomically for remaining items
      const newPlacements = { ...modifierPlacements };
      delete newPlacements[modifier.id];
      setModifierPlacements(newPlacements);
      
      // Recalculate paidQuantity for remaining items (they may shift into free slots)
      // For toggle mode, each selected modifier has quantity=1
      const allModifiersInSection = section.modifier_groups.flatMap(mg => mg.modifiers);
      const newSelectionsSet = new Set(newSelections);
      
      // Build paidQty map for all remaining modifiers
      let cumulativeTotal = 0;
      const paidQtyMap: Record<number, number> = {};
      
      for (const m of allModifiersInSection) {
        if (newSelectionsSet.has(m.id)) {
          const startPos = cumulativeTotal;
          const freeQty = startPos < freeItems ? 1 : 0;
          paidQtyMap[m.id] = 1 - freeQty;
          cumulativeTotal += 1;
        }
      }
      
      // Update selectedModifiers atomically
      setSelectedModifiers(prev => {
        // Remove the deselected modifier and update prices for remaining section modifiers
        const sectionModifierIds = new Set(allModifiersInSection.map(m => m.id));
        const otherModifiers = prev.filter(m => !sectionModifierIds.has(m.id));
        
        // Build new modifiers for this section based on newSelections
        // Use newPlacements (with deselected modifier removed) for correct placement data
        const sectionModifiers: typeof prev = [];
        for (const m of allModifiersInSection) {
          if (newSelectionsSet.has(m.id)) {
            const mPrice = getComboModifierPrice(m);
            const placement = newPlacements[m.id];
            sectionModifiers.push({
              id: m.id,
              name: m.name,
              price: mPrice,
              quantity: 1,
              paidQuantity: paidQtyMap[m.id] || 0,
              ...(placement && { placement }),
            });
          }
        }
        
        return [...otherModifiers, ...sectionModifiers];
      });
    }
  };

  const handlePlacementChange = (modifierId: number, placement: PlacementType) => {
    setModifierPlacements(prev => ({ ...prev, [modifierId]: placement }));
    setSelectedModifiers(prev => prev.map(m => 
      m.id === modifierId ? { ...m, placement } : m
    ));
  };

  // Handle special dish selection for combo groups with has_special_section=true
  const handleSpecialDishSelection = (
    comboGroup: ComboGroup,
    selectionIndex: number,
    dishSelection: ComboDishSelection | null,
    contextLabel: string
  ) => {
    const key = `${comboGroup.id}-${selectionIndex}`;
    
    if (dishSelection === null) {
      // Deselect
      setSpecialDishSelections(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      
      // Remove from selectedModifiers
      // Use unique id based on combo group and selection index
      const modifierId = comboGroup.id * 10000 + selectionIndex;
      setSelectedModifiers(prev => prev.filter(m => m.id !== modifierId));
    } else {
      // Select new dish
      setSpecialDishSelections(prev => ({ ...prev, [key]: dishSelection.id }));
      
      // Add as a modifier with the selected dish name
      const modifierId = comboGroup.id * 10000 + selectionIndex;
      const displayName = dishSelection.dish_display_name || dishSelection.dish_name;
      const label = contextLabel ? `${contextLabel}: ${displayName}` : displayName;
      
      // Remove old selection if exists, then add new one
      setSelectedModifiers(prev => {
        const filtered = prev.filter(m => m.id !== modifierId);
        return [...filtered, {
          id: modifierId,
          name: label,
          price: 0, // Dish selections are typically included in combo price
          quantity: 1,
          paidQuantity: 0, // Free as part of combo
        }];
      });
    }
  };

  const isComboModifierSelected = (sectionId: number, groupId: number, modifierId: number, instanceIndex: number = 0): boolean => {
    const sectionKey = getComboSectionKey(sectionId, groupId, instanceIndex);
    return (comboSelections[sectionKey] || []).includes(modifierId);
  };
  
  const handleAddToCart = () => {
    const itemToAdd = {
      dishId: dish.id,
      dishName: dish.name,
      dishImage: dish.image_url,
      size: selectedSize,
      sizePrice,
      quantity,
      modifiers: selectedModifiers,
      specialInstructions: specialInstructions.trim(),
    };
    
    console.log('[DishModal] Adding item to cart:', itemToAdd);
    addItem(itemToAdd);
    console.log('[DishModal] Item added, closing modal');
    
    onClose();
  };
  
  // Calculate total using paidQuantity for free items tracking
  const itemTotal = (sizePrice + selectedModifiers.reduce((sum, m) => {
    // Use paidQuantity if available (for combo modifiers with free items)
    // Otherwise fall back to quantity for simple modifiers
    const paidQty = m.paidQuantity !== undefined ? m.paidQuantity : (m.quantity || 1);
    return sum + (m.price * paidQty);
  }, 0)) * quantity;

  // Check if all required modifiers are selected
  const getMissingRequirements = (): string[] => {
    const missing: string[] = [];
    
    // Check simple modifier groups (required ones)
    // Skip validation for groups that have no modifier options (data issue)
    for (const group of modifierGroups) {
      if (group.is_required) {
        // Skip if group has no selectable modifiers
        if (!group.modifiers || group.modifiers.length === 0) {
          continue;
        }
        const groupSelected = groupSelections[group.id] || [];
        if (groupSelected.length === 0) {
          missing.push(group.name);
        }
      }
    }
    
    // Check combo group sections (min_selection > 0 means required)
    // Section min_selection applies to TOTAL selections across ALL modifier groups in that section
    // IMPORTANT: Skip validation for sections that have no modifier options available (legacy data issue)
    for (const comboGroup of comboGroups) {
      const numberOfItems = comboGroup.number_of_items || 1;
      const contextualLabels = getContextualLabels(comboGroup.display_header, numberOfItems);
      
      // Check special dish selections if has_special_section is true
      if (comboGroup.has_special_section && comboGroup.dish_selections && comboGroup.dish_selections.length > 0) {
        for (let instanceIndex = 0; instanceIndex < numberOfItems; instanceIndex++) {
          const key = `${comboGroup.id}-${instanceIndex}`;
          const hasSelection = specialDishSelections[key] !== undefined;
          
          if (!hasSelection) {
            // Use contextual label if available
            const label = numberOfItems > 1 
              ? contextualLabels[instanceIndex] 
              : (comboGroup.name || 'selection');
            
            if (!missing.includes(label)) {
              missing.push(label);
            }
          }
        }
      }
      
      for (let instanceIndex = 0; instanceIndex < numberOfItems; instanceIndex++) {
        for (const section of comboGroup.sections) {
          if (section.min_selection > 0) {
            // Check if this section has any selectable modifier options
            const hasSelectableOptions = section.modifier_groups.some(
              (mg) => mg.modifiers && mg.modifiers.length > 0
            );
            
            // Skip validation for sections with no options (legacy data issue)
            if (!hasSelectableOptions) {
              continue;
            }
            
            // Count TOTAL selections across all modifier groups in this section
            let totalSectionSelections = 0;
            for (const modifierGroup of section.modifier_groups) {
              const sectionKey = getComboSectionKey(section.id, modifierGroup.id, instanceIndex);
              const currentSelections = comboSelections[sectionKey] || [];
              totalSectionSelections += currentSelections.length;
            }
            
            if (totalSectionSelections < section.min_selection) {
              // Build a meaningful label for the whole section
              const sectionLabel = section.use_header || section.modifier_groups[0]?.name || 'selection';
              const contextLabel = numberOfItems > 1 
                ? `${contextualLabels[instanceIndex]} ${sectionLabel}`
                : sectionLabel;
              
              if (!missing.includes(contextLabel)) {
                missing.push(contextLabel);
              }
            }
          }
        }
      }
    }
    
    return missing;
  };

  const missingRequirements = getMissingRequirements();
  const canAddToCart = !isLoadingModifiers && missingRequirements.length === 0;

  const PlacementSelector = ({ modifierId, placements }: { modifierId: number; placements: PlacementType[] }) => {
    const currentPlacement = modifierPlacements[modifierId] || 'whole';
    
    return (
      <div className="flex items-center gap-1 mt-2 ml-6">
        <RadioGroup 
          value={currentPlacement} 
          onValueChange={(value) => handlePlacementChange(modifierId, value as PlacementType)}
          className="flex flex-row gap-3"
        >
          {placements.includes('whole') && (
            <div className="flex items-center gap-1.5">
              <RadioGroupItem 
                value="whole" 
                id={`placement-whole-${modifierId}`}
                data-testid={`radio-placement-whole-${modifierId}`}
                className="h-3.5 w-3.5"
              />
              <Label 
                htmlFor={`placement-whole-${modifierId}`} 
                className="text-xs cursor-pointer flex items-center gap-1"
              >
                <Circle className="h-3 w-3 fill-current" />
                Whole
              </Label>
            </div>
          )}
          {placements.includes('left') && (
            <div className="flex items-center gap-1.5">
              <RadioGroupItem 
                value="left" 
                id={`placement-left-${modifierId}`}
                data-testid={`radio-placement-left-${modifierId}`}
                className="h-3.5 w-3.5"
              />
              <Label 
                htmlFor={`placement-left-${modifierId}`} 
                className="text-xs cursor-pointer flex items-center gap-1"
              >
                <div className="h-3 w-3 rounded-full overflow-hidden flex">
                  <div className="w-1/2 bg-current" />
                  <div className="w-1/2 bg-muted-foreground/20" />
                </div>
                Left
              </Label>
            </div>
          )}
          {placements.includes('right') && (
            <div className="flex items-center gap-1.5">
              <RadioGroupItem 
                value="right" 
                id={`placement-right-${modifierId}`}
                data-testid={`radio-placement-right-${modifierId}`}
                className="h-3.5 w-3.5"
              />
              <Label 
                htmlFor={`placement-right-${modifierId}`} 
                className="text-xs cursor-pointer flex items-center gap-1"
              >
                <div className="h-3 w-3 rounded-full overflow-hidden flex">
                  <div className="w-1/2 bg-muted-foreground/20" />
                  <div className="w-1/2 bg-current" />
                </div>
                Right
              </Label>
            </div>
          )}
        </RadioGroup>
      </div>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto p-0" data-testid={`modal-dish-${dish.id}`}>
        {dish.image_url && (
          <div className="w-full h-48 sm:h-64 bg-muted relative">
            <img
              src={dish.image_url}
              alt={dish.name}
              className="w-full h-full object-cover"
              data-testid={`img-modal-dish-${dish.id}`}
            />
          </div>
        )}
        
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl" data-testid={`text-modal-title-${dish.id}`}>
              {dish.name}
            </DialogTitle>
          </DialogHeader>
          
          {dish.description && (
            <p className="text-muted-foreground" data-testid={`text-modal-description-${dish.id}`}>
              {dish.description}
            </p>
          )}
          
          {Array.isArray(sizeOptions) && sizeOptions.length > 1 && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Size</Label>
              <RadioGroup value={selectedSize} onValueChange={setSelectedSize}>
                {sizeOptions.map((option: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem 
                      value={option.name} 
                      id={`size-${idx}`}
                      data-testid={`radio-size-${option.name}`}
                    />
                    <Label htmlFor={`size-${idx}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">{option.name}</span>
                      <span className="text-muted-foreground ml-2">
                        ${Number(option.price).toFixed(2)}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
          
          {/* Non-Drinks simple modifiers first */}
          {modifierGroups.filter(g => !g.name.toLowerCase().includes('drink')).length > 0 && (
            <div className="space-y-4">
              {modifierGroups
                .filter(g => !g.name.toLowerCase().includes('drink'))
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                .map((group) => {
                const groupSelected = groupSelections[group.id] || [];
                const isMaxSelections = group.max_selections > 0 && groupSelected.length >= group.max_selections;

                return (
                  <div key={group.id} className="border rounded-lg p-4 bg-muted/30 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Label className="text-base font-semibold block">
                          {group.name}
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          {group.is_required ? (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Optional</span>
                          )}
                          {group.max_selections > 0 && (
                            <span className="text-xs text-muted-foreground">
                              • {group.max_selections === 1 ? 'Choose 1' : `Max ${group.max_selections}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {group.instructions && (
                      <p className="text-sm text-muted-foreground -mt-1">{group.instructions}</p>
                    )}
                    
                    {group.max_selections === 1 ? (
                      <RadioGroup
                        value={groupSelected[0]?.toString() || ''}
                        onValueChange={(value) => {
                          const modifierId = parseInt(value);
                          const oldSelection = groupSelected[0];
                          if (oldSelection) {
                            handleModifierToggle(group, oldSelection, false);
                          }
                          handleModifierToggle(group, modifierId, true);
                        }}
                      >
                        {group.modifiers.map((modifier) => {
                          const price = getModifierPrice(modifier);
                          return (
                            <div key={modifier.id} className="flex items-center space-x-2 mb-2">
                              <RadioGroupItem
                                value={modifier.id.toString()}
                                id={`modifier-${modifier.id}`}
                                data-testid={`radio-modifier-${modifier.id}`}
                              />
                              <Label htmlFor={`modifier-${modifier.id}`} className="flex-1 cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <span>{modifier.name}</span>
                                  {price > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                      +${Number(price).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-3">
                        {group.modifiers.map((modifier) => {
                          const price = getModifierPrice(modifier);
                          const currentQty = modifierQuantities[modifier.id] || 0;
                          const showPlacements = isSimpleModifierToppingGroup(group);
                          
                          // Calculate total quantity in group for max_selections check
                          const totalInGroup = Object.entries(modifierQuantities)
                            .filter(([id]) => group.modifiers.some(m => m.id === parseInt(id)))
                            .reduce((sum, [, qty]) => sum + qty, 0);
                          const isMaxReached = group.max_selections > 0 && totalInGroup >= group.max_selections;
                          
                          return (
                            <div key={modifier.id}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span>{modifier.name}</span>
                                  {price > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                      +${Number(price).toFixed(2)} each
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                    onClick={() => handleModifierQuantityChange(group, modifier, -1)}
                                    disabled={currentQty === 0}
                                    data-testid={`button-modifier-decrease-${modifier.id}`}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-6 text-center font-medium" data-testid={`text-modifier-qty-${modifier.id}`}>
                                    {currentQty}
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                    onClick={() => handleModifierQuantityChange(group, modifier, 1)}
                                    disabled={isMaxReached && currentQty === 0}
                                    data-testid={`button-modifier-increase-${modifier.id}`}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  {currentQty > 1 && price > 0 && (
                                    <span className="text-sm font-medium text-muted-foreground ml-1">
                                      = +${(price * currentQty).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {currentQty > 0 && showPlacements && (
                                <PlacementSelector modifierId={modifier.id} placements={defaultPlacements} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {comboGroups.length > 0 && (
            <div className="space-y-4">
              {/* Sort combo groups by display_order */}
              {[...comboGroups].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((comboGroup) => {
                const numberOfItems = comboGroup.number_of_items || 1;
                const contextualLabels = getContextualLabels(comboGroup.display_header, numberOfItems);
                
                return (
                  <div key={comboGroup.id} className="space-y-4">
                    {/* Special dish selection UI for combos with has_special_section=true */}
                    {comboGroup.has_special_section && comboGroup.dish_selections && comboGroup.dish_selections.length > 0 && (
                      Array.from({ length: numberOfItems }).map((_, instanceIndex) => {
                        const key = `${comboGroup.id}-${instanceIndex}`;
                        const selectedDishId = specialDishSelections[key];
                        const selectedDish = comboGroup.dish_selections.find(ds => ds.id === selectedDishId);
                        const contextLabel = contextualLabels[instanceIndex];
                        
                        // Group dishes by course for better organization
                        const courseGroups: Record<string, ComboDishSelection[]> = {};
                        comboGroup.dish_selections.forEach(ds => {
                          const courseName = ds.course_name || 'Options';
                          if (!courseGroups[courseName]) {
                            courseGroups[courseName] = [];
                          }
                          courseGroups[courseName].push(ds);
                        });
                        
                        return (
                          <div 
                            key={key}
                            className="border rounded-lg p-4 bg-muted/30 space-y-3"
                            data-testid={`special-dish-section-${key}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                {numberOfItems > 1 && (
                                  <span className="text-sm font-medium text-muted-foreground block mb-1">
                                    {contextLabel}
                                  </span>
                                )}
                                <Label className="text-base font-semibold block">
                                  {comboGroup.name || 'Choose your item'}
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    • Choose 1 from {comboGroup.dish_selections.length} options
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {Object.entries(courseGroups).map(([courseName, dishes]) => (
                              <div key={courseName} className="space-y-2">
                                {Object.keys(courseGroups).length > 1 && (
                                  <Label className="text-sm font-medium text-muted-foreground block">
                                    {courseName}
                                  </Label>
                                )}
                                <RadioGroup
                                  value={selectedDishId?.toString() || ''}
                                  onValueChange={(value) => {
                                    const dishId = parseInt(value);
                                    const dish = comboGroup.dish_selections.find(ds => ds.id === dishId);
                                    handleSpecialDishSelection(comboGroup, instanceIndex, dish || null, contextLabel);
                                  }}
                                >
                                  {dishes.map((dish) => {
                                    const displayName = dish.dish_display_name || dish.dish_name;
                                    const isSelected = selectedDishId === dish.id;
                                    
                                    return (
                                      <div key={dish.id} className="flex items-center space-x-2">
                                        <RadioGroupItem
                                          value={dish.id.toString()}
                                          id={`special-dish-${key}-${dish.id}`}
                                          data-testid={`radio-special-dish-${key}-${dish.id}`}
                                        />
                                        <Label 
                                          htmlFor={`special-dish-${key}-${dish.id}`} 
                                          className="flex-1 cursor-pointer"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className={isSelected ? 'font-medium' : ''}>
                                              {displayName}
                                            </span>
                                            {isSelected && (
                                              <span className="text-green-600 text-sm font-medium">Included</span>
                                            )}
                                          </div>
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </RadioGroup>
                              </div>
                            ))}
                          </div>
                        );
                      })
                    )}
                    
                    {/* Repeat regular modifier sections based on number_of_items */}
                    {Array.from({ length: numberOfItems }).map((_, instanceIndex) => (
                      comboGroup.sections.map((section) => {
                        const allModifiers = section.modifier_groups.flatMap(mg => mg.modifiers);
                        if (allModifiers.length === 0) return null;
                        
                        // Check if this section should show pizza placements
                        const showPizzaPlacements = isPizzaToppingSection(section);

                        return (
                          <div 
                            key={`${section.id}-${instanceIndex}`} 
                            className="border rounded-lg p-4 bg-muted/30 space-y-3" 
                            data-testid={`combo-section-${section.id}-${instanceIndex}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                {/* Show contextual label for repeated sections */}
                                {numberOfItems > 1 && (
                                  <span className="text-sm font-medium text-muted-foreground block mb-1">
                                    {contextualLabels[instanceIndex]}
                                  </span>
                                )}
                                {section.use_header && (
                                  <Label className="text-base font-semibold block">
                                    {section.use_header}
                                  </Label>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  {section.min_selection > 0 ? (
                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Optional</span>
                                  )}
                                  {section.free_items > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      • {section.free_items} free
                                    </span>
                                  )}
                                  {section.max_selection > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      • {section.max_selection === 1 ? 'Choose 1' : `Max ${section.max_selection}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {section.modifier_groups.map((modifierGroup) => {
                              const sectionKey = getComboSectionKey(section.id, modifierGroup.id, instanceIndex);
                              const currentSelections = comboSelections[sectionKey] || [];
                              const isMaxSelections = section.max_selection > 0 && currentSelections.length >= section.max_selection;

                              return (
                                <div key={`${modifierGroup.id}-${instanceIndex}`} className="space-y-2">
                                  {modifierGroup.name && section.modifier_groups.length > 1 && (
                                    <Label className="text-sm font-medium text-muted-foreground block">
                                      {modifierGroup.name}
                                    </Label>
                                  )}

                                  {section.max_selection === 1 ? (
                                    <RadioGroup
                                      value={currentSelections[0]?.toString() || ''}
                                      onValueChange={(value) => {
                                        const modifierId = parseInt(value);
                                        const modifier = modifierGroup.modifiers.find(m => m.id === modifierId);
                                        if (modifier) {
                                          const oldModifierId = currentSelections[0];
                                          if (oldModifierId) {
                                            const oldModifier = modifierGroup.modifiers.find(m => m.id === oldModifierId);
                                            if (oldModifier) {
                                              handleComboModifierToggle(section, modifierGroup, oldModifier, false, instanceIndex, contextualLabels[instanceIndex]);
                                            }
                                          }
                                          handleComboModifierToggle(section, modifierGroup, modifier, true, instanceIndex, contextualLabels[instanceIndex]);
                                        }
                                      }}
                                    >
                                      {modifierGroup.modifiers.map((modifier) => {
                                        const fullPrice = getComboModifierPrice(modifier);
                                        const isSelected = currentSelections.includes(modifier.id);
                                        const selectionIndex = currentSelections.indexOf(modifier.id);
                                        const freeItems = section.free_items || 0;
                                        const isFreeSlot = isSelected && selectionIndex < freeItems;
                                        // Use database placements if available, otherwise auto-enable for pizza toppings
                                        const hasPlacements = (modifier.placements && modifier.placements.length > 0) || showPizzaPlacements;
                                        const placements = (modifier.placements && modifier.placements.length > 0) ? modifier.placements : (showPizzaPlacements ? defaultPlacements : []);
                                        const modifierKey = `${modifier.id}-${instanceIndex}`;
                                        
                                        return (
                                          <div key={modifierKey}>
                                            <div className="flex items-center space-x-2 mb-1">
                                              <RadioGroupItem
                                                value={modifier.id.toString()}
                                                id={`combo-modifier-${modifierKey}`}
                                                data-testid={`radio-combo-modifier-${modifierKey}`}
                                              />
                                              <Label htmlFor={`combo-modifier-${modifierKey}`} className="flex-1 cursor-pointer">
                                                <div className="flex items-center justify-between">
                                                  <span>{modifier.name}</span>
                                                  <span className="text-sm">
                                                    {isSelected && isFreeSlot ? (
                                                      <span className="text-green-600 font-medium">Free</span>
                                                    ) : fullPrice > 0 ? (
                                                      <span className="text-muted-foreground">+${Number(fullPrice).toFixed(2)}</span>
                                                    ) : null}
                                                  </span>
                                                </div>
                                              </Label>
                                            </div>
                                            {isSelected && hasPlacements && (
                                              <PlacementSelector modifierId={modifier.id} placements={placements} />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </RadioGroup>
                                  ) : (
                                    <div className="space-y-3">
                                      {(() => {
                                        // Calculate cumulative quantities to determine free vs paid items
                                        const freeItems = section.free_items || 0;
                                        const allModifiersInSection = section.modifier_groups.flatMap(mg => mg.modifiers);
                                        
                                        // Build ordered list of modifiers with quantities for free item calculation
                                        // Count total quantity in section for max_selection check
                                        const totalInSection = allModifiersInSection
                                          .reduce((sum, m) => sum + (modifierQuantities[m.id] || 0), 0);
                                        const isMaxReached = section.max_selection > 0 && totalInSection >= section.max_selection;
                                        
                                        // Calculate cumulative position for each modifier to determine free vs paid
                                        let cumulativeQty = 0;
                                        const modifierFreeInfo: Record<number, { freeQty: number; paidQty: number }> = {};
                                        
                                        for (const m of allModifiersInSection) {
                                          const qty = modifierQuantities[m.id] || 0;
                                          if (qty > 0) {
                                            const startPos = cumulativeQty;
                                            const endPos = cumulativeQty + qty;
                                            // How many of this modifier's qty falls within free limit?
                                            const freeQty = Math.max(0, Math.min(qty, freeItems - startPos));
                                            const paidQty = qty - freeQty;
                                            modifierFreeInfo[m.id] = { freeQty, paidQty };
                                            cumulativeQty = endPos;
                                          }
                                        }
                                        
                                        return modifierGroup.modifiers.map((modifier) => {
                                          const fullPrice = getComboModifierPrice(modifier);
                                          const currentQty = modifierQuantities[modifier.id] || 0;
                                          // Use database placements if available, otherwise auto-enable for pizza toppings
                                          const hasPlacements = (modifier.placements && modifier.placements.length > 0) || showPizzaPlacements;
                                          const placements = (modifier.placements && modifier.placements.length > 0) ? modifier.placements : (showPizzaPlacements ? defaultPlacements : []);
                                          const modifierKey = `${modifier.id}-${instanceIndex}`;
                                          
                                          // Get free/paid breakdown for this modifier
                                          const { freeQty = 0, paidQty = 0 } = modifierFreeInfo[modifier.id] || {};
                                          const paidAmount = paidQty * fullPrice;
                                          
                                          return (
                                            <div key={modifierKey}>
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <span>{modifier.name}</span>
                                                  {currentQty === 0 && fullPrice > 0 && (
                                                    <span className="text-sm text-muted-foreground">
                                                      +${Number(fullPrice).toFixed(2)} each
                                                    </span>
                                                  )}
                                                  {currentQty > 0 && freeQty > 0 && paidQty === 0 && (
                                                    <span className="text-sm text-green-600 font-medium">
                                                      Free
                                                    </span>
                                                  )}
                                                  {currentQty > 0 && freeQty > 0 && paidQty > 0 && (
                                                    <span className="text-sm">
                                                      <span className="text-green-600 font-medium">{freeQty} Free</span>
                                                      {fullPrice > 0 && (
                                                        <span className="text-muted-foreground"> + {paidQty} × ${fullPrice.toFixed(2)}</span>
                                                      )}
                                                    </span>
                                                  )}
                                                  {currentQty > 0 && freeQty === 0 && paidQty > 0 && fullPrice > 0 && (
                                                    <span className="text-sm text-muted-foreground">
                                                      +${Number(fullPrice).toFixed(2)} each
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-7 w-7"
                                                    onClick={() => handleComboModifierQuantityChange(section, modifierGroup, modifier, -1, instanceIndex)}
                                                    disabled={currentQty === 0}
                                                    data-testid={`button-combo-modifier-decrease-${modifierKey}`}
                                                  >
                                                    <Minus className="h-3 w-3" />
                                                  </Button>
                                                  <span className="w-6 text-center font-medium" data-testid={`text-combo-modifier-qty-${modifierKey}`}>
                                                    {currentQty}
                                                  </span>
                                                  <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-7 w-7"
                                                    onClick={() => handleComboModifierQuantityChange(section, modifierGroup, modifier, 1, instanceIndex)}
                                                    disabled={isMaxReached && currentQty === 0}
                                                    data-testid={`button-combo-modifier-increase-${modifierKey}`}
                                                  >
                                                    <Plus className="h-3 w-3" />
                                                  </Button>
                                                  {paidAmount > 0 && (
                                                    <span className="text-sm font-medium text-muted-foreground ml-1">
                                                      = +${paidAmount.toFixed(2)}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              {currentQty > 0 && hasPlacements && (
                                                <PlacementSelector modifierId={modifier.id} placements={placements} />
                                              )}
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Drinks section - always last */}
          {modifierGroups.filter(g => g.name.toLowerCase().includes('drink')).length > 0 && (
            <div className="space-y-4">
              {modifierGroups
                .filter(g => g.name.toLowerCase().includes('drink'))
                .map((group) => {
                  const groupSelected = groupSelections[group.id] || [];
                  const isMaxSelections = group.max_selections > 0 && groupSelected.length >= group.max_selections;

                  return (
                    <div key={group.id} className="border rounded-lg p-4 bg-muted/30 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Label className="text-base font-semibold block">
                            {group.name}
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            {group.is_required ? (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Optional</span>
                            )}
                            {group.max_selections > 0 && (
                              <span className="text-xs text-muted-foreground">
                                • {group.max_selections === 1 ? 'Choose 1' : `Max ${group.max_selections}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {group.instructions && (
                        <p className="text-sm text-muted-foreground -mt-1">{group.instructions}</p>
                      )}
                      
                      {group.max_selections === 1 ? (
                        <RadioGroup
                          value={groupSelected[0]?.toString() || ''}
                          onValueChange={(value) => {
                            const modifierId = parseInt(value);
                            const oldSelection = groupSelected[0];
                            if (oldSelection) {
                              handleModifierToggle(group, oldSelection, false);
                            }
                            handleModifierToggle(group, modifierId, true);
                          }}
                        >
                          {group.modifiers.map((modifier) => {
                            const price = getModifierPrice(modifier);
                            return (
                              <div key={modifier.id} className="flex items-center space-x-2 mb-2">
                                <RadioGroupItem
                                  value={modifier.id.toString()}
                                  id={`modifier-${modifier.id}`}
                                  data-testid={`radio-modifier-${modifier.id}`}
                                />
                                <Label htmlFor={`modifier-${modifier.id}`} className="flex-1 cursor-pointer">
                                  <div className="flex items-center justify-between">
                                    <span>{modifier.name}</span>
                                    {price > 0 && (
                                      <span className="text-sm text-muted-foreground">
                                        +${Number(price).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      ) : (
                        <div className="space-y-3">
                          {group.modifiers.map((modifier) => {
                            const price = getModifierPrice(modifier);
                            const currentQty = modifierQuantities[modifier.id] || 0;
                            
                            // Calculate total quantity in group for max_selections check
                            const totalInGroup = Object.entries(modifierQuantities)
                              .filter(([id]) => group.modifiers.some(m => m.id === parseInt(id)))
                              .reduce((sum, [, qty]) => sum + qty, 0);
                            const isMaxReached = group.max_selections > 0 && totalInGroup >= group.max_selections;

                            return (
                              <div key={modifier.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span>{modifier.name}</span>
                                  {price > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                      +${Number(price).toFixed(2)} each
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                    onClick={() => handleModifierQuantityChange(group, modifier, -1)}
                                    disabled={currentQty === 0}
                                    data-testid={`button-modifier-decrease-${modifier.id}`}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-6 text-center font-medium" data-testid={`text-modifier-qty-${modifier.id}`}>
                                    {currentQty}
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                    onClick={() => handleModifierQuantityChange(group, modifier, 1)}
                                    disabled={isMaxReached && currentQty === 0}
                                    data-testid={`button-modifier-increase-${modifier.id}`}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  {currentQty > 1 && price > 0 && (
                                    <span className="text-sm font-medium text-muted-foreground ml-1">
                                      = +${(price * currentQty).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
          
          <div>
            <Label htmlFor="special-instructions" className="text-base font-semibold mb-3 block">
              Special Instructions (Optional)
            </Label>
            <Textarea
              id="special-instructions"
              placeholder="e.g., No onions, extra sauce..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
              data-testid="input-special-instructions"
            />
          </div>
          
          {/* Required modifiers message */}
          {!isLoadingModifiers && missingRequirements.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium" data-testid="text-required-selections">
                Please select: {missingRequirements.slice(0, 3).join(', ')}
                {missingRequirements.length > 3 && ` (+${missingRequirements.length - 3} more)`}
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <Label className="font-semibold">Quantity:</Label>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  data-testid="button-decrease-quantity"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                
                <span className="w-12 text-center font-semibold text-lg" data-testid="text-quantity">
                  {quantity}
                </span>
                
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setQuantity(quantity + 1)}
                  data-testid="button-increase-quantity"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={!canAddToCart}
              className={`w-full sm:w-auto px-8 ${getButtonClassName(false)}`}
              data-testid="button-add-to-cart"
            >
              {isLoadingModifiers ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Loading options...
                </>
              ) : (
                `Add to Cart - $${Number(itemTotal).toFixed(2)}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
