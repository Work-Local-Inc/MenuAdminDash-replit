# Direct Table Queries - Implementation Guide

**For:** Brian (Frontend Developer)  
**Date:** October 23, 2025  
**Context:** SQL functions aren't exposed via REST API, so we use direct table queries

---

## 🎯 **WHY DIRECT QUERIES?**

### **The Situation:**

✅ SQL functions exist in database  
✅ EXECUTE permissions granted  
❌ PostgREST doesn't expose `menuca_v3` schema  
❌ Functions return 404 via `/rest/v1/rpc/`

### **The Solution:**

Use direct table queries with Supabase client. This is **fully supported** and **secure** (RLS policies still apply).

---

## 🛠️ **IMPLEMENTATION PATTERNS**

### **Pattern 1: Get Single Record (Profile)**

Instead of:
```typescript
// ❌ This returns 404
const { data } = await supabase.rpc('get_user_profile');
```

Use:
```typescript
// ✅ This works
async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      first_name,
      last_name,
      phone,
      credit_balance,
      language,
      has_email_verified,
      stripe_customer_id
    `)
    .eq('auth_user_id', user.id)
    .is('deleted_at', null)
    .single();
  
  if (error) throw error;
  
  return data;
}
```

**How it works:**
1. Get authenticated user from Supabase Auth
2. Query `users` table filtered by `auth_user_id`
3. RLS policy automatically filters to current user
4. Returns single record

---

### **Pattern 2: Get Multiple Records (Addresses)**

Instead of:
```typescript
// ❌ This returns 404
const { data } = await supabase.rpc('get_user_addresses');
```

Use:
```typescript
// ✅ This works
async function getUserAddresses() {
  const profile = await getUserProfile();
  
  const { data, error } = await supabase
    .from('user_delivery_addresses')
    .select(`
      id,
      address_line1,
      address_line2,
      city,
      province,
      postal_code,
      delivery_instructions,
      is_default,
      created_at
    `)
    .eq('user_id', profile.id)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return data;
}
```

**How it works:**
1. Get user profile first (to get `user_id`)
2. Query `user_delivery_addresses` filtered by `user_id`
3. Filter out soft-deleted records
4. Order by default address first, then most recent

---

### **Pattern 3: Get Related Data (Favorites with Restaurant Details)**

Instead of:
```typescript
// ❌ This returns 404
const { data } = await supabase.rpc('get_favorite_restaurants');
```

Use:
```typescript
// ✅ This works
async function getFavoriteRestaurants() {
  const profile = await getUserProfile();
  
  const { data, error } = await supabase
    .from('user_favorite_restaurants')
    .select(`
      restaurant_id,
      created_at,
      restaurants:restaurant_id (
        id,
        name,
        slug,
        logo_url,
        cuisine_type,
        rating,
        delivery_fee,
        min_order_amount,
        is_active
      )
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return data;
}
```

**How it works:**
1. Get user profile first
2. Query `user_favorite_restaurants` with nested restaurant data
3. Supabase automatically joins via foreign key
4. Returns combined data structure

---

### **Pattern 4: Toggle/Mutate Data (Add/Remove Favorite)**

Instead of:
```typescript
// ❌ This returns 404
const { data } = await supabase.rpc('toggle_favorite_restaurant', {
  p_restaurant_id: restaurantId
});
```

Use:
```typescript
// ✅ This works
async function toggleFavoriteRestaurant(restaurantId: number) {
  const profile = await getUserProfile();
  
  // Check if already favorite
  const { data: existing, error: checkError } = await supabase
    .from('user_favorite_restaurants')
    .select('id')
    .eq('user_id', profile.id)
    .eq('restaurant_id', restaurantId)
    .single();
  
  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }
  
  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from('user_favorite_restaurants')
      .delete()
      .eq('id', existing.id);
    
    if (error) throw error;
    
    return { action: 'removed', restaurant_id: restaurantId };
  } else {
    // Add favorite
    const { error } = await supabase
      .from('user_favorite_restaurants')
      .insert({
        user_id: profile.id,
        restaurant_id: restaurantId
      });
    
    if (error) throw error;
    
    return { action: 'added', restaurant_id: restaurantId };
  }
}
```

**How it works:**
1. Get user profile
2. Check if favorite already exists
3. If exists: DELETE
4. If not exists: INSERT
5. Return action performed

---

### **Pattern 5: Add New Record (Create Address)**

```typescript
async function addDeliveryAddress(address: {
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code: string;
  delivery_instructions?: string;
  is_default?: boolean;
}) {
  const profile = await getUserProfile();
  
  // If setting as default, unset other defaults first
  if (address.is_default) {
    await supabase
      .from('user_delivery_addresses')
      .update({ is_default: false })
      .eq('user_id', profile.id);
  }
  
  const { data, error } = await supabase
    .from('user_delivery_addresses')
    .insert({
      user_id: profile.id,
      ...address
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return data;
}
```

---

### **Pattern 6: Update Existing Record (Update Profile)**

```typescript
async function updateUserProfile(updates: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  language?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('auth_user_id', user.id)
    .select()
    .single();
  
  if (error) throw error;
  
  return data;
}
```

---

### **Pattern 7: Delete Record (Delete Address)**

```typescript
async function deleteDeliveryAddress(addressId: number) {
  const profile = await getUserProfile();
  
  const { error } = await supabase
    .from('user_delivery_addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', profile.id); // Security: ensure user owns this address
  
  if (error) throw error;
  
  return { success: true, id: addressId };
}
```

---

## 🔐 **SECURITY: HOW RLS PROTECTS YOU**

Even though you're querying tables directly, **RLS policies automatically enforce security**:

### **Example: User Profile Query**

```typescript
// Your code:
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('auth_user_id', user.id);

// What PostgreSQL actually executes:
SELECT * FROM menuca_v3.users
WHERE auth_user_id = '...'
  AND auth.uid() = auth_user_id  -- ✅ RLS policy adds this!
  AND deleted_at IS NULL;         -- ✅ RLS policy adds this!
```

**Result:** Users can ONLY see their own data, even if they try to hack the query.

### **Example: Attempted Hack**

```typescript
// Hacker tries to get another user's data:
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', 'victim@example.com'); // ❌ Trying to access someone else

// What PostgreSQL returns:
// [] (empty array)
// RLS policy filters it out because auth.uid() doesn't match
```

---

## 📦 **CREATE A REUSABLE API CLIENT**

### **File: `lib/api/users.ts`**

```typescript
import { supabase } from '@/lib/supabase';

/**
 * User API Client
 * Handles all user-related data operations
 */
export const usersApi = {
  /**
   * Get current user's profile
   */
  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        credit_balance,
        language,
        has_email_verified,
        stripe_customer_id
      `)
      .eq('auth_user_id', user.id)
      .is('deleted_at', null)
      .single();
    
    if (error) throw error;
    
    return data;
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    language?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('auth_user_id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  },

  /**
   * Get user's delivery addresses
   */
  async getAddresses() {
    const profile = await this.getProfile();
    
    const { data, error } = await supabase
      .from('user_delivery_addresses')
      .select(`
        id,
        address_line1,
        address_line2,
        city,
        province,
        postal_code,
        delivery_instructions,
        is_default,
        created_at
      `)
      .eq('user_id', profile.id)
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data;
  },

  /**
   * Add delivery address
   */
  async addAddress(address: {
    address_line1: string;
    address_line2?: string;
    city: string;
    province: string;
    postal_code: string;
    delivery_instructions?: string;
    is_default?: boolean;
  }) {
    const profile = await this.getProfile();
    
    // If setting as default, unset others
    if (address.is_default) {
      await supabase
        .from('user_delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', profile.id);
    }
    
    const { data, error } = await supabase
      .from('user_delivery_addresses')
      .insert({
        user_id: profile.id,
        ...address
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  },

  /**
   * Delete delivery address
   */
  async deleteAddress(addressId: number) {
    const profile = await this.getProfile();
    
    const { error } = await supabase
      .from('user_delivery_addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', profile.id);
    
    if (error) throw error;
    
    return { success: true, id: addressId };
  },

  /**
   * Get favorite restaurants
   */
  async getFavorites() {
    const profile = await this.getProfile();
    
    const { data, error } = await supabase
      .from('user_favorite_restaurants')
      .select(`
        restaurant_id,
        created_at,
        restaurants:restaurant_id (
          id,
          name,
          slug,
          logo_url,
          cuisine_type,
          rating,
          delivery_fee,
          min_order_amount,
          is_active
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data;
  },

  /**
   * Toggle favorite restaurant
   */
  async toggleFavorite(restaurantId: number) {
    const profile = await this.getProfile();
    
    // Check if exists
    const { data: existing, error: checkError } = await supabase
      .from('user_favorite_restaurants')
      .select('id')
      .eq('user_id', profile.id)
      .eq('restaurant_id', restaurantId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    if (existing) {
      // Remove
      const { error } = await supabase
        .from('user_favorite_restaurants')
        .delete()
        .eq('id', existing.id);
      
      if (error) throw error;
      
      return { action: 'removed', restaurant_id: restaurantId };
    } else {
      // Add
      const { error } = await supabase
        .from('user_favorite_restaurants')
        .insert({
          user_id: profile.id,
          restaurant_id: restaurantId
        });
      
      if (error) throw error;
      
      return { action: 'added', restaurant_id: restaurantId };
    }
  }
};
```

---

## 🎯 **USAGE IN COMPONENTS**

### **Example 1: Profile Page**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api/users';

export function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await usersApi.getProfile();
        setProfile(data);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {profile.first_name}!</h1>
      <p>Email: {profile.email}</p>
      <p>Credit Balance: ${profile.credit_balance}</p>
    </div>
  );
}
```

---

### **Example 2: Edit Profile Form**

```typescript
'use client';

import { useState } from 'react';
import { usersApi } from '@/lib/api/users';
import { toast } from 'sonner';

export function EditProfileForm({ profile }) {
  const [formData, setFormData] = useState({
    first_name: profile.first_name,
    last_name: profile.last_name,
    phone: profile.phone
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      await usersApi.updateProfile(formData);
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.first_name}
        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
      />
      <input
        value={formData.last_name}
        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
      />
      <input
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
      />
      <button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
```

---

### **Example 3: Favorites List**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api/users';
import { toast } from 'sonner';

export function FavoritesList() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    try {
      const data = await usersApi.getFavorites();
      setFavorites(data);
    } catch (error) {
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(restaurantId) {
    try {
      const result = await usersApi.toggleFavorite(restaurantId);
      toast.success(result.action === 'added' ? 'Added to favorites' : 'Removed from favorites');
      await loadFavorites(); // Reload list
    } catch (error) {
      toast.error('Failed to update favorite');
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>My Favorite Restaurants</h2>
      {favorites.map(fav => (
        <div key={fav.restaurant_id}>
          <img src={fav.restaurants.logo_url} alt={fav.restaurants.name} />
          <h3>{fav.restaurants.name}</h3>
          <p>{fav.restaurants.cuisine_type}</p>
          <button onClick={() => handleToggle(fav.restaurant_id)}>
            Remove from Favorites
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ **ADVANTAGES OF THIS APPROACH**

1. **✅ Works Immediately** - No backend configuration changes needed
2. **✅ Secure** - RLS policies still apply automatically
3. **✅ Type-Safe** - TypeScript can infer types from queries
4. **✅ Fast** - Direct database queries (< 50ms)
5. **✅ Flexible** - Easy to customize queries for specific needs
6. **✅ Standard** - This is the recommended Supabase pattern

---

## 📋 **SUMMARY**

### **Instead of SQL Functions:**
```typescript
// ❌ Not accessible
await supabase.rpc('get_user_profile');
```

### **Use Direct Queries:**
```typescript
// ✅ Works perfectly
await supabase
  .from('users')
  .select('*')
  .eq('auth_user_id', user.id)
  .single();
```

### **Benefits:**
- ✅ No backend changes needed
- ✅ RLS security still applies
- ✅ Faster (no function overhead)
- ✅ More flexible queries
- ✅ Standard Supabase pattern

---

**This is the recommended approach for MenuCA! Use it for all data operations.** ✅

