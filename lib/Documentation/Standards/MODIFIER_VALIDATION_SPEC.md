# Modifier Validation Specification - Menu.ca V3

**Purpose:** Handle complex dish modifiers with required groups, min/max selections, and conditional pricing

**Last Updated:** October 22, 2025

---

## The Problem

Simple modifiers are easy:
- ☑️ Add extra cheese (+$2.00)
- ☑️ No onions

But real restaurant menus have complex requirements:
- ✅ **Required**: "Pick a size" (Small, Medium, Large) - customer MUST choose
- ✅ **Min/Max**: "Pick up to 3 toppings" - can't pick 0 or 4
- ✅ **Nested**: "If burrito, then pick a rice" - conditional modifiers
- ✅ **Pricing**: Some modifiers are free, some cost extra

**This spec defines how to validate these complex scenarios.**

---

## Data Model

### Database Schema (Already Exists)

```sql
-- Existing tables from menuca_v3 schema

-- Main modifier groups table
CREATE TABLE menuca_v3.dish_modifier_groups (
  id BIGSERIAL PRIMARY KEY,
  dish_id BIGINT REFERENCES menuca_v3.dishes(id),
  name VARCHAR(255), -- "Choose Size", "Pick Toppings", etc.
  display_order INTEGER,
  is_required BOOLEAN DEFAULT FALSE,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ
);

-- Individual modifiers within groups
CREATE TABLE menuca_v3.dish_modifiers (
  id BIGSERIAL PRIMARY KEY,
  modifier_group_id BIGINT REFERENCES menuca_v3.dish_modifier_groups(id),
  name VARCHAR(255), -- "Large", "Extra Cheese", etc.
  price NUMERIC(10, 2) DEFAULT 0, -- Price adjustment (can be 0 for free)
  is_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER,
  created_at TIMESTAMPTZ
);
```

---

## TypeScript Interfaces

### Frontend Types

```typescript
// types/menu.ts

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
  price: number; // In cents (1299 = $12.99)
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

export interface ModifierValidationResult {
  isValid: boolean;
  errors: ModifierValidationError[];
  totalModifierPrice: number;
}

export interface ModifierValidationError {
  groupId: number;
  groupName: string;
  message: string;
  type: 'required' | 'min_selections' | 'max_selections';
}
```

---

## Validation Logic

### Client-Side Validation Function

```typescript
// lib/validators/modifier-validator.ts

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
```

---

## Validation Examples

### Example 1: Required Size Selection

```typescript
// Pizza with required size selection
const pizza: DishWithModifiers = {
  id: 1,
  name: 'Margherita Pizza',
  basePrice: 1200, // $12.00 (for small)
  modifierGroups: [
    {
      id: 1,
      name: 'Size',
      displayOrder: 1,
      isRequired: true, // ✅ MUST choose
      minSelections: 1,
      maxSelections: 1,
      modifiers: [
        { id: 1, modifierGroupId: 1, name: 'Small (10")', price: 0, isDefault: true, displayOrder: 1 },
        { id: 2, modifierGroupId: 1, name: 'Medium (12")', price: 300, isDefault: false, displayOrder: 2 },
        { id: 3, modifierGroupId: 1, name: 'Large (14")', price: 500, isDefault: false, displayOrder: 3 }
      ]
    }
  ]
};

// ❌ No selection - INVALID
validateModifierSelections(pizza, []);
// Result: { isValid: false, errors: [{ message: 'Please select a size' }] }

// ✅ Valid selection
validateModifierSelections(pizza, [
  { groupId: 1, groupName: 'Size', modifierId: 2, modifierName: 'Medium (12")', price: 300 }
]);
// Result: { isValid: true, errors: [], totalModifierPrice: 300 }
```

---

### Example 2: Multi-Select with Limits

