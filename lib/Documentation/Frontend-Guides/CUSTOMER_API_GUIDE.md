# Customer-Facing API Guide - Menu.ca Frontend Integration

**Target Audience**: Frontend Developers  
**Last Updated**: October 31, 2025  
**Purpose**: Complete API reference for building the customer ordering experience

---

## 📖 Table of Contents

1. [Customer Journey Overview](#customer-journey-overview)
2. [Authentication](#authentication)
3. [API Endpoints by Feature](#api-endpoints-by-feature)
4. [Complete User Flow Examples](#complete-user-flow-examples)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## 🗺️ Customer Journey Overview

The customer experience follows this flow:

```
1. Splash Page (Chatbot)
   ↓ User: "something spicy and healthy"
   
2. Restaurant Discovery
   ↓ AI matches preferences → Shows matching restaurants
   
3. Restaurant Selection
   ↓ Click restaurant → View details
   
4. Menu Browsing
   ↓ Browse courses & dishes
   
5. Dish Customization
   ↓ Add modifiers, select size
   
6. Cart Management
   ↓ Add to cart, validate
   
7. Checkout & Payment
   ↓ Address, payment method
   
8. Order Confirmation
   ✓ Order placed!
```

---

## 🔐 Authentication

### Overview
- **Admin endpoints**: Require authentication (header: `Authorization: Bearer <token>`)
- **Customer endpoints**: Public or optional user auth
- **Path prefix**: Customer APIs use `/api/customer/*` (no auth required)

### Customer Auth (Optional)
If you want to track user favorites/addresses:
```typescript
// Optional: Track authenticated users
const { data: { user } } = await supabase.auth.getUser();
```

---

## 🚀 API Endpoints by Feature

### 1. Restaurant Discovery (Chatbot → Matching)

#### Get All Cuisines (for AI matching)
**Endpoint**: `GET /api/cuisines`  
**Auth**: Required (admin)  
**Purpose**: Get all cuisine types for chatbot AI matching

**Response**:
```json
[
  {
    "id": 1,
    "name": "Italian",
    "slug": "italian",
    "description": "Pizza, pasta, Italian classics",
    "display_order": 1
  },
  {
    "id": 5,
    "name": "Indian",
    "slug": "indian",
    "description": "Spicy curries, tandoori, biryani",
    "display_order": 5
  }
]
```

**Usage**:
```typescript
// Chatbot matches "spicy and healthy" → ["indian", "thai", "mediterranean"]
const cuisineSlugs = await aiMatchPreferences(userInput);
```

---

#### Get All Tags (for preference matching)
**Endpoint**: `GET /api/tags`  
**Auth**: Required (admin)  
**Purpose**: Get all restaurant tags (e.g., "healthy", "vegetarian", "spicy")

**Response**:
```json
[
  {
    "id": 3,
    "name": "Healthy Options",
    "slug": "healthy",
    "category": "dietary",
    "display_order": 3
  },
  {
    "id": 7,
    "name": "Spicy",
    "slug": "spicy",
    "category": "flavor",
    "display_order": 7
  }
]
```

**Available Categories**:
- `dietary`: Vegan, Vegetarian, Gluten-Free, Healthy Options
- `flavor`: Spicy, Sweet, Savory, Comfort Food
- `service`: Fast Delivery, Late Night, Catering
- `special`: Family Friendly, Romantic, Outdoor Seating

---

#### Search Restaurants (Filtered)
**Endpoint**: `GET /api/restaurants`  
**Auth**: Required (admin)  
**Query Params**:
- `search`: Text search (name, keywords)
- `province`: Filter by province
- `city`: Filter by city
- `status`: Filter by status (`active`, `suspended`, etc.)

**Example Request**:
```typescript
// After AI matches preferences to tags/cuisines
const response = await fetch('/api/restaurants?search=healthy&city=Toronto&status=active');
const restaurants = await response.json();
```

**Response**:
```json
[
  {
    "id": 123,
    "name": "Spice Garden",
    "slug": "spice-garden-123",
    "status": "active",
    "cuisines": ["indian", "healthy"],
    "tags": ["spicy", "healthy", "vegetarian-options"],
    "locations": [
      {
        "id": 456,
        "street_address": "123 Main St",
        "city": "Toronto",
        "postal_code": "M5H 2N2"
      }
    ]
  }
]
```

---

### 2. Restaurant Details

#### Get Restaurant by Slug
**Endpoint**: `GET /api/customer/restaurants/[slug]`  
**Auth**: None (public)  
**Purpose**: Get complete restaurant details before showing menu

**Example Request**:
```typescript
const slug = 'spice-garden-123'; // From restaurant list
const response = await fetch(`/api/customer/restaurants/${slug}`);
const restaurant = await response.json();
```

**Response**:
```json
{
  "id": 123,
  "name": "Spice Garden",
  "status": "active",
  "restaurant_locations": [
    {
      "id": 456,
      "street_address": "123 Main St",
      "city_id": 789,
      "postal_code": "M5H 2N2",
      "phone": "416-555-0123",
      "email": "info@spicegarden.ca",
      "is_primary": true
    }
  ],
  "restaurant_schedules": [
    {
      "id": 111,
      "type": "regular",
      "day_start": 1,
      "day_stop": 5,
      "time_start": "11:00",
      "time_stop": "22:00",
      "is_enabled": true
    }
  ],
  "restaurant_service_configs": [
    {
      "id": 222,
      "has_delivery_enabled": true,
      "delivery_time_minutes": 30,
      "delivery_min_order": 15.00,
      "delivery_max_distance_km": 5.0,
      "takeout_enabled": true,
      "takeout_time_minutes": 15,
      "accepts_tips": true
    }
  ]
}
```

**What to Display**:
- Restaurant name, address, phone
- Hours of operation
- Delivery info (min order, delivery fee, estimated time)
- Service options (delivery, takeout)

---

### 3. Menu Browsing

#### Get Restaurant Menu (REFACTORED SCHEMA) ✅
**Endpoint**: `GET /api/customer/restaurants/[slug]/menu?language=en`  
**Auth**: None (public)  
**Purpose**: Get complete menu with courses, dishes, pricing, modifiers

**Example Request**:
```typescript
const slug = 'spice-garden-123';
const language = 'en'; // or 'fr', 'es'
const response = await fetch(
  `/api/customer/restaurants/${slug}/menu?language=${language}`
);
const menu = await response.json();
```

**Response** (Refactored Schema):
```json
[
  {
    "course_id": 1,
    "course_name": "Appetizers",
    "course_display_order": 1,
    "dish_id": 501,
    "dish_name": "Samosas (2 pcs)",
    "dish_description": "Crispy pastry filled with spiced potatoes",
    "dish_display_order": 1,
    "pricing": [
      {
        "size": "default",
        "price": 5.99,
        "display_order": 0
      }
    ],
    "modifiers": [
      {
        "group_id": 10,
        "group_name": "Extras",
        "is_required": false,
        "min_selections": 0,
        "max_selections": 999,
        "display_order": 1,
        "modifiers": [
          {
            "id": 101,
            "name": "Extra Chutney",
            "price": 0.50,
            "display_order": 1
          }
        ]
      }
    ],
    "availability": {
      "is_active": true,
      "is_available": true,
      "unavailable_until": null
    }
  },
  {
    "course_id": 2,
    "course_name": "Mains",
    "course_display_order": 2,
    "dish_id": 502,
    "dish_name": "Butter Chicken",
    "dish_description": "Tender chicken in creamy tomato sauce",
    "dish_display_order": 1,
    "pricing": [
      {
        "size": "regular",
        "price": 14.99,
        "display_order": 0
      },
      {
        "size": "large",
        "price": 18.99,
        "display_order": 1
      }
    ],
    "modifiers": [
      {
        "group_id": 20,
        "group_name": "Spice Level",
        "is_required": true,
        "min_selections": 1,
        "max_selections": 1,
        "display_order": 1,
        "modifiers": [
          {
            "id": 201,
            "name": "Mild",
            "price": 0.00,
            "display_order": 1
          },
          {
            "id": 202,
            "name": "Medium",
            "price": 0.00,
            "display_order": 2
          },
          {
            "id": 203,
            "name": "Spicy",
            "price": 0.00,
            "display_order": 3
          }
        ]
      }
    ],
    "availability": {
      "is_active": true,
      "is_available": true,
      "unavailable_until": null
    }
  }
]
```

**Important Notes**:
- ✅ **No deprecated fields**: No `base_price` or `size_options` JSONB
- ✅ **Refactored schema**: Uses `dish_prices` table (relational)
- ✅ **Modifier groups**: Uses `modifier_groups` table with `is_required`, `min_selections`, `max_selections`
- ✅ **Multi-language**: Pass `language` param for translated content

**How to Display**:
1. **Group by `course_name`**: Show "Appetizers", "Mains", "Desserts" sections
2. **Display each dish**: Name, description, prices
3. **Show pricing options**: If multiple sizes, show as dropdown
4. **Availability badge**: Check `availability.is_available` → Show "Sold Out" if false

---

### 4. Dish Customization

#### Validate Dish Customization
**Endpoint**: `POST /api/menu/validate-customization`  
**Auth**: None  
**Purpose**: Validate user's modifier selections before adding to cart

**Request Body**:
```json
{
  "dish_id": 502,
  "selected_modifiers": [
    {
      "modifier_id": 202,
      "quantity": 1
    },
    {
      "modifier_id": 101,
      "quantity": 2
    }
  ]
}
```

**Response** (Valid):
```json
{
  "is_valid": true,
  "errors": []
}
```

**Response** (Invalid):
```json
{
  "is_valid": false,
  "errors": [
    "Modifier group 'Spice Level' requires at least 1 selection",
    "Modifier group 'Extras' allows maximum 3 selections"
  ]
}
```

**When to Use**:
- Before adding dish to cart
- When user changes selections
- Before proceeding to checkout

---

#### Calculate Dish Price
**Endpoint**: `POST /api/menu/calculate-price`  
**Auth**: None  
**Purpose**: Calculate total price including modifiers

**Request Body**:
```json
{
  "dish_id": 502,
  "size_variant": "large",
  "selected_modifiers": [
    {
      "modifier_id": 202,
      "quantity": 1
    },
    {
      "modifier_id": 101,
      "quantity": 2
    }
  ]
}
```

**Response**:
```json
{
  "base_price": 18.99,
  "modifier_total": 1.00,
  "total_price": 19.99,
  "currency": "CAD",
  "breakdown": [
    {
      "modifier_id": 202,
      "name": "Medium Spice",
      "quantity": 1,
      "unit_price": 0.00,
      "total": 0.00
    },
    {
      "modifier_id": 101,
      "name": "Extra Chutney",
      "quantity": 2,
      "unit_price": 0.50,
      "total": 1.00
    }
  ]
}
```

**When to Use**:
- Real-time price updates as user selects modifiers
- Display in cart preview
- Order summary before checkout

---

### 5. User Management (Optional)

#### Get User Favorites
**Endpoint**: `GET /api/users/favorites`  
**Auth**: Required (user auth)  
**Purpose**: Get user's favorite restaurants/dishes

#### Manage User Addresses
**Endpoint**: `GET /api/users/addresses`  
**Auth**: Required (user auth)  
**Purpose**: Get saved delivery addresses for quick checkout

---

### 6. Order Management

#### Create Order
**Endpoint**: `POST /api/orders` (currently admin-only, needs customer version)  
**Purpose**: Submit customer order

**Request Body** (Example):
```json
{
  "restaurant_id": 123,
  "user_id": 456,
  "order_type": "delivery",
  "items": [
    {
      "dish_id": 502,
      "size_variant": "large",
      "quantity": 1,
      "modifiers": [
        { "modifier_id": 202, "quantity": 1 },
        { "modifier_id": 101, "quantity": 2 }
      ],
      "unit_price": 19.99,
      "total_price": 19.99
    }
  ],
  "subtotal": 19.99,
  "delivery_fee": 3.99,
  "tax": 2.99,
  "tip": 3.00,
  "total": 29.97,
  "delivery_address": {
    "street": "456 Oak Ave",
    "city": "Toronto",
    "province": "ON",
    "postal_code": "M4P 1E4"
  },
  "payment_method": "credit_card",
  "special_instructions": "Ring doorbell"
}
```

**Response**:
```json
{
  "order_id": 789,
  "status": "pending",
  "estimated_delivery": "2025-10-31T19:30:00Z",
  "tracking_url": "/orders/789"
}
```

---

## 🎯 Complete User Flow Examples

### Flow 1: Chatbot → Restaurant Discovery

```typescript
// Step 1: User enters preference in chatbot
const userInput = "something spicy and healthy";

// Step 2: AI processes input and matches to tags/cuisines
const matchedTags = await aiEngine.matchPreferences(userInput);
// Returns: { cuisines: ["indian", "thai"], tags: ["spicy", "healthy"] }

// Step 3: Fetch matching restaurants
const response = await fetch(
  `/api/restaurants?status=active&search=${matchedTags.tags.join(',')}`
);
const restaurants = await response.json();

// Step 4: Display restaurant cards
restaurants.forEach(restaurant => {
  displayRestaurantCard({
    name: restaurant.name,
    slug: restaurant.slug,
    cuisines: restaurant.cuisines,
    tags: restaurant.tags,
    image: restaurant.image_url
  });
});
```

---

### Flow 2: View Restaurant → Browse Menu

```typescript
// Step 1: User clicks restaurant
const restaurantSlug = 'spice-garden-123';

// Step 2: Fetch restaurant details
const restaurantResponse = await fetch(
  `/api/customer/restaurants/${restaurantSlug}`
);
const restaurant = await restaurantResponse.json();

// Step 3: Display restaurant info
displayRestaurantHeader({
  name: restaurant.name,
  address: restaurant.restaurant_locations[0].street_address,
  phone: restaurant.restaurant_locations[0].phone,
  deliveryInfo: restaurant.restaurant_service_configs[0]
});

// Step 4: Fetch menu
const menuResponse = await fetch(
  `/api/customer/restaurants/${restaurantSlug}/menu?language=en`
);
const menuItems = await menuResponse.json();

// Step 5: Group menu by courses
const menuByCourse = menuItems.reduce((acc, item) => {
  if (!acc[item.course_name]) {
    acc[item.course_name] = [];
  }
  acc[item.course_name].push({
    id: item.dish_id,
    name: item.dish_name,
    description: item.dish_description,
    pricing: item.pricing,
    modifiers: item.modifiers,
    availability: item.availability
  });
  return acc;
}, {});

// Step 6: Display menu by course
Object.entries(menuByCourse).forEach(([courseName, dishes]) => {
  renderCourseSection(courseName, dishes);
});
```

---

### Flow 3: Customize Dish → Add to Cart

```typescript
// Step 1: User clicks dish
const dish = {
  id: 502,
  name: "Butter Chicken",
  pricing: [
    { size: "regular", price: 14.99 },
    { size: "large", price: 18.99 }
  ],
  modifiers: [
    {
      group_id: 20,
      group_name: "Spice Level",
      is_required: true,
      min_selections: 1,
      max_selections: 1,
      modifiers: [
        { id: 201, name: "Mild", price: 0.00 },
        { id: 202, name: "Medium", price: 0.00 },
        { id: 203, name: "Spicy", price: 0.00 }
      ]
    }
  ]
};

// Step 2: User selects size
const selectedSize = "large"; // $18.99

// Step 3: User selects modifiers
const selectedModifiers = [
  { modifier_id: 202, quantity: 1 }, // Medium spice
  { modifier_id: 101, quantity: 2 }  // Extra chutney x2
];

// Step 4: Validate selections
const validationResponse = await fetch('/api/menu/validate-customization', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dish_id: dish.id,
    selected_modifiers: selectedModifiers
  })
});
const validation = await validationResponse.json();

if (!validation.is_valid) {
  showErrors(validation.errors);
  return;
}

// Step 5: Calculate price
const priceResponse = await fetch('/api/menu/calculate-price', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dish_id: dish.id,
    size_variant: selectedSize,
    selected_modifiers: selectedModifiers
  })
});
const priceData = await priceResponse.json();

// Step 6: Add to cart
addToCart({
  dish_id: dish.id,
  dish_name: dish.name,
  size_variant: selectedSize,
  modifiers: selectedModifiers,
  quantity: 1,
  unit_price: priceData.total_price,
  total_price: priceData.total_price
});

// Step 7: Show cart preview
showCartPreview({
  itemCount: cart.items.length,
  subtotal: cart.subtotal
});
```

---

### Flow 4: Checkout → Payment

```typescript
// Step 1: User proceeds to checkout
const cart = getCart();

// Step 2: Validate cart items (batch validation)
const allValid = await Promise.all(
  cart.items.map(item =>
    fetch('/api/menu/validate-customization', {
      method: 'POST',
      body: JSON.stringify({
        dish_id: item.dish_id,
        selected_modifiers: item.modifiers
      })
    }).then(r => r.json())
  )
);

if (allValid.some(v => !v.is_valid)) {
  showError("Some items in your cart are no longer available");
  return;
}

// Step 3: Get delivery address (from saved addresses or new)
const address = await getUserAddress();

// Step 4: Calculate totals
const subtotal = cart.items.reduce((sum, item) => sum + item.total_price, 0);
const deliveryFee = 3.99;
const tax = subtotal * 0.13; // 13% HST in Ontario
const total = subtotal + deliveryFee + tax;

// Step 5: Create order
const orderResponse = await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    restaurant_id: cart.restaurant_id,
    order_type: 'delivery',
    items: cart.items,
    subtotal,
    delivery_fee: deliveryFee,
    tax,
    total,
    delivery_address: address,
    payment_method: 'credit_card'
  })
});

const order = await orderResponse.json();

// Step 6: Process payment (integrate with Stripe/payment provider)
const paymentResult = await processPayment(order.order_id, total);

if (paymentResult.success) {
  showOrderConfirmation(order.order_id);
  clearCart();
}
```

---

## 📦 Data Models

### Restaurant
```typescript
interface Restaurant {
  id: number;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'closed';
  restaurant_locations: Location[];
  restaurant_schedules: Schedule[];
  restaurant_service_configs: ServiceConfig[];
}
```

### Menu Item
```typescript
interface MenuItem {
  course_id: number;
  course_name: string;
  course_display_order: number;
  dish_id: number;
  dish_name: string;
  dish_description: string;
  dish_display_order: number;
  pricing: DishPrice[];
  modifiers: ModifierGroup[] | null;
  availability: DishAvailability;
}

interface DishPrice {
  size: string;
  price: number;
  display_order: number;
}

interface ModifierGroup {
  group_id: number;
  group_name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  display_order: number;
  modifiers: Modifier[];
}

interface Modifier {
  id: number;
  name: string;
  price: number;
  display_order: number;
}

interface DishAvailability {
  is_active: boolean;
  is_available: boolean;
  unavailable_until: string | null;
}
```

### Selected Modifier
```typescript
interface SelectedModifier {
  modifier_id: number;
  quantity: number;
}
```

---

## ⚠️ Error Handling

### Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad Request | Show validation error to user |
| 404 | Not Found | Redirect to home or show "Restaurant not found" |
| 500 | Server Error | Show generic error, retry option |

### Error Response Format
```json
{
  "error": "Human-readable error message"
}
```

### Error Handling Example
```typescript
async function fetchMenu(slug: string) {
  try {
    const response = await fetch(`/api/customer/restaurants/${slug}/menu`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch menu');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Menu fetch error:', error);
    showUserError('Unable to load menu. Please try again.');
    return null;
  }
}
```

---

## 💡 Best Practices

### 1. Performance Optimization

**Cache Restaurant Lists**:
```typescript
// Cache restaurant search results
const cacheKey = `restaurants_${cuisines.join('_')}_${tags.join('_')}`;
const cached = sessionStorage.getItem(cacheKey);
if (cached) return JSON.parse(cached);
```

**Lazy Load Menus**:
```typescript
// Only fetch menu when user clicks restaurant
// Don't fetch all menus upfront
```

---

### 2. Real-Time Price Updates

```typescript
// Update price as user selects modifiers
useEffect(() => {
  if (selectedModifiers.length > 0) {
    calculatePrice(dishId, sizeVariant, selectedModifiers)
      .then(setCurrentPrice);
  }
}, [selectedModifiers, sizeVariant]);
```

---

### 3. Validation Before Checkout

```typescript
// Always validate before adding to cart
const validate = async (dish) => {
  const validation = await validateCustomization(dish.id, dish.modifiers);
  if (!validation.is_valid) {
    showErrors(validation.errors);
    return false;
  }
  return true;
};
```

---

### 4. Handle "Sold Out" Dishes

```typescript
// Check availability before allowing selection
const isDishAvailable = (dish: MenuItem) => {
  return dish.availability.is_active && dish.availability.is_available;
};

// Display sold-out badge
{!isDishAvailable(dish) && (
  <Badge variant="destructive">Sold Out</Badge>
)}
```

---

### 5. Multi-Language Support

```typescript
// Get user's preferred language
const language = navigator.language.startsWith('fr') ? 'fr' : 'en';

// Pass to menu API
const menu = await fetchMenu(slug, language);
```

---

## 🔗 Related Documentation

- **Backend Integration Guide**: `SANTIAGO_REFACTORED_BACKEND_GUIDE.md`
- **Phase 11 Completion Report**: `PHASE_11_COMPLETION_REPORT.md`
- **Menu Refactoring Plan**: `MENU_CATALOG_REFACTORING_PLAN.md`

---

## 📞 Support

**Questions?** Refer to the FAQ in `SANTIAGO_REFACTORED_BACKEND_GUIDE.md`

**Issues?** Check error responses and validation messages

---

**Document Version**: 1.0  
**Last Updated**: October 31, 2025  
**Status**: Complete - All APIs verified and ready for integration
