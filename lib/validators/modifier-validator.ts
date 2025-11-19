// Modifier validation logic for complex dish customization
// Based on MODIFIER_VALIDATION_SPEC.md

export interface DishModifierGroup {
  id: number;
  name: string;
  displayOrder: number;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  modifiers: DishModifier[];
}

export interface DishModifier {
  id: number;
  modifierGroupId: number;
  name: string;
  price: number; // In cents
  isDefault: boolean;
  displayOrder: number;
}

export interface DishWithModifiers {
  id: number;
  name: string;
  basePrice: number; // In cents
  modifierGroups: DishModifierGroup[];
}

export interface SelectedModifier {
  groupId: number;
  groupName: string;
  modifierId: number;
  modifierName: string;
  price: number;
}

export interface ModifierValidationError {
  groupId: number;
  groupName: string;
  message: string;
  type: 'required' | 'min_selections' | 'max_selections';
}

export interface ModifierValidationResult {
  isValid: boolean;
  errors: ModifierValidationError[];
  totalModifierPrice: number;
}

/**
 * Validates modifier selections against dish modifier group rules
 * 
 * @param dish - The dish with its modifier groups
 * @param selectedModifiers - The user's selected modifiers
 * @returns Validation result with errors and total price
 */
export function validateModifierSelections(
  dish: DishWithModifiers,
  selectedModifiers: SelectedModifier[]
): ModifierValidationResult {
  const errors: ModifierValidationError[] = [];
  let totalModifierPrice = 0;

  // Group selected modifiers by group ID
  const selectionsByGroup = new Map<number, SelectedModifier[]>();
  selectedModifiers.forEach((mod) => {
    if (!selectionsByGroup.has(mod.groupId)) {
      selectionsByGroup.set(mod.groupId, []);
    }
    selectionsByGroup.get(mod.groupId)!.push(mod);
    totalModifierPrice += mod.price;
  });

  // Validate each modifier group
  dish.modifierGroups.forEach((group) => {
    const selections = selectionsByGroup.get(group.id) || [];
    const selectionCount = selections.length;

    // Check required groups
    if (group.isRequired && selectionCount === 0) {
      errors.push({
        groupId: group.id,
        groupName: group.name,
        message: `Please select a ${group.name.toLowerCase()}`,
        type: 'required'
      });
    }

    // Check minimum selections
    if (selectionCount < group.minSelections) {
      errors.push({
        groupId: group.id,
        groupName: group.name,
        message: `Select at least ${group.minSelections} ${group.name.toLowerCase()}`,
        type: 'min_selections'
      });
    }

    // Check maximum selections
    if (selectionCount > group.maxSelections) {
      errors.push({
        groupId: group.id,
        groupName: group.name,
        message: `Select at most ${group.maxSelections} ${group.name.toLowerCase()}`,
        type: 'max_selections'
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    totalModifierPrice
  };
}

/**
 * Calculate final dish price including modifiers
 * 
 * @param dish - The dish
 * @param size - Selected size modifier (if applicable)
 * @param selectedModifiers - Selected modifiers
 * @param quantity - Quantity
 * @returns Final price in cents
 */
export function calculateDishPrice(
  dish: DishWithModifiers,
  size: DishModifier | null,
  selectedModifiers: SelectedModifier[],
  quantity: number
): number {
  // Base price (or size price if size selected)
  let basePrice = dish.basePrice;
  
  // If size is selected, replace base price
  if (size) {
    const sizeGroup = dish.modifierGroups.find(g => g.id === size.modifierGroupId);
    if (sizeGroup && sizeGroup.name.toLowerCase().includes('size')) {
      basePrice = dish.basePrice + size.price;
    }
  }

  // Add modifier prices
  const modifierPrice = selectedModifiers.reduce((sum, mod) => sum + mod.price, 0);

  // Total = (base + modifiers) * quantity
  const total = (basePrice + modifierPrice) * quantity;

  return total;
}