```typescript
// Burger with toppings (pick 3 max)
const burger: DishWithModifiers = {
  id: 2,
  name: 'Custom Burger',
  basePrice: 899, // $8.99
  modifierGroups: [
    {
      id: 2,
      name: 'Toppings',
      displayOrder: 1,
      isRequired: false,
      minSelections: 0,
      maxSelections: 3, // ✅ Can pick 0-3
      modifiers: [
        { id: 4, modifierGroupId: 2, name: 'Lettuce', price: 0, isDefault: false, displayOrder: 1 },
        { id: 5, modifierGroupId: 2, name: 'Tomato', price: 0, isDefault: false, displayOrder: 2 },
        { id: 6, modifierGroupId: 2, name: 'Onion', price: 0, isDefault: false, displayOrder: 3 },
        { id: 7, modifierGroupId: 2, name: 'Cheese', price: 150, isDefault: false, displayOrder: 4 },
        { id: 8, modifierGroupId: 2, name: 'Bacon', price: 200, isDefault: false, displayOrder: 5 }
      ]
    }
  ]
};

// ❌ Too many selections (4 > 3) - INVALID
validateModifierSelections(burger, [
  { groupId: 2, groupName: 'Toppings', modifierId: 4, modifierName: 'Lettuce', price: 0 },
  { groupId: 2, groupName: 'Toppings', modifierId: 5, modifierName: 'Tomato', price: 0 },
  { groupId: 2, groupName: 'Toppings', modifierId: 7, modifierName: 'Cheese', price: 150 },
  { groupId: 2, groupName: 'Toppings', modifierId: 8, modifierName: 'Bacon', price: 200 }
]);
// Result: { isValid: false, errors: [{ message: 'Select at most 3 toppings' }] }

// ✅ Valid selection (3 toppings)
validateModifierSelections(burger, [
  { groupId: 2, groupName: 'Toppings', modifierId: 4, modifierName: 'Lettuce', price: 0 },
  { groupId: 2, groupName: 'Toppings', modifierId: 7, modifierName: 'Cheese', price: 150 },
  { groupId: 2, groupName: 'Toppings', modifierId: 8, modifierName: 'Bacon', price: 200 }
]);
// Result: { isValid: true, errors: [], totalModifierPrice: 350 }
```

---

### Example 3: Multiple Required Groups

```typescript
// Burrito with required protein AND rice
const burrito: DishWithModifiers = {
  id: 3,
  name: 'Custom Burrito',
  basePrice: 1099, // $10.99
  modifierGroups: [
    {
      id: 3,
      name: 'Protein',
      displayOrder: 1,
      isRequired: true, // ✅ MUST choose
      minSelections: 1,
      maxSelections: 1,
      modifiers: [
        { id: 9, modifierGroupId: 3, name: 'Chicken', price: 0, isDefault: true, displayOrder: 1 },
        { id: 10, modifierGroupId: 3, name: 'Steak', price: 200, isDefault: false, displayOrder: 2 },
        { id: 11, modifierGroupId: 3, name: 'Carnitas', price: 200, isDefault: false, displayOrder: 3 }
      ]
    },
    {
      id: 4,
      name: 'Rice',
      displayOrder: 2,
      isRequired: true, // ✅ MUST choose
      minSelections: 1,
      maxSelections: 1,
      modifiers: [
        { id: 12, modifierGroupId: 4, name: 'White Rice', price: 0, isDefault: true, displayOrder: 1 },
        { id: 13, modifierGroupId: 4, name: 'Brown Rice', price: 0, isDefault: false, displayOrder: 2 }
      ]
    }
  ]
};

// ❌ Missing rice selection - INVALID
validateModifierSelections(burrito, [
  { groupId: 3, groupName: 'Protein', modifierId: 9, modifierName: 'Chicken', price: 0 }
]);
// Result: { isValid: false, errors: [{ message: 'Please select a rice' }] }

// ✅ Valid - both required groups selected
validateModifierSelections(burrito, [
  { groupId: 3, groupName: 'Protein', modifierId: 10, modifierName: 'Steak', price: 200 },
  { groupId: 4, groupName: 'Rice', modifierId: 13, modifierName: 'Brown Rice', price: 0 }
]);
// Result: { isValid: true, errors: [], totalModifierPrice: 200 }
```

---

## Price Calculation

### Calculate Final Dish Price

```typescript
// lib/utils/price-calculator.ts

export function calculateDishPrice(
  dish: DishWithModifiers,
  size: DishModifier | null,
  selectedModifiers: SelectedModifier[],
  quantity: number
): number {
  // Base price (or size price if size selected)
  let basePrice = dish.basePrice;
  
  // If size is selected and it's a size modifier, replace base price
  if (size && size.modifierGroupId) {
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
```

### Example Calculation

```typescript
const pizza = {
  id: 1,
  name: 'Margherita',
  basePrice: 1200, // $12.00 (small)
  modifierGroups: [...]
};

const selectedSize = {
  id: 2,
  modifierGroupId: 1,
  name: 'Medium (12")',
  price: 300, // +$3.00
  isDefault: false,
  displayOrder: 2
};

const selectedModifiers = [
  { groupId: 2, groupName: 'Toppings', modifierId: 7, modifierName: 'Extra Cheese', price: 150 },
  { groupId: 2, groupName: 'Toppings', modifierId: 8, modifierName: 'Pepperoni', price: 200 }
];

const finalPrice = calculateDishPrice(pizza, selectedSize, selectedModifiers, 2);
// Calculation: ((1200 + 300) + (150 + 200)) * 2 = 1850 * 2 = 3700 cents = $37.00
```

