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
  
  const addItem = useCartStore((state) => state.addItem);
  
  useEffect(() => {
    if (isOpen && dish.id) {
      setIsLoadingModifiers(true);
      
      Promise.all([
        fetch(`/api/customer/dishes/${dish.id}/modifiers`).then(res => res.json()),
        fetch(`/api/customer/dishes/${dish.id}/combo-modifiers`).then(res => res.json())
      ])
        .then(([modifiersData, comboData]) => {
          setModifierGroups(modifiersData || []);
          setComboGroups(Array.isArray(comboData) ? comboData : []);
          setIsLoadingModifiers(false);
        })
        .catch(err => {
          console.error('Error loading modifiers:', err);
          setIsLoadingModifiers(false);
        });
    }
  }, [isOpen, dish.id]);
  
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

  // Helper to recalculate prices for all modifiers in a section based on free_items
  const recalculateSectionPrices = (
    sectionKey: string,
    newSelections: number[],
    section: ComboGroupSection,
    modifierGroup: ComboModifierGroup
  ) => {
    const freeItems = section.free_items || 0;
    
    // Update prices for all modifiers in this section based on their position
    setSelectedModifiers(prev => {
      const updatedModifiers = [...prev];
      
      newSelections.forEach((modId, index) => {
        const modifierIndex = updatedModifiers.findIndex(m => m.id === modId);
        if (modifierIndex !== -1) {
          const originalModifier = modifierGroup.modifiers.find(m => m.id === modId);
          if (originalModifier) {
            const fullPrice = getComboModifierPrice(originalModifier);
            // Free if within free_items limit, otherwise full price
            const effectivePrice = index < freeItems ? 0 : fullPrice;
            updatedModifiers[modifierIndex] = {
              ...updatedModifiers[modifierIndex],
              price: effectivePrice,
            };
          }
        }
      });
      
      return updatedModifiers;
    });
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
      // Calculate effective price based on position in selection order
      const positionInSelection = newSelections.indexOf(modifier.id);
      const effectivePrice = positionInSelection < freeItems ? 0 : fullPrice;
      
      if (modifier.placements && modifier.placements.length > 0) {
        setModifierPlacements(prev => ({ ...prev, [modifier.id]: defaultPlacement }));
      }
      setSelectedModifiers(prev => [...prev, {
        id: modifier.id,
        name: modifier.name,
        price: effectivePrice,
        placement: modifier.placements && modifier.placements.length > 0 ? defaultPlacement : undefined,
      }]);
    } else {
      // Remove the modifier
      setSelectedModifiers(prev => prev.filter(m => m.id !== modifier.id));
      const newPlacements = { ...modifierPlacements };
      delete newPlacements[modifier.id];
      setModifierPlacements(newPlacements);
      
      // Recalculate prices for remaining items (they may shift into free slots)
      if (freeItems > 0 && newSelections.length > 0) {
        setTimeout(() => recalculateSectionPrices(sectionKey, newSelections, section, modifierGroup), 0);
      }
    }
  };

  const handlePlacementChange = (modifierId: number, placement: PlacementType) => {
    setModifierPlacements(prev => ({ ...prev, [modifierId]: placement }));
    setSelectedModifiers(prev => prev.map(m => 
      m.id === modifierId ? { ...m, placement } : m
    ));
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
  
  const itemTotal = (sizePrice + selectedModifiers.reduce((sum, m) => sum + m.price, 0)) * quantity;

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
                      <div className="space-y-2">
                        {group.modifiers.map((modifier) => {
                          const price = getModifierPrice(modifier);
                          const isSelected = groupSelected.includes(modifier.id);
                          const isDisabled = !isSelected && isMaxSelections;
                          const showPlacements = isSimpleModifierToppingGroup(group);
                          
                          return (
                            <div key={modifier.id}>
                              <div className="flex items-start space-x-3">
                                <Checkbox
                                  id={`modifier-${modifier.id}`}
                                  checked={isSelected}
                                  disabled={isDisabled}
                                  onCheckedChange={(checked) => handleModifierToggle(group, modifier.id, checked as boolean)}
                                  data-testid={`checkbox-modifier-${modifier.id}`}
                                />
                                <Label 
                                  htmlFor={`modifier-${modifier.id}`} 
                                  className={`flex-1 cursor-pointer font-normal ${isDisabled ? 'opacity-50' : ''}`}
                                >
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
                              {isSelected && showPlacements && (
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
                    {/* Repeat sections based on number_of_items */}
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
                                    <div className="space-y-2">
                                      {modifierGroup.modifiers.map((modifier) => {
                                        const fullPrice = getComboModifierPrice(modifier);
                                        const isSelected = isComboModifierSelected(section.id, modifierGroup.id, modifier.id, instanceIndex);
                                        const isDisabled = !isSelected && isMaxSelections;
                                        const selectionIndex = currentSelections.indexOf(modifier.id);
                                        const freeItems = section.free_items || 0;
                                        const isFreeSlot = isSelected && selectionIndex < freeItems;
                                        // Use database placements if available, otherwise auto-enable for pizza toppings
                                        const hasPlacements = (modifier.placements && modifier.placements.length > 0) || showPizzaPlacements;
                                        const placements = (modifier.placements && modifier.placements.length > 0) ? modifier.placements : (showPizzaPlacements ? defaultPlacements : []);
                                        const modifierKey = `${modifier.id}-${instanceIndex}`;
                                        
                                        return (
                                          <div key={modifierKey}>
                                            <div className="flex items-start space-x-3">
                                              <Checkbox
                                                id={`combo-modifier-${modifierKey}`}
                                                checked={isSelected}
                                                disabled={isDisabled}
                                                onCheckedChange={(checked) => 
                                                  handleComboModifierToggle(section, modifierGroup, modifier, checked as boolean, instanceIndex, contextualLabels[instanceIndex])
                                                }
                                                data-testid={`checkbox-combo-modifier-${modifierKey}`}
                                              />
                                              <Label 
                                                htmlFor={`combo-modifier-${modifierKey}`} 
                                                className={`flex-1 cursor-pointer font-normal ${isDisabled ? 'opacity-50' : ''}`}
                                              >
                                                <div className="flex items-center justify-between">
                                                  <span>{modifier.name}</span>
                                                  <span className="text-sm">
                                                    {isFreeSlot ? (
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
                        <div className="space-y-2">
                          {group.modifiers.map((modifier) => {
                            const price = getModifierPrice(modifier);
                            const isSelected = (groupSelections[group.id] || []).includes(modifier.id);
                            const isDisabled = !isSelected && isMaxSelections;

                            return (
                              <div key={modifier.id} className="flex items-start space-x-3">
                                <Checkbox
                                  id={`modifier-${modifier.id}`}
                                  checked={isSelected}
                                  disabled={isDisabled}
                                  onCheckedChange={(checked) => handleModifierToggle(group, modifier.id, checked as boolean)}
                                  data-testid={`checkbox-modifier-${modifier.id}`}
                                />
                                <Label 
                                  htmlFor={`modifier-${modifier.id}`} 
                                  className={`flex-1 cursor-pointer font-normal ${isDisabled ? 'opacity-50' : ''}`}
                                >
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
              className={`w-full sm:w-auto px-8 ${getButtonClassName(false)}`}
              data-testid="button-add-to-cart"
            >
              Add to Cart - ${Number(itemTotal).toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
