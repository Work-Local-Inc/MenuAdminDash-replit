import { 
  validateModifierSelections, 
  calculateDishPrice,
  DishWithModifiers,
  SelectedModifier,
  DishModifier
} from '@/lib/validators/modifier-validator';

describe('validateModifierSelections', () => {
  // Mock pizza with required size selection
  const pizzaWithRequiredSize: DishWithModifiers = {
    id: 1,
    name: 'Margherita Pizza',
    basePrice: 1200, // $12.00 for small
    modifierGroups: [
      {
        id: 1,
        name: 'Size',
        displayOrder: 1,
        isRequired: true,
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

  // Mock burger with optional toppings (max 3)
  const burgerWith3MaxToppings: DishWithModifiers = {
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
        maxSelections: 3,
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

  describe('required groups validation', () => {
    it('should fail when required group has no selection', () => {
      const result = validateModifierSelections(pizzaWithRequiredSize, []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.type === 'required')).toBe(true);
      expect(result.errors.some(e => e.message.toLowerCase().includes('select'))).toBe(true);
    });

    it('should pass when required group has valid selection', () => {
      const selections: SelectedModifier[] = [
        { groupId: 1, groupName: 'Size', modifierId: 2, modifierName: 'Medium (12")', price: 300 }
      ];

      const result = validateModifierSelections(pizzaWithRequiredSize, selections);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalModifierPrice).toBe(300);
    });
  });

  describe('max selections validation', () => {
    it('should fail when selections exceed maximum', () => {
      const tooManyToppings: SelectedModifier[] = [
        { groupId: 2, groupName: 'Toppings', modifierId: 4, modifierName: 'Lettuce', price: 0 },
        { groupId: 2, groupName: 'Toppings', modifierId: 5, modifierName: 'Tomato', price: 0 },
        { groupId: 2, groupName: 'Toppings', modifierId: 7, modifierName: 'Cheese', price: 150 },
        { groupId: 2, groupName: 'Toppings', modifierId: 8, modifierName: 'Bacon', price: 200 }
      ];

      const result = validateModifierSelections(burgerWith3MaxToppings, tooManyToppings);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('max_selections');
      expect(result.errors[0].message).toContain('at most 3');
    });

    it('should pass when selections are within maximum', () => {
      const validToppings: SelectedModifier[] = [
        { groupId: 2, groupName: 'Toppings', modifierId: 4, modifierName: 'Lettuce', price: 0 },
        { groupId: 2, groupName: 'Toppings', modifierId: 7, modifierName: 'Cheese', price: 150 },
        { groupId: 2, groupName: 'Toppings', modifierId: 8, modifierName: 'Bacon', price: 200 }
      ];

      const result = validateModifierSelections(burgerWith3MaxToppings, validToppings);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalModifierPrice).toBe(350);
    });
  });

  describe('modifier price calculation', () => {
    it('should calculate total modifier price correctly', () => {
      const selections: SelectedModifier[] = [
        { groupId: 2, groupName: 'Toppings', modifierId: 7, modifierName: 'Cheese', price: 150 },
        { groupId: 2, groupName: 'Toppings', modifierId: 8, modifierName: 'Bacon', price: 200 }
      ];

      const result = validateModifierSelections(burgerWith3MaxToppings, selections);
      
      expect(result.totalModifierPrice).toBe(350);
    });

    it('should handle zero-price modifiers', () => {
      const selections: SelectedModifier[] = [
        { groupId: 2, groupName: 'Toppings', modifierId: 4, modifierName: 'Lettuce', price: 0 },
        { groupId: 2, groupName: 'Toppings', modifierId: 5, modifierName: 'Tomato', price: 0 }
      ];

      const result = validateModifierSelections(burgerWith3MaxToppings, selections);
      
      expect(result.totalModifierPrice).toBe(0);
    });
  });
});

describe('calculateDishPrice', () => {
  const pizza: DishWithModifiers = {
    id: 1,
    name: 'Margherita',
    basePrice: 1200, // $12.00 for small
    modifierGroups: [
      {
        id: 1,
        name: 'Size',
        displayOrder: 1,
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        modifiers: [
          { id: 1, modifierGroupId: 1, name: 'Small (10")', price: 0, isDefault: true, displayOrder: 1 },
          { id: 2, modifierGroupId: 1, name: 'Medium (12")', price: 300, isDefault: false, displayOrder: 2 }
        ]
      },
      {
        id: 2,
        name: 'Toppings',
        displayOrder: 2,
        isRequired: false,
        minSelections: 0,
        maxSelections: 5,
        modifiers: []
      }
    ]
  };

  it('should calculate price with base price and no modifiers', () => {
    const price = calculateDishPrice(pizza, null, [], 1);
    expect(price).toBe(1200); // $12.00
  });

  it('should calculate price with size modifier', () => {
    const sizeModifier: DishModifier = {
      id: 2,
      modifierGroupId: 1,
      name: 'Medium (12")',
      price: 300,
      isDefault: false,
      displayOrder: 2
    };

    const price = calculateDishPrice(pizza, sizeModifier, [], 1);
    expect(price).toBe(1500); // $12.00 + $3.00 = $15.00
  });

  it('should calculate price with size and additional modifiers', () => {
    const sizeModifier: DishModifier = {
      id: 2,
      modifierGroupId: 1,
      name: 'Medium (12")',
      price: 300,
      isDefault: false,
      displayOrder: 2
    };

    const selectedModifiers: SelectedModifier[] = [
      { groupId: 2, groupName: 'Toppings', modifierId: 7, modifierName: 'Extra Cheese', price: 150 },
      { groupId: 2, groupName: 'Toppings', modifierId: 8, modifierName: 'Pepperoni', price: 200 }
    ];

    const price = calculateDishPrice(pizza, sizeModifier, selectedModifiers, 1);
    // (1200 + 300) + (150 + 200) = 1850
    expect(price).toBe(1850); // $18.50
  });

  it('should multiply by quantity correctly', () => {
    const sizeModifier: DishModifier = {
      id: 2,
      modifierGroupId: 1,
      name: 'Medium (12")',
      price: 300,
      isDefault: false,
      displayOrder: 2
    };

    const selectedModifiers: SelectedModifier[] = [
      { groupId: 2, groupName: 'Toppings', modifierId: 7, modifierName: 'Extra Cheese', price: 150 },
      { groupId: 2, groupName: 'Toppings', modifierId: 8, modifierName: 'Pepperoni', price: 200 }
    ];

    const price = calculateDishPrice(pizza, sizeModifier, selectedModifiers, 2);
    // ((1200 + 300) + (150 + 200)) * 2 = 1850 * 2 = 3700
    expect(price).toBe(3700); // $37.00
  });
});