---

## UI Patterns

### Modifier Group Display

```typescript
// components/menu/modifier-group.tsx

export function ModifierGroup({ 
  group, 
  selectedModifiers,
  onModifierToggle 
}: ModifierGroupProps) {
  const selections = selectedModifiers.filter(m => m.groupId === group.id);
  const canSelectMore = selections.length < group.maxSelections;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {group.name}
          {group.isRequired && <span className="text-red-500 ml-1">*</span>}
        </h3>
        <span className="text-sm text-muted-foreground">
          {group.minSelections === group.maxSelections
            ? `Choose ${group.maxSelections}`
            : `Choose ${group.minSelections}-${group.maxSelections}`}
        </span>
      </div>

      <div className="space-y-2">
        {group.modifiers.map((modifier) => {
          const isSelected = selections.some(s => s.modifierId === modifier.id);
          const canToggle = isSelected || canSelectMore;

          return (
            <label
              key={modifier.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border cursor-pointer',
                isSelected && 'bg-primary/10 border-primary',
                !canToggle && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-3">
                {group.maxSelections === 1 ? (
                  <input
                    type="radio"
                    name={`group-${group.id}`}
                    checked={isSelected}
                    onChange={() => onModifierToggle(group, modifier)}
                    disabled={!canToggle && !isSelected}
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onModifierToggle(group, modifier)}
                    disabled={!canToggle && !isSelected}
                  />
                )}
                <span>{modifier.name}</span>
              </div>
              {modifier.price > 0 && (
                <span className="text-sm text-muted-foreground">
                  +${(modifier.price / 100).toFixed(2)}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Server-Side Validation

### API Route Validation

```typescript
// app/api/customer/orders/route.ts

export async function POST(request: Request) {
  const { items } = await request.json();

  // Validate each item's modifiers server-side
  for (const item of items) {
    // Fetch dish with modifier groups from database
    const dish = await fetchDishWithModifiers(item.dishId);

    // Validate modifiers
    const validation = validateModifierSelections(dish, item.selectedModifiers);

    if (!validation.isValid) {
      return Response.json(
        { 
          error: 'Invalid modifier selection',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // Recalculate price server-side (NEVER trust client!)
    const serverCalculatedPrice = calculateDishPrice(
      dish,
      item.size,
      item.selectedModifiers,
      item.quantity
    );

    if (serverCalculatedPrice !== item.subtotal) {
      return Response.json(
        { error: 'Price mismatch detected' },
        { status: 400 }
      );
    }
  }

  // Proceed with order creation...
}
```

---

## Testing

### Unit Tests

```typescript
// __tests__/modifier-validator.test.ts

describe('validateModifierSelections', () => {
  it('requires selection for required groups', () => {
    const result = validateModifierSelections(pizzaWithRequiredSize, []);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].type).toBe('required');
  });

  it('enforces max selections', () => {
    const tooManyToppings = [
      { groupId: 1, modifierId: 1, price: 0 },
      { groupId: 1, modifierId: 2, price: 0 },
      { groupId: 1, modifierId: 3, price: 0 },
      { groupId: 1, modifierId: 4, price: 0 } // 4 > max of 3
    ];

    const result = validateModifierSelections(burgerWith3MaxToppings, tooManyToppings);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].type).toBe('max_selections');
  });

  it('calculates total modifier price correctly', () => {
    const selections = [
      { groupId: 1, modifierId: 1, price: 150 },
      { groupId: 1, modifierId: 2, price: 200 }
    ];

    const result = validateModifierSelections(burger, selections);
    expect(result.totalModifierPrice).toBe(350);
  });
});
```

---

## Summary

### Validation Rules
1. **Required groups**: Customer MUST select from these groups
2. **Min selections**: Enforce minimum number of selections per group
3. **Max selections**: Enforce maximum number of selections per group
4. **Price calculation**: Always recalculate server-side

### Implementation Checklist
- [ ] Client-side validation before adding to cart
- [ ] Show clear error messages for validation failures
- [ ] Disable "Add to Cart" button until valid
- [ ] Server-side validation in order creation API
- [ ] Server-side price recalculation (security!)
- [ ] Unit tests for all validation scenarios

---

**Questions?** See examples in:
- `lib/validators/modifier-validator.ts`
- `components/menu/dish-modal.tsx`
- `app/api/customer/orders/route.ts`
