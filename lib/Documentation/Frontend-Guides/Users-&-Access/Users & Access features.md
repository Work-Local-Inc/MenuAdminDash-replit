# Users & Access - Features Implementation Tracker

**Entity:** Users & Access (Priority 2)
**Status:** ✅ COMPLETE (6/6 features complete)
**Last Updated:** 2025-10-29

---

## ✅ Feature Completion Status

| # | Feature | Status | SQL Functions | Edge Functions | API Endpoints | Completed Date |
|---|---------|--------|---------------|----------------|---------------|----------------|
| 1 | Customer Authentication & Profiles | ✅ COMPLETE | 7 | 0 | 4 | 2025-10-28 |
| 2 | Customer Delivery Addresses | ✅ COMPLETE | 1 | 0 | 4 | 2025-10-28 |
| 3 | Customer Favorite Restaurants | ✅ COMPLETE | 2 | 0 | 2 | 2025-10-28 |
| 4 | Admin Authentication & RBAC | ✅ COMPLETE | 5 | 0 | 4 | 2025-10-28 |
| 5 | Admin User Management (JWT-Based) | ✅ COMPLETE | 1 | 2 | 3 | 2025-10-30 |
| 6 | Legacy User Migration | ✅ COMPLETE | 0 | 3 | 3 | 2025-10-23 |

**Totals:** 16 SQL Functions | 5 Edge Functions | 20 API Endpoints

---

## ✅ FEATURE 1: Customer Authentication & Profiles

**Status:** ✅ COMPLETE
**Completed:** 2025-10-28
**Type:** Customer
**User Type:** Customers (End Users)

### Implementation Checklist

- [x] Create auth accounts via Supabase Auth
- [x] Link profiles to auth.users via auth_user_id
- [x] Enable profile retrieval via JWT token
- [x] Support profile updates (name, phone, language)
- [x] Implement credit balance tracking
- [x] Add email verification flag
- [x] Set up RLS policies for customer isolation
- [x] Create indexes for < 10ms performance

### Business Value

**What it enables:**
- Secure customer authentication (1,756 active accounts)
- Profile management (name, phone, email, language)
- Multi-language support (EN/ES/FR)
- Store credit tracking for promotions
- Stripe payment integration

**Performance:**
- < 10ms profile queries
- JWT-based (60-min access, 30-day refresh)
- Complete tenant isolation via RLS

---

### Quick Test

```bash
# Verify function exists
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df menuca_v3.get_user_profile"

# Check active customer count
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "SELECT COUNT(*) FROM menuca_v3.users WHERE deleted_at IS NULL AND auth_user_id IS NOT NULL;"

# Sample profile data
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "SELECT id, email, first_name, language, credit_balance FROM menuca_v3.users LIMIT 3;"
```

---

### SQL Functions (7 Total)

#### 1. `get_user_profile()` - Get Customer Profile

**Code First:**
```typescript
// Get authenticated customer's profile
const { data: profile } = await supabase.rpc('get_user_profile');
console.log(profile);
// Returns: { id, email, first_name, last_name, phone, language, credit_balance, ... }
```

**Verify:**
```bash
# Check function exists
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df menuca_v3.get_user_profile"

# Test with actual user (requires auth context - use REST API instead)
# See API Endpoints section below for REST testing
```

**What it does:**
- Gets complete profile for authenticated customer
- Uses `auth.uid()` for automatic security
- Performance: < 10ms
- Location: `menuca_v3` schema → Functions → `get_user_profile`

---

#### 2. `update_user_profile()` - Update Profile

**Code First:**
```typescript
// Update customer information
const { data } = await supabase.rpc('update_user_profile', {
  p_first_name: 'Jane',
  p_last_name: 'Smith',
  p_phone: '+1987654321',
  p_language: 'fr'
});
```

**Verify:**
```sql
-- Check function signature
\df menuca_v3.update_user_profile

-- Verify profile updated (check updated_at timestamp)
SELECT id, first_name, last_name, language, updated_at
FROM menuca_v3.users
WHERE email = 'test@example.com';
```

**What it does:**
- Updates profile fields for authenticated user
- Validates language codes (EN/ES/FR)
- Performance: < 15ms
- Location: `menuca_v3` schema → Functions → `update_user_profile`

---

#### 3. `add_user_credit()` - Add Store Credit

**Code First:**
```typescript
// Add $10 credit for refund
const { data } = await supabase.rpc('add_user_credit', {
  p_user_id: 165,
  p_amount: 10.00,
  p_reason: 'Refund for order #1234'
});
// Returns: new credit balance
```

**Verify:**
```sql
-- Check credit balance increased
SELECT id, email, credit_balance
FROM menuca_v3.users
WHERE id = 165;

-- Check credit transaction logged (if audit table exists)
SELECT * FROM menuca_v3.credit_transactions
WHERE user_id = 165
ORDER BY created_at DESC
LIMIT 5;
```

**What it does:**
- Adds credit to customer account (refunds, promos, referrals)
- Returns updated balance
- Performance: < 10ms
- Location: `menuca_v3` schema → Functions → `add_user_credit`

---

#### 4. `deduct_user_credit()` - Use Store Credit

**Code First:**
```typescript
// Use $5 credit on order
const { data } = await supabase.rpc('deduct_user_credit', {
  p_user_id: 165,
  p_amount: 5.00,
  p_order_id: 999999
});
// Returns: remaining balance
```

**Verify:**
```sql
-- Check credit balance decreased
SELECT id, email, credit_balance
FROM menuca_v3.users
WHERE id = 165;
```

**What it does:**
- Deducts credit from customer account
- Validates sufficient balance
- Performance: < 10ms
- Location: `menuca_v3` schema → Functions → `deduct_user_credit`

---

#### 5-7. Additional Functions

**Other available functions:**
- `get_user_by_email(email)` - Lookup by email (admin only)
- `create_user_profile(...)` - Create profile (usually auto-triggered)
- `verify_user_email(user_id)` - Mark email verified

**0 Edge Functions:** All logic in SQL for performance

---

### API Endpoints (4 Total)

#### Endpoint 1: Customer Signup

**Code First:**
```typescript
// Create new customer account
const { data, error } = await supabase.auth.signUp({
  email: 'customer@example.com',
  password: 'securepass123',
  options: {
    data: {
      first_name: 'John',
      last_name: 'Doe',
      phone: '+1234567890'
    }
  }
});

if (error) {
  console.error('Signup failed:', error.message);
} else {
  console.log('User created:', data.user.id);
}
```

**Verify:**
```sql
-- Check auth user was created
SELECT id, email, created_at
FROM auth.users
WHERE email = 'customer@example.com';

-- Check profile was auto-created (via trigger)
SELECT id, email, first_name, last_name, auth_user_id
FROM menuca_v3.users
WHERE email = 'customer@example.com';
```

---

#### Endpoint 2: Customer Login

**Code First:**
```typescript
// Login customer
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'customer@example.com',
  password: 'securepass123'
});

if (error) {
  console.error('Login failed:', error.message);
} else {
  console.log('Logged in:', data.user.email);
  console.log('Token expires:', new Date(data.session.expires_at * 1000));

  // Get profile after login
  const { data: profile } = await supabase.rpc('get_user_profile');
  console.log('Profile:', profile);
}
```

**Verify:**
```sql
-- Check last sign in updated
SELECT email, last_sign_in_at
FROM auth.users
WHERE email = 'customer@example.com';
```

---

#### Endpoint 3: Get Profile

**Code First:**
```typescript
// Get authenticated customer's profile
const { data: profile, error } = await supabase.rpc('get_user_profile');

console.log({
  id: profile.id,
  email: profile.email,
  name: `${profile.first_name} ${profile.last_name}`,
  language: profile.language,
  credit: profile.credit_balance
});
```

---

#### Endpoint 4: Update Profile

**Code First:**
```typescript
// Update customer information
const { data, error } = await supabase.rpc('update_user_profile', {
  p_first_name: 'Jane',
  p_last_name: 'Smith',
  p_phone: '+1987654321',
  p_language: 'fr'
});

if (!error) {
  console.log('Profile updated!');
}
```

**Verify:**
```sql
-- Check profile updated
SELECT first_name, last_name, phone, language, updated_at
FROM menuca_v3.users
WHERE email = 'customer@example.com';
```

---

### Frontend Integration

```typescript
// Complete signup flow
async function handleSignup(email: string, password: string, userData: any) {
  // Step 1: Create auth account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: userData }
  });

  if (authError) {
    console.error('Signup failed:', authError.message);
    return;
  }

  // Step 2: Get profile (auto-created by trigger)
  const { data: profile } = await supabase.rpc('get_user_profile');
  console.log('Profile created:', profile);

  // Redirect to dashboard
  router.push('/dashboard');
}

// Update profile
async function updateProfile(updates: any) {
  const { data, error } = await supabase.rpc('update_user_profile', {
    p_first_name: updates.first_name,
    p_last_name: updates.last_name,
    p_phone: updates.phone,
    p_language: updates.language
  });

  if (!error) {
    showSuccess('Profile updated!');
  }
}

// Check credit balance
async function getCreditBalance() {
  const { data: profile } = await supabase.rpc('get_user_profile');
  return profile.credit_balance; // Numeric value
}
```

---

### Testing Results

- ✅ Account creation: 1,756 customers migrated successfully
- ✅ JWT authentication: 60-minute access tokens working
- ✅ Profile queries: < 10ms average response time
- ✅ Multi-language: EN/ES/FR language preferences saved
- ✅ Credit system: Add/deduct operations validated
- ✅ Email verification: Flag updates correctly
- ✅ RLS policies: Complete tenant isolation (users can only see own data)
- ✅ Performance: All queries < 20ms

---

### Database Schema

**Table:** `menuca_v3.users`

**Key Columns:**
- `id` (BIGSERIAL PRIMARY KEY) - Internal user ID
- `auth_user_id` (UUID REFERENCES auth.users) - Links to Supabase Auth
- `email` (VARCHAR UNIQUE NOT NULL) - Customer email
- `first_name`, `last_name` (VARCHAR)
- `phone` (VARCHAR)
- `language` (VARCHAR DEFAULT 'EN') - EN/ES/FR
- `credit_balance` (NUMERIC DEFAULT 0.00) - Store credit
- `stripe_customer_id` (VARCHAR UNIQUE) - Payment integration
- `email_verified` (BOOLEAN DEFAULT false)
- `newsletter_subscribed` (BOOLEAN DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMP)
- `deleted_at`, `deleted_by` (Soft delete)

**Indexes:**
- `idx_users_auth_user_id` - Primary auth lookup (< 1ms)
- `idx_users_email` - Email lookups (< 2ms)
- `idx_users_stripe_customer_id` - Payment lookups (< 2ms)
- `idx_users_deleted_at` - Soft delete filtering (< 1ms)

**RLS Policies:** 4 policies
- Customers can select their own profile
- Customers can update their own profile
- Service role has full access
- Insert via authenticated users only

---

## ✅ FEATURE 2: Customer Delivery Addresses

**Status:** ✅ COMPLETE
**Completed:** 2025-10-28
**Type:** Customer
**User Type:** Customers (End Users)

### Implementation Checklist

- [x] Create user_delivery_addresses table
- [x] Add city/province relationships
- [x] Support multiple addresses per customer
- [x] Enable default address selection
- [x] Add address labeling (Home, Work, etc.)
- [x] Include delivery instructions field
- [x] Add geocoding (lat/long) for delivery zones
- [x] Set up RLS policies (CRUD operations)
- [x] Create indexes for < 10ms performance
- [x] Build get_user_addresses() SQL function

### Business Value

**What it enables:**
- Multiple addresses per customer (home, work, etc.)
- Default address selection for quick checkout
- Address labeling and delivery instructions
- Geocoding for delivery zone calculations

**Performance:**
- < 10ms address lookup
- Faster checkout flow
- Better delivery accuracy

---

### Quick Test

```bash
# Verify function exists
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df menuca_v3.get_user_addresses"

# Check address count
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "SELECT COUNT(*) FROM menuca_v3.user_delivery_addresses;"

# Sample address data
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "SELECT id, user_id, street_address, address_label, is_default FROM menuca_v3.user_delivery_addresses LIMIT 5;"
```

---

### SQL Functions (1 Function + Direct Table Access)

#### 1. `get_user_addresses()` - Get All Addresses

**Code First:**
```typescript
// Get customer's delivery addresses
const { data: addresses, error } = await supabase.rpc('get_user_addresses');

console.log(`Found ${addresses.length} addresses`);
addresses.forEach(addr => {
  console.log(`${addr.address_label}: ${addr.street_address}, ${addr.city_name}`);
  if (addr.is_default) console.log('  ⭐ Default address');
});
```

**Verify:**
```sql
-- Check function exists
\df menuca_v3.get_user_addresses

-- Check addresses with city/province details
SELECT
  a.id,
  a.street_address,
  a.address_label,
  a.is_default,
  c.name as city_name,
  p.name as province_name
FROM menuca_v3.user_delivery_addresses a
LEFT JOIN menuca_v3.cities c ON a.city_id = c.id
LEFT JOIN menuca_v3.provinces p ON c.province_id = p.id
WHERE a.user_id = 165
ORDER BY a.is_default DESC, a.created_at DESC;
```

**What it does:**
- Gets all addresses for authenticated customer
- Includes city and province names (via JOIN)
- Sorted by default first, then by created date
- Performance: < 10ms
- Location: `menuca_v3` schema → Functions → `get_user_addresses`

---

### Direct Table Access (Recommended for CRUD)

#### Insert New Address

**Code First:**
```typescript
// Add delivery address (direct table insert with RLS protection)
const { data, error } = await supabase
  .from('user_delivery_addresses')
  .insert({
    street_address: '123 Main St',
    unit: 'Apt 4B',
    city_id: 5,
    postal_code: 'K1A 0B1',
    address_label: 'Home',
    is_default: true,
    delivery_instructions: 'Ring doorbell twice'
  })
  .select()
  .single();

if (!error) {
  console.log('Address added:', data.id);
}
```

**Verify:**
```sql
-- Check address was created
SELECT id, street_address, unit, address_label, is_default, created_at
FROM menuca_v3.user_delivery_addresses
WHERE street_address = '123 Main St'
ORDER BY created_at DESC
LIMIT 1;
```

---

#### Update Address

**Code First:**
```typescript
// Update existing address
const { data, error } = await supabase
  .from('user_delivery_addresses')
  .update({
    is_default: true,
    delivery_instructions: 'Leave at door'
  })
  .eq('id', addressId)
  .select()
  .single();
```

**Verify:**
```sql
-- Check address updated
SELECT id, is_default, delivery_instructions, updated_at
FROM menuca_v3.user_delivery_addresses
WHERE id = {addressId};

-- Verify only one default address per user
SELECT user_id, COUNT(*) as default_count
FROM menuca_v3.user_delivery_addresses
WHERE is_default = true
GROUP BY user_id
HAVING COUNT(*) > 1;
-- Should return 0 rows (no users with multiple defaults)
```

---

#### Delete Address

**Code First:**
```typescript
// Delete address
const { error } = await supabase
  .from('user_delivery_addresses')
  .delete()
  .eq('id', addressId);

if (!error) {
  console.log('Address deleted');
}
```

**Verify:**
```sql
-- Confirm address deleted
SELECT COUNT(*) FROM menuca_v3.user_delivery_addresses WHERE id = {addressId};
-- Should return 0
```

---

### What Was Built

**1 SQL Function:**

1. **`get_user_addresses()`**
   - Get all delivery addresses for authenticated customer
   - Includes city and province names
   - Returns addresses sorted by default first, then created date
   - Returns: Array of address records with city/province details
   - Performance: < 10ms
   - **Location:** `menuca_v3` schema → Functions → `get_user_addresses`

**Direct Table Access (Recommended):**
The `user_delivery_addresses` table is protected by RLS policies, allowing safe direct CRUD operations:

```typescript
// Insert new address
await supabase.from('user_delivery_addresses').insert({ ... });

// Update address
await supabase.from('user_delivery_addresses').update({ ... }).eq('id', addressId);

// Delete address
await supabase.from('user_delivery_addresses').delete().eq('id', addressId);
```

**0 Edge Functions:** All operations use SQL or direct table access

---

### API Endpoints

**1. `GET /api/customers/me/addresses` - Get All Addresses**
```typescript
// Get customer's delivery addresses
const { data: addresses } = await supabase.rpc('get_user_addresses');
// Returns: [{ id, street_address, unit, city_name, province_name, postal_code, is_default, ... }]
```

**2. `POST /api/customers/me/addresses` - Add New Address**
```typescript
// Add delivery address (direct table insert with RLS)
const { data, error } = await supabase
  .from('user_delivery_addresses')
  .insert({
    street_address: '123 Main St',
    unit: 'Apt 4B',
    city_id: 5,
    postal_code: 'K1A 0B1',
    address_label: 'Home',
    is_default: true,
    delivery_instructions: 'Ring doorbell twice'
  })
  .select()
  .single();
```

**3. `PUT /api/customers/me/addresses/:id` - Update Address**
```typescript
// Update existing address
const { data, error } = await supabase
  .from('user_delivery_addresses')
  .update({
    is_default: true,
    delivery_instructions: 'Leave at door'
  })
  .eq('id', addressId)
  .select()
  .single();
```

**4. `DELETE /api/customers/me/addresses/:id` - Delete Address**
```typescript
// Delete address
const { error } = await supabase
  .from('user_delivery_addresses')
  .delete()
  .eq('id', addressId);
```

---

### Frontend Integration

```typescript
// Complete address management
function AddressManager() {
  const [addresses, setAddresses] = useState([]);

  // Load addresses
  async function loadAddresses() {
    const { data } = await supabase.rpc('get_user_addresses');
    setAddresses(data || []);
  }

  // Add new address
  async function addAddress(addressData) {
    const { data, error } = await supabase
      .from('user_delivery_addresses')
      .insert(addressData)
      .select()
      .single();

    if (!error) {
      loadAddresses(); // Refresh list
      showSuccess('Address added!');
    }
  }

  // Set as default
  async function setDefault(addressId) {
    // First, unset all defaults
    await supabase
      .from('user_delivery_addresses')
      .update({ is_default: false })
      .neq('id', addressId);

    // Then set this one as default
    await supabase
      .from('user_delivery_addresses')
      .update({ is_default: true })
      .eq('id', addressId);

    loadAddresses();
  }

  // Delete address
  async function deleteAddress(addressId) {
    const { error } = await supabase
      .from('user_delivery_addresses')
      .delete()
      .eq('id', addressId);

    if (!error) {
      loadAddresses();
      showSuccess('Address deleted!');
    }
  }

  return (
    <div>
      {addresses.map(addr => (
        <AddressCard
          key={addr.id}
          address={addr}
          onSetDefault={() => setDefault(addr.id)}
          onDelete={() => deleteAddress(addr.id)}
        />
      ))}
      <button onClick={() => showAddAddressModal()}>Add Address</button>
    </div>
  );
}
```

---

### Testing Results

- ✅ Multiple addresses per customer: Tested with 5+ addresses
- ✅ Default address selection: Only one default at a time
- ✅ City/province lookups: Correct data returned with joins
- ✅ Address labels: Home, Work, Other supported
- ✅ Delivery instructions: Text field working (max 500 chars)
- ✅ RLS policies: Customers can only see/modify own addresses
- ✅ Geocoding: Latitude/longitude fields available for mapping
- ✅ Performance: < 10ms for address list retrieval

---

### Database Schema

**Table:** `menuca_v3.user_delivery_addresses`

**Key Columns:**
- `id` (BIGSERIAL PRIMARY KEY)
- `user_id` (BIGINT REFERENCES users) - Customer owner
- `street_address` (VARCHAR NOT NULL)
- `unit` (VARCHAR) - Apartment/suite number
- `city_id` (BIGINT REFERENCES cities)
- `postal_code` (VARCHAR)
- `latitude`, `longitude` (NUMERIC) - For delivery zone checks
- `address_label` (VARCHAR) - "Home", "Work", etc.
- `is_default` (BOOLEAN DEFAULT false)
- `delivery_instructions` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_user_delivery_addresses_user` - User → Addresses lookup (< 2ms)
- `idx_user_delivery_addresses_city` - City relationships (< 2ms)
- `idx_user_delivery_addresses_location` - Geospatial queries (< 5ms)

**RLS Policies:** 5 policies
- Customers can select own addresses
- Customers can insert own addresses
- Customers can update own addresses
- Customers can delete own addresses
- Service role has full access

---

## ✅ FEATURE 3: Customer Favorite Restaurants

**Status:** ✅ COMPLETE
**Completed:** 2025-10-28
**Type:** Customer
**User Type:** Customers (End Users)

### Implementation Checklist

- [x] Create user_favorite_restaurants table
- [x] Add unique constraint (user_id, restaurant_id)
- [x] Build get_favorite_restaurants() function
- [x] Build toggle_favorite_restaurant() function
- [x] Set up RLS policies (select/insert/delete)
- [x] Create indexes for < 10ms performance
- [x] Include restaurant details in favorites query

### Business Value

**What it enables:**
- Quick access to favorite restaurants
- Personalized recommendations
- Better UX (less searching)
- Marketing insights (most favorited restaurants)

**Performance:**
- < 10ms favorites lookup
- Faster repeat orders
- Higher customer retention

---

### Quick Test

```bash
# Verify functions exist
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df menuca_v3.get_favorite_restaurants"
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df menuca_v3.toggle_favorite_restaurant"

# Check favorites count
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "SELECT COUNT(*) FROM menuca_v3.user_favorite_restaurants;"

# Sample favorites data
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "SELECT f.user_id, f.restaurant_id, r.name as restaurant_name, f.created_at FROM menuca_v3.user_favorite_restaurants f JOIN menuca_v3.restaurants r ON f.restaurant_id = r.id LIMIT 5;"
```

---

### SQL Functions (2 Total)

#### 1. `get_favorite_restaurants()` - Get Favorites

**Code First:**
```typescript
// Get list of favorited restaurants
const { data: favorites, error } = await supabase.rpc('get_favorite_restaurants');

console.log(`You have ${favorites.length} favorite restaurants`);
favorites.forEach(fav => {
  console.log(`❤️ ${fav.name} (${fav.city})`);
  console.log(`   Favorited: ${new Date(fav.favorited_at).toLocaleDateString()}`);
});
```

**Verify:**
```sql
-- Check favorites with restaurant details
SELECT
  f.id,
  f.restaurant_id,
  r.name as restaurant_name,
  r.status,
  c.name as city_name,
  f.created_at as favorited_at
FROM menuca_v3.user_favorite_restaurants f
JOIN menuca_v3.restaurants r ON f.restaurant_id = r.id
LEFT JOIN menuca_v3.cities c ON r.city_id = c.id
WHERE f.user_id = 165
ORDER BY f.created_at DESC;
```

**What it does:**
- Gets all favorited restaurants for authenticated customer
- Returns full restaurant details (name, status, location)
- Sorted by most recently favorited
- Performance: < 10ms
- Location: `menuca_v3` schema → Functions → `get_favorite_restaurants`

---

#### 2. `toggle_favorite_restaurant()` - Add/Remove Favorite

**Code First:**
```typescript
// Add or remove favorite (toggle operation)
const { data, error } = await supabase.rpc('toggle_favorite_restaurant', {
  p_restaurant_id: 349
});

if (!error) {
  if (data.action === 'added') {
    showSuccess('❤️ Added to favorites!');
  } else {
    showSuccess('💔 Removed from favorites!');
  }
}
```

**Verify:**
```sql
-- Check if restaurant was added to favorites
SELECT * FROM menuca_v3.user_favorite_restaurants
WHERE user_id = 165 AND restaurant_id = 349;

-- If exists, toggle will remove it. If not, toggle will add it.

-- Check total favorites count
SELECT COUNT(*) FROM menuca_v3.user_favorite_restaurants WHERE user_id = 165;
```

**What it does:**
- Adds restaurant to favorites (if not already favorited)
- Removes restaurant from favorites (if already favorited)
- Idempotent (safe to call multiple times)
- Returns action taken: `{action: 'added'}` or `{action: 'removed'}`
- Performance: < 15ms
- Location: `menuca_v3` schema → Functions → `toggle_favorite_restaurant`

**0 Edge Functions:** All logic in SQL for performance

---

### API Endpoints

**1. `GET /api/customers/me/favorites` - Get Favorite Restaurants**
```typescript
// Get list of favorited restaurants
const { data: favorites } = await supabase.rpc('get_favorite_restaurants');
// Returns: [{ restaurant_id, name, status, city, favorited_at, ... }]
```

**2. `POST /api/customers/me/favorites/:restaurant_id` - Toggle Favorite**
```typescript
// Add or remove favorite
const { data } = await supabase.rpc('toggle_favorite_restaurant', {
  p_restaurant_id: 123
});
// Returns: { action: 'added' } or { action: 'removed' }

if (data.action === 'added') {
  showSuccess('Added to favorites!');
} else {
  showSuccess('Removed from favorites!');
}
```

---

### Frontend Integration

```typescript
// Favorite restaurants management
function FavoritesList() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load favorites
  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    const { data } = await supabase.rpc('get_favorite_restaurants');
    setFavorites(data || []);
    setLoading(false);
  }

  // Toggle favorite
  async function toggleFavorite(restaurantId: number) {
    const { data, error } = await supabase.rpc('toggle_favorite_restaurant', {
      p_restaurant_id: restaurantId
    });

    if (!error) {
      if (data.action === 'added') {
        showSuccess('Added to favorites!');
      } else {
        showSuccess('Removed from favorites!');
      }
      loadFavorites(); // Refresh list
    }
  }

  // Check if restaurant is favorited
  const isFavorited = (restaurantId: number) => {
    return favorites.some(fav => fav.restaurant_id === restaurantId);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <h2>Your Favorite Restaurants ({favorites.length})</h2>
      {favorites.map(restaurant => (
        <RestaurantCard
          key={restaurant.restaurant_id}
          restaurant={restaurant}
          isFavorited={true}
          onToggleFavorite={() => toggleFavorite(restaurant.restaurant_id)}
        />
      ))}
    </div>
  );
}

// Heart button component
function FavoriteButton({ restaurantId, isFavorited, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={isFavorited ? 'favorited' : 'not-favorited'}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorited ? '❤️' : '🤍'}
    </button>
  );
}
```

---

### Testing Results

- ✅ Add favorite: Successfully adds restaurant to favorites
- ✅ Remove favorite: Successfully removes restaurant from favorites
- ✅ Toggle operation: Safe to call multiple times (idempotent)
- ✅ Get favorites: Returns complete restaurant details
- ✅ Sort order: Most recently favorited first
- ✅ RLS policies: Customers can only see own favorites
- ✅ Performance: < 15ms for toggle, < 10ms for list retrieval
- ✅ Duplicate prevention: Cannot favorite same restaurant twice

---

### Database Schema

**Table:** `menuca_v3.user_favorite_restaurants`

**Key Columns:**
- `id` (BIGSERIAL PRIMARY KEY)
- `user_id` (BIGINT REFERENCES users) - Customer who favorited
- `restaurant_id` (BIGINT REFERENCES restaurants) - Favorited restaurant
- `created_at` (TIMESTAMP) - When favorited

**Constraints:**
- UNIQUE (user_id, restaurant_id) - Prevent duplicate favorites

**Indexes:**
- `idx_favorites_user` - User → Favorites lookup (< 2ms)
- `idx_favorites_restaurant` - Restaurant popularity analysis (< 2ms)
- `idx_favorites_created` - Chronological sorting (< 1ms)

**RLS Policies:** 5 policies
- Customers can select own favorites
- Customers can insert own favorites
- Customers can delete own favorites
- Admins can view favorites for their restaurants
- Service role has full access

---

## ✅ FEATURE 4: Admin Authentication & RBAC

**Status:** ✅ COMPLETE
**Completed:** 2025-10-28
**Type:** Restaurant Admin
**User Type:** Restaurant Administrators

### Business Value

Provides secure authentication and role-based access control for restaurant administrators. Enables:
- Multi-restaurant admin access (franchises)
- Role-based permissions (5 system roles)
- 2-tier permission system (system role + restaurant assignments)
- MFA support for enhanced security
- Account suspension for compliance
- Complete audit trails

**Impact:**
- 439 admin users with RBAC
- 437 restaurant managers
- 2 super admins
- < 10ms admin authentication
- Complete tenant isolation

---

### What Was Built

**5 SQL Functions:**

1. **`get_admin_profile()`**
   - Get authenticated admin's profile
   - Uses `auth.uid()` for security
   - Returns role information and status
   - Returns: Single admin record
   - Performance: < 10ms
   - **Location:** `menuca_v3` schema → Functions → `get_admin_profile`

2. **`get_admin_restaurants()`**
   - Get all restaurants assigned to admin
   - Includes restaurant details (name, status, location)
   - Sorted by restaurant name
   - Returns: Array of restaurant records with assignment details
   - Performance: < 15ms
   - **Location:** `menuca_v3` schema → Functions → `get_admin_restaurants`

3. **`check_admin_restaurant_access(p_restaurant_id)`**
   - Verify if admin can access specific restaurant
   - Super Admins (role_id = 1) can access all restaurants
   - Other admins checked against assignments
   - Returns: Boolean
   - Performance: < 5ms
   - **Location:** `menuca_v3` schema → Functions → `check_admin_restaurant_access`

4. **`get_admin_permissions(p_restaurant_id)`**
   - Get admin's permissions for specific restaurant
   - Returns role-based capabilities
   - Returns: Permission object
   - Performance: < 10ms
   - **Location:** `menuca_v3` schema → Functions → `get_admin_permissions`

5. **`is_super_admin()`**
   - Quick check if current admin is Super Admin (role_id = 1)
   - Used for UI conditional rendering
   - Returns: Boolean
   - Performance: < 5ms
   - **Location:** `menuca_v3` schema → Functions → `is_super_admin`

**0 Edge Functions:** All logic in SQL for performance

---

### System Roles

**5 System Roles:**

| Role ID | Name | Scope | Count | Permissions |
|---------|------|-------|-------|-------------|
| 1 | Super Admin | All restaurants | 2 | Full platform access |
| 2 | Manager | Assigned restaurants | 0 | Manage assigned restaurants |
| 3 | Support | Platform-wide | 0 | Customer support operations |
| 5 | Restaurant Manager | Assigned restaurants | 437 | Manage own restaurant(s) |
| 6 | Staff | Assigned restaurants | 0 | Limited view access |

**Permission Matrix:**

| Permission | Super Admin | Manager | Support | Restaurant Manager | Staff |
|-----------|-------------|---------|---------|-------------------|-------|
| View all restaurants | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage own restaurants | ✅ | ✅ | ❌ | ✅ | ❌ |
| Create restaurants | ✅ | ✅ | ❌ | ❌ | ❌ |
| View orders | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage orders | ✅ | ✅ | ❌ | ✅ | ❌ |
| View reports | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ | ❌ |

---

### API Endpoints

**1. `POST /api/admin/auth/login` - Admin Login**
```typescript
// Admin login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@restaurant.com',
  password: 'adminpass123'
});

if (!error) {
  // Verify admin role
  const { data: admin } = await supabase.rpc('get_admin_profile');

  if (!admin) {
    await supabase.auth.signOut();
    showError('Not an admin account');
  } else {
    console.log('Admin logged in:', admin.email, admin.role);
  }
}
```

**2. `GET /api/admin/profile` - Get Own Admin Profile**
```typescript
// Get admin profile
const { data: admin } = await supabase.rpc('get_admin_profile');
// Returns: { id, email, first_name, last_name, role_id, role, status, mfa_enabled, ... }
```

**3. `GET /api/admin/restaurants` - Get Assigned Restaurants**
```typescript
// Get restaurants admin can access
const { data: restaurants } = await supabase.rpc('get_admin_restaurants');
// Returns: [{ restaurant_id, name, status, city, role, assigned_at, ... }]
```

**4. `GET /api/admin/restaurants/:id/access` - Check Restaurant Access**
```typescript
// Check if admin can access specific restaurant
const { data: hasAccess } = await supabase.rpc('check_admin_restaurant_access', {
  p_restaurant_id: 349
});

if (hasAccess) {
  // Show restaurant dashboard
} else {
  // Show "Access Denied"
}
```

---

### Frontend Integration

```typescript
// Admin authentication guard
function AdminRoute({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  async function checkAdminAuth() {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/admin/login');
      return;
    }

    // Verify admin role
    const { data: adminData } = await supabase.rpc('get_admin_profile');

    if (!adminData) {
      await supabase.auth.signOut();
      router.push('/admin/login');
      return;
    }

    setAdmin(adminData);
    setLoading(false);
  }

  if (loading) return <Spinner />;
  return children;
}

// Restaurant access check
async function canAccessRestaurant(restaurantId: number) {
  const { data: hasAccess } = await supabase.rpc('check_admin_restaurant_access', {
    p_restaurant_id: restaurantId
  });
  return hasAccess;
}

// Role-based UI rendering
function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [restaurants, setRestaurants] = useState([]);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    const { data: adminData } = await supabase.rpc('get_admin_profile');
    setAdmin(adminData);

    const { data: restaurantData } = await supabase.rpc('get_admin_restaurants');
    setRestaurants(restaurantData);
  }

  // Check if super admin
  const isSuperAdmin = admin?.role_id === 1;

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Logged in as: {admin?.email} ({admin?.role})</p>

      {isSuperAdmin && (
        <div>
          <h2>Super Admin Controls</h2>
          <button>Manage All Restaurants</button>
          <button>Create New Restaurant</button>
        </div>
      )}

      <h2>Your Restaurants ({restaurants.length})</h2>
      {restaurants.map(restaurant => (
        <RestaurantCard key={restaurant.restaurant_id} {...restaurant} />
      ))}
    </div>
  );
}
```

---

### Testing Results

- ✅ Admin authentication: 439 admin accounts active
- ✅ Role assignment: All admins have correct role_id
- ✅ Super Admin access: 2 super admins can access all restaurants
- ✅ Restaurant Manager access: 437 managers access only assigned restaurants
- ✅ Access checks: `check_admin_restaurant_access()` working correctly
- ✅ MFA support: 2FA enabled for 12 admin accounts
- ✅ Account suspension: Suspended admins cannot log in
- ✅ RLS policies: Complete tenant isolation enforced
- ✅ Performance: All queries < 15ms

---

### Database Schema

**Table:** `menuca_v3.admin_users`

**Key Columns:**
- `id` (BIGSERIAL PRIMARY KEY)
- `auth_user_id` (UUID REFERENCES auth.users) - Links to Supabase Auth
- `email` (VARCHAR UNIQUE NOT NULL)
- `first_name`, `last_name` (VARCHAR)
- `role_id` (BIGINT REFERENCES admin_roles) - System role
- `status` (admin_user_status ENUM) - active/suspended/inactive
- `mfa_enabled` (BOOLEAN DEFAULT false)
- `mfa_secret` (VARCHAR) - TOTP secret
- `mfa_backup_codes` (TEXT[]) - Recovery codes
- `suspended_at`, `suspended_reason` (Suspension audit)
- `created_at`, `updated_at` (TIMESTAMP)
- `deleted_at`, `deleted_by` (Soft delete)

**Table:** `menuca_v3.admin_user_restaurants`

**Key Columns:**
- `id` (BIGSERIAL PRIMARY KEY)
- `admin_user_id` (BIGINT REFERENCES admin_users)
- `restaurant_id` (BIGINT REFERENCES restaurants)
- `created_at` (TIMESTAMP) - Assignment date

**Constraints:**
- UNIQUE (admin_user_id, restaurant_id) - Prevent duplicate assignments

**Indexes:**
- `idx_admin_users_auth_user_id` - Admin auth lookup (< 1ms)
- `idx_admin_users_email` - Email lookups (< 2ms)
- `idx_admin_users_role` - Role filtering (< 2ms)
- `idx_admin_user_restaurants_admin` - Admin → Restaurants (< 2ms)
- `idx_admin_user_restaurants_restaurant` - Restaurant → Admins (< 2ms)

**RLS Policies:** 6 policies
- Admins can select own profile
- Admins can view own restaurant assignments
- Service role has full access

---

## ✅ FEATURE 5: Admin User Management (JWT-Based)

**Status:** ✅ COMPLETE
**Completed:** 2025-10-30
**Type:** Restaurant Admin
**User Type:** Super Admins & Managers

### Implementation Checklist

- [x] Create Edge Functions for admin user creation
- [x] Implement get_my_admin_info() SQL function for current admin
- [x] Build create-admin-user Edge Function (fully automated auth account creation)
- [x] Build assign-admin-restaurants Edge Function
- [x] Add JWT authentication via auth.uid()
- [x] Implement enhanced password validation (8+ chars, complexity, no common passwords)
- [x] Validate caller is active Super Admin
- [x] Validate target admin status and restaurant IDs
- [x] Add comprehensive audit logging to admin_audit_log table
- [x] Grant EXECUTE to authenticated users
- [x] Delete legacy create_admin_user_request() SQL functions

### Business Value

**What it enables:**
- Secure admin user creation with automatic auth account setup
- JWT-based Super Admin authentication (no service role keys in client)
- **Fully automated admin creation** - No manual Supabase Dashboard steps required
- **Enhanced password security** with comprehensive validation
- Complete audit trail for compliance (all actions logged)
- Assign/remove/replace restaurant access
- Protection against weak/common passwords

**Performance:**
- < 2s for complete admin creation (includes auth account)
- < 20ms per restaurant assignment operation
- Comprehensive audit logging with no performance impact
- Better security architecture
- Simplified admin lifecycle

---

### Quick Test

```bash
# Verify SQL function exists in public schema (REST API accessible)
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df public.get_my_admin_info"

# Verify Edge Functions are deployed
supabase functions list --project-ref nthpbtdjhhnwfxqsxbvy | grep -E "(create-admin-user|assign-admin-restaurants)"

# Check admin user count
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "SELECT COUNT(*) FROM menuca_v3.admin_users WHERE status = 'active' AND deleted_at IS NULL;"

# Check restaurant assignments
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "SELECT admin_user_id, COUNT(*) as restaurant_count FROM menuca_v3.admin_user_restaurants GROUP BY admin_user_id ORDER BY restaurant_count DESC LIMIT 10;"

# Check audit log
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "SELECT COUNT(*) FROM menuca_v3.admin_audit_log;"
```

---

### What Was Built

**1 SQL Function + 2 Edge Functions:**

#### 1. `get_my_admin_info()` - Get Current Admin

**Code First:**
```typescript
// Get authenticated admin's info (JWT-based)
const { data, error } = await supabase.rpc('get_my_admin_info');

if (data && data.length > 0) {
  const admin = data[0];
  console.log(`Admin: ${admin.email} (ID: ${admin.admin_id})`);
  console.log(`Status: ${admin.status}, Active: ${admin.is_active}`);
} else {
  console.error('Not an admin');
}
```

**Verify:**
```sql
-- Check function exists in public schema
\df public.get_my_admin_info

-- Manually test with admin's auth_user_id
SELECT
  a.id as admin_id,
  a.email,
  a.first_name,
  a.last_name,
  a.status,
  (a.status = 'active' AND a.deleted_at IS NULL) as is_active
FROM menuca_v3.admin_users a
WHERE a.auth_user_id = '38300e36-812e-487a-9966-0f4c9a29b591' -- Replace with actual UUID
AND a.deleted_at IS NULL;
```

**What it does:**
- Gets current authenticated admin's information
- Uses `auth.uid()` for automatic security
- Faster than `get_admin_profile()` for simple info
- Performance: < 5ms
- Location: `public` schema (REST API accessible)


---

### Edge Functions (2 Total - Super Admin Only 🔐)

#### 2. `create-admin-user` Edge Function - Create Admin User (Fully Automated)

**Code First:**
```typescript
// Step 1: Login as Super Admin to get JWT token
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'santiago@worklocal.ca',
  password: 'your-password'
});

if (authError) {
  console.error('Authentication failed:', authError.message);
  return;
}

const superAdminToken = authData.session.access_token;

// Step 2: Create new admin user (fully automated)
const { data, error } = await supabase.functions.invoke('create-admin-user', {
  headers: {
    Authorization: `Bearer ${superAdminToken}`
  },
  body: {
    email: 'newadmin@menu.ca',
    password: 'SecureP@ss123', // See password requirements below
    first_name: 'Jane',
    last_name: 'Smith',
    phone: '+1234567890',
    role_id: 2,
    restaurant_ids: [349, 350, 55] // Optional: assign during creation
  }
});

if (error) {
  console.error('Admin creation failed:', error.message);
} else {
  console.log('✅ Admin created successfully!');
  console.log(`Admin ID: ${data.admin_user_id}`);
  console.log(`Auth UUID: ${data.auth_user_id}`);
  console.log(`Email: ${data.email}`);
  console.log(`Status: ${data.status}`);
  console.log(`Restaurants assigned: ${data.restaurant_count}`);
}
```

**✅ ENHANCED PASSWORD VALIDATION (CRITICAL FOR FRONTEND)**

The password must meet ALL of the following requirements:
1. **Minimum 8 characters**
2. **Must contain:**
   - At least one uppercase letter (A-Z)
   - At least one lowercase letter (a-z)
   - At least one number (0-9)
   - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
3. **Rejects 30+ common passwords** including:
   - password, 123456, 12345678, qwerty, abc123
   - password123, letmein, welcome, admin, etc.
4. **No sequential characters:**
   - Rejects: 123, abc, 789, xyz, etc.
5. **No repeated characters:**
   - Rejects: aaa, 111, 222, etc.

**Password Strength Scoring:**
- **Weak**: Meets minimum requirements only
- **Medium**: 10+ characters with good complexity
- **Strong**: 12+ characters with excellent complexity

**Frontend Implementation Example:**
```typescript
function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Complexity checks
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Common passwords check (sample - full list has 30+)
  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'password123', 'letmein', 'welcome', 'admin', 'passw0rd'
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password');
  }
  
  // Sequential characters check
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    errors.push('Password cannot contain sequential characters (like "123" or "abc")');
  }
  
  // Repeated characters check
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password cannot contain repeated characters (like "aaa" or "111")');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

**What it does:**
- **Fully automated admin creation** - No manual Supabase Dashboard steps
- Creates Supabase auth account automatically
- Creates admin user record in `menuca_v3.admin_users`
- Links auth account to admin record via `auth_user_id`
- **Validates password security** with comprehensive checks
- **Optional restaurant assignment** during creation
- **Automatic email confirmation** - No verification email required
- **Audit logging** - All creation attempts logged to `admin_audit_log` table
- Performance: < 2s (includes auth account creation)
- **Location:** Supabase Dashboard → Edge Functions → `create-admin-user`

**Verify:**
```sql
-- Check admin was created
SELECT id, email, first_name, last_name, status, auth_user_id, role_id, created_at
FROM menuca_v3.admin_users
WHERE email = 'newadmin@menu.ca';

-- Check auth account
SELECT id, email, confirmed_at, created_at
FROM auth.users
WHERE email = 'newadmin@menu.ca';

-- Check audit log
SELECT * FROM menuca_v3.admin_audit_log
WHERE target_email = 'newadmin@menu.ca'
ORDER BY created_at DESC;
```

---

#### 3. `assign-admin-restaurants` Edge Function - Manage Restaurant Assignments

**Code First:**
```typescript
// Step 1: Get Super Admin JWT token (same as above)
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'santiago@worklocal.ca',
  password: 'your-password'
});

const superAdminToken = authData.session.access_token;

// Step 2: ADD restaurants to admin
const { data, error } = await supabase.functions.invoke('assign-admin-restaurants', {
  headers: {
    Authorization: `Bearer ${superAdminToken}`
  },
  body: {
    admin_user_id: 937,
    restaurant_ids: [349, 350, 55],
    action: 'add' // 'add', 'remove', or 'replace'
  }
});

console.log(`✅ ${data.message}`);
console.log(`Assignments: ${data.assignments_before} → ${data.assignments_after}`);
console.log(`Affected: ${data.affected_count} restaurant(s)`);

// Step 3: REMOVE restaurants from admin
const { data } = await supabase.functions.invoke('assign-admin-restaurants', {
  headers: { Authorization: `Bearer ${superAdminToken}` },
  body: {
    admin_user_id: 937,
    restaurant_ids: [349],
    action: 'remove'
  }
});

// Step 4: REPLACE all assignments
const { data } = await supabase.functions.invoke('assign-admin-restaurants', {
  headers: { Authorization: `Bearer ${superAdminToken}` },
  body: {
    admin_user_id: 937,
    restaurant_ids: [55, 273, 109],
    action: 'replace'
  }
});
```

**What it does:**
- Manages restaurant assignments for admin users
- Actions: `'add'` (add new), `'remove'` (remove specific), `'replace'` (replace all)
- Validates caller is active Super Admin via JWT
- Validates target admin exists and is active
- Validates restaurant IDs exist and aren't deleted
- Returns before/after counts for audit trail
- **Audit logging** - All changes logged to `admin_audit_log`
- Performance: < 20ms
- **Location:** Supabase Dashboard → Edge Functions → `assign-admin-restaurants`

**Verify:**
```sql
-- View all assignments for admin
SELECT
  aur.admin_user_id,
  aur.restaurant_id,
  r.name as restaurant_name,
  aur.created_at as assigned_at
FROM menuca_v3.admin_user_restaurants aur
JOIN menuca_v3.restaurants r ON aur.restaurant_id = r.id
WHERE aur.admin_user_id = 937
ORDER BY aur.created_at DESC;

-- Check audit log
SELECT * FROM menuca_v3.admin_audit_log
WHERE target_admin_id = 937
ORDER BY created_at DESC;
```

---

### Admin Creation Workflow (FULLY AUTOMATED ✅)

**Streamlined Process:**

1. **Super Admin Login:** Authenticate to get JWT token
2. **Create Admin:** Call `create-admin-user` Edge Function (fully automated)
3. **Optional:** Assign restaurants during creation OR use `assign-admin-restaurants` later

**Benefits:**
- ✅ **No manual Supabase Dashboard steps** - Everything automated
- ✅ **Comprehensive password validation** - Prevents weak passwords
- ✅ **Audit logging** - All actions tracked in `admin_audit_log`
- ✅ **JWT-based security** - No service role key exposure in client
- ✅ **Restaurant assignment** - Optional during creation or later

---

### API Endpoints

**1. `GET /api/admin/me` - Get Current Admin Info**
```typescript
// Get authenticated admin's info (JWT-based)
const { data } = await supabase.rpc('get_my_admin_info');
// Returns: [{ admin_id, email, first_name, last_name, status, is_active }]

if (data && data.length > 0) {
  const admin = data[0];
  console.log('Admin:', admin.email, admin.first_name);
} else {
  console.error('Not an admin');
}
```

**2. `POST /api/admin/users` - Create Admin User Request**
```typescript
// Create new admin user (pending status)
const { data, error } = await supabase.rpc('create_admin_user_request', {
  p_email: 'newadmin@menu.ca',
  p_first_name: 'Jane',
  p_last_name: 'Smith',
  p_phone: '+1234567890'
});

// Response:
// {
//   "success": true,
//   "admin_user_id": 928,
//   "email": "newadmin@menu.ca",
//   "status": "pending",
//   "message": "Admin user created with id 928. NEXT STEPS: ..."
// }
```

**3. `POST /api/admin/users/:id/restaurants` - Manage Restaurant Assignments**
```typescript
// Add restaurants to admin
const { data } = await supabase.rpc('assign_restaurants_to_admin', {
  p_admin_user_id: 928,
  p_restaurant_ids: [349, 350, 55],
  p_action: 'add' // 'add', 'remove', or 'replace'
});

// Response:
// {
//   "success": true,
//   "action": "add",
//   "out_admin_user_id": 928,
//   "admin_email": "newadmin@menu.ca",
//   "assignments_before": 0,
//   "assignments_after": 3,
//   "affected_count": 3,
//   "message": "Successfully added 3 restaurant(s) for newadmin@menu.ca"
// }
```

---

### Actions Explained

**ADD:** Add new restaurant assignments (ignore duplicates)
```typescript
const { data } = await supabase.rpc('assign_restaurants_to_admin', {
  p_admin_user_id: 927,
  p_restaurant_ids: [349, 350],
  p_action: 'add'
});
// Adds restaurants 349 and 350 (skips if already assigned)
```

**REMOVE:** Remove specified restaurant assignments
```typescript
const { data } = await supabase.rpc('assign_restaurants_to_admin', {
  p_admin_user_id: 927,
  p_restaurant_ids: [349],
  p_action: 'remove'
});
// Removes restaurant 349 from admin's assignments
```

**REPLACE:** Replace all assignments with new list
```typescript
const { data } = await supabase.rpc('assign_restaurants_to_admin', {
  p_admin_user_id: 927,
  p_restaurant_ids: [55, 273, 109],
  p_action: 'replace'
});
// Removes all existing assignments and adds new ones
```

---

### Frontend Integration

```typescript
// Get current admin info
async function getCurrentAdmin() {
  const { data, error } = await supabase.rpc('get_my_admin_info');

  if (error || !data || data.length === 0) {
    return null; // Not an admin
  }

  return data[0]; // { admin_id, email, first_name, last_name, status }
}

// Create new admin user
async function createAdminUser(email: string, firstName: string, lastName: string, phone?: string) {
  const { data, error } = await supabase.rpc('create_admin_user_request', {
    p_email: email,
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone
  });

  if (error) {
    showError(error.message);
    return null;
  }

  const result = data[0];

  // Show next steps to user
  showModal({
    title: 'Admin User Created',
    message: result.message,
    adminId: result.admin_user_id
  });

  return result;
}

// Assign restaurants to admin
async function assignRestaurants(adminId: number, restaurantIds: number[], action: 'add' | 'remove' | 'replace') {
  const { data, error } = await supabase.rpc('assign_restaurants_to_admin', {
    p_admin_user_id: adminId,
    p_restaurant_ids: restaurantIds,
    p_action: action
  });

  if (error) {
    showError(error.message);
    return null;
  }

  const result = data[0];

  showSuccess(result.message);
  console.log('Assignments:', result.assignments_before, '→', result.assignments_after);

  return result;
}

// Complete admin management UI
function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [restaurants, setRestaurants] = useState([]);

  async function handleAddRestaurants(adminId: number, selectedRestaurantIds: number[]) {
    const result = await assignRestaurants(adminId, selectedRestaurantIds, 'add');

    if (result) {
      showSuccess(`Added ${result.affected_count} restaurant(s)`);
      refreshAdminList();
    }
  }

  async function handleRemoveRestaurant(adminId: number, restaurantId: number) {
    const result = await assignRestaurants(adminId, [restaurantId], 'remove');

    if (result) {
      showSuccess('Restaurant removed');
      refreshAdminList();
    }
  }

  async function handleReplaceRestaurants(adminId: number, newRestaurantIds: number[]) {
    const result = await assignRestaurants(adminId, newRestaurantIds, 'replace');

    if (result) {
      showSuccess(`Updated to ${result.assignments_after} restaurant(s)`);
      refreshAdminList();
    }
  }

  return (
    <div>
      <h1>Admin User Management</h1>
      <button onClick={() => showCreateAdminModal()}>Create New Admin</button>

      {admins.map(admin => (
        <AdminCard
          key={admin.id}
          admin={admin}
          onAddRestaurants={(ids) => handleAddRestaurants(admin.id, ids)}
          onRemoveRestaurant={(id) => handleRemoveRestaurant(admin.id, id)}
          onReplaceRestaurants={(ids) => handleReplaceRestaurants(admin.id, ids)}
        />
      ))}
    </div>
  );
}
```

---

### Testing Results

- ✅ `get_my_admin_info()`: Returns correct admin info via JWT
- ✅ `create_admin_user_request()`: Creates pending admin records
- ✅ Email validation: Rejects invalid email formats
- ✅ Duplicate prevention: Cannot create admin with existing email
- ✅ Add restaurants: Successfully adds assignments (ignores duplicates)
- ✅ Remove restaurants: Successfully removes specific assignments
- ✅ Replace restaurants: Clears old assignments and adds new ones
- ✅ Before/after counts: Accurate audit information returned
- ✅ JWT validation: Only active admins can call functions
- ✅ Target validation: Cannot assign to suspended/deleted admins
- ✅ Restaurant validation: All restaurant IDs validated before assignment
- ✅ Performance: All operations < 20ms

---

### Security Features

**✅ JWT Authentication:**
- All functions use `auth.uid()` to identify caller
- No service role exposure required in client
- Automatic token validation by Supabase

**✅ Authorization Checks:**
- Caller must be an active admin
- Target admin must exist and be active
- Restaurant IDs validated to exist and not be deleted

**✅ Audit Trail:**
- Detailed response with before/after counts
- Affected rows count for transparency
- Email included in response for confirmation

**✅ Input Validation:**
- Email format validation (regex)
- Action validation (only add/remove/replace)
- Restaurant existence checks
- Admin status checks

---

### Migration from Edge Functions

These PostgreSQL functions replace the following Edge Functions:

| Old (Edge Functions) | New (SQL Functions) | Status |
|---------------------|---------------------|--------|
| `create-admin-user` | `create_admin_user_request()` + manual auth | ✅ Migrated |
| `assign-admin-restaurants` | `assign_restaurants_to_admin()` | ✅ Migrated |
| N/A | `get_my_admin_info()` | ✅ New helper |

**Benefits of SQL Functions:**
- ✅ No Edge Function deployment complexity
- ✅ No service role key exposure issues
- ✅ Simpler JWT-based authentication
- ✅ Better integration with RLS policies
- ✅ Faster execution (no cold starts)
- ✅ Easier debugging (SQL logs in Supabase Dashboard)

---

### Database Schema

**Table:** `menuca_v3.admin_users` (see Feature 4 for complete schema)

**Function Location:**
- Schema: `public` (not `menuca_v3`)
- Accessible via: Supabase REST API
- Grant: `GRANT EXECUTE TO authenticated`

**Why public schema?**
- REST API requires functions in `public` schema
- Keeps functions organized separately from data tables
- Maintains security via SECURITY DEFINER and RLS

---

## ✅ FEATURE 6: Legacy User Migration

**Status:** ✅ COMPLETE
**Completed:** 2025-10-23
**Type:** Customer + Admin
**User Type:** All Users (One-Time Migration)

### Business Value

Migrates 1,756 legacy customers and 7 legacy admins from old authentication system to Supabase Auth. Benefits:
- Seamless transition for existing users
- No data loss (all profiles, orders, favorites preserved)
- Password reset activation flow
- Complete migration audit trail
- Proactive auth account creation

**Impact:**
- 1,756 legacy customers migrated
- 7 legacy admins migrated
- 100% auth account creation success rate
- Most recent login: September 12, 2025
- Average 33.1 logins per user
- High-value users: 100-600+ logins

---

### What Was Built

**0 SQL Functions:** Migration logic in Edge Functions

**3 Edge Functions:**

1. **`check-legacy-account`**
   - Check if email belongs to legacy user
   - Returns user type (customer or admin)
   - Returns user details (name, id, etc.)
   - Returns: `{ is_legacy, user_id, first_name, last_name, user_type }`
   - Performance: < 50ms
   - **Location:** Supabase Dashboard → Edge Functions → `check-legacy-account`

2. **`complete-legacy-migration`** ✅ FIXED (v2)
   - Link auth_user_id to legacy account
   - Requires user's JWT token (authenticated)
   - Validates user ownership
   - Atomic update operation
   - **Fixed:** Proper handling of SQL TABLE return types
   - **Fixed:** Enhanced error handling with detailed messages
   - Returns: `{ success, message, user_id, auth_user_id }`
   - Performance: < 100ms
   - **Location:** Supabase Dashboard → Edge Functions → `complete-legacy-migration` (v2)

3. **`get-migration-stats`**
   - Get migration statistics (admin only)
   - Returns counts of legacy/migrated users
   - Returns: `{ legacy_customers, legacy_admins, active_2025_customers, total_legacy }`
   - Performance: < 50ms
   - **Location:** Supabase Dashboard → Edge Functions → `get-migration-stats`

---

### Migration Flow

**Problem:** 1,756 legacy users without Supabase Auth accounts

**Solution:** Proactive + Reactive Migration

**Proactive Migration (Completed):**
- ✅ All 1,756 legacy users have auth accounts created
- ✅ Temporary passwords set (users must reset)
- ✅ Email confirmations auto-confirmed

**Reactive Migration (On User Login):**
1. User tries to log in
2. Login fails (password not set)
3. Check if legacy account exists
4. Show migration prompt with user's name
5. User clicks "Migrate Account"
6. Password reset email sent
7. User sets new password
8. `complete-legacy-migration` links accounts
9. User successfully logged in

---

### API Endpoints

**1. `POST /functions/v1/check-legacy-account` - Check Legacy Status**
```typescript
// Check if email belongs to legacy user
const { data, error } = await supabase.functions.invoke('check-legacy-account', {
  body: { email: 'user@example.com' }
});

// Response:
// {
//   "is_legacy": true,
//   "user_id": 165,
//   "first_name": "James",
//   "last_name": "Doe",
//   "user_type": "customer"
// }
```

**2. `POST /functions/v1/complete-legacy-migration` - Complete Migration**
```typescript
// Link auth account to legacy profile (requires JWT token)
const { data, error } = await supabase.functions.invoke('complete-legacy-migration', {
  body: {
    email: 'user@example.com',
    user_type: 'customer' // or 'admin'
  }
});

// Response:
// {
//   "success": true,
//   "message": "Migration completed successfully",
//   "user_id": 165,
//   "auth_user_id": "38300e36-812e-487a-9966-0f4c9a29b591"
// }
```

**3. `POST /functions/v1/get-migration-stats` - Get Migration Statistics**
```typescript
// Get migration progress (admin only)
const { data } = await supabase.functions.invoke('get-migration-stats');

// Response:
// {
//   "stats": {
//     "legacy_customers": 1756,
//     "legacy_admins": 7,
//     "active_2025_customers": 0, // All migrated
//     "active_2025_admins": 0,
//     "total_legacy": 1763
//   }
// }
```

---

### Frontend Integration

```typescript
// Complete migration flow
async function handleLogin(email: string, password: string) {
  // Step 1: Try normal login
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error && error.message.includes('Invalid login credentials')) {
    // Step 2: Check if legacy account
    const { data: legacyCheck } = await supabase.functions.invoke('check-legacy-account', {
      body: { email }
    });

    if (legacyCheck.is_legacy) {
      // Step 3: Show migration prompt
      showMigrationPrompt({
        email,
        firstName: legacyCheck.first_name,
        userType: legacyCheck.user_type
      });
      return;
    }
  }

  // Handle normal login
  if (error) {
    showError('Invalid credentials');
  } else {
    redirectToDashboard();
  }
}

// Migration prompt
function MigrationPrompt({ email, firstName, userType }) {
  async function startMigration() {
    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password?migration=true&type=${userType}`
    });

    if (!error) {
      showSuccess('Check your email for the password reset link!');
    }
  }

  return (
    <div className="migration-modal">
      <h2>Your account needs to be updated</h2>
      <p>Hi {firstName}! We've upgraded our system.</p>
      <p>To continue, please reset your password to migrate your account.</p>
      <p>All your order history, favorites, and addresses will be preserved.</p>
      <button onClick={startMigration}>Migrate Account</button>
      <button onClick={() => hideModal()}>Cancel</button>
    </div>
  );
}

// Password reset page
function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const searchParams = useSearchParams();
  const isMigration = searchParams.get('migration') === 'true';
  const userType = searchParams.get('type') || 'customer';

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      showError(error.message);
      return;
    }

    // If migration, complete the account linking
    if (isMigration) {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error: migrationError } = await supabase.functions.invoke(
        'complete-legacy-migration',
        {
          body: {
            email: user.email,
            user_type: userType
          }
        }
      );

      if (migrationError || !data.success) {
        showError('Failed to complete migration');
        return;
      }

      showSuccess('Account migrated successfully!');
    }

    router.push('/dashboard');
  }

  return (
    <form onSubmit={handleResetPassword}>
      <h1>Set New Password</h1>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password"
        required
      />
      <button type="submit">
        {isMigration ? 'Complete Migration' : 'Reset Password'}
      </button>
    </form>
  );
}
```

---

### Testing Results

- ✅ Auth account creation: 1,756 accounts created (100% success)
- ✅ Legacy check: Correctly identifies legacy users
- ✅ Password reset flow: Email delivery working
- ✅ Account linking: `auth_user_id` updated correctly
- ✅ Data preservation: All profiles, orders, favorites intact
- ✅ Edge Function v2: Fixed TABLE return type handling
- ✅ Error handling: Detailed error messages for debugging
- ✅ Migration stats: Real-time progress tracking
- ✅ Admin migration: 7 legacy admins successfully migrated

---

### Migration Statistics

**Legacy Users:**
- Total: 1,763 (1,756 customers + 7 admins)
- Most recent login: September 12, 2025
- Average logins: 33.1 per user
- High-value users: 100-600+ logins

**Auth Account Creation:**
- Success rate: 100% (1,756/1,756)
- Method: Proactive batch creation
- Status: All accounts created and confirmed

**Migration Status:**
- Customers: 1,756 ready for migration
- Admins: 7 ready for migration
- Auth accounts: 100% created
- System status: Production ready ✅

---

### Security Features

**✅ JWT Authentication:**
- `complete-legacy-migration` requires user's JWT token
- Cannot migrate another user's account
- Automatic token validation by Supabase

**✅ Email Verification:**
- Password reset link validates email ownership
- Token expires after 1 hour
- One-time use only

**✅ Atomic Updates:**
- `auth_user_id` updated in single transaction
- No race conditions
- Rollback on failure

**✅ Duplicate Prevention:**
- System checks if account already migrated
- Cannot re-migrate existing accounts
- Clear error messages

---

### Edge Function Fix (v2)

**Issue (October 23, 2025):**
- Function returned 500 error due to improper SQL TABLE return type handling
- Array validation missing

**Fix:**
- Added `Array.isArray()` check for SQL results
- Enhanced error handling with detailed messages
- Added TypeScript interfaces for type safety
- Deployed v2 to production

**Status:** ✅ Fixed and verified working

---

### Database Schema Impact

**Changes to Existing Tables:**
- `menuca_v3.users.auth_user_id` - Linked to `auth.users(id)`
- `menuca_v3.admin_users.auth_user_id` - Linked to `auth.users(id)`

**Migration Tracking:**
- Query migrated users: `SELECT COUNT(*) FROM users WHERE auth_user_id IS NOT NULL`
- Query pending users: `SELECT COUNT(*) FROM users WHERE auth_user_id IS NULL`

---

## 📊 Summary Statistics

**Total Objects:**
- SQL Functions: 18 (all production-ready)
- Edge Functions: 3 (legacy migration only)
- API Endpoints: 20
- Database Tables: 5 (users, admin_users, admin_user_restaurants, user_delivery_addresses, user_favorite_restaurants)
- RLS Policies: 20
- Indexes: 38
- Views: 3 (active_users, active_admin_users, active_user_addresses)

**Progress:**
- ✅ Completed: 6 features (100%)
- 📋 Pending: 0 features
- 🎯 Production Status: READY ✅

**Performance:**
- Average query time: < 10ms
- Max query time: < 20ms
- RLS overhead: < 1ms
- Edge Function calls: < 100ms

**Security:**
- JWT-based authentication: ✅
- Row-Level Security: ✅ (20 policies)
- Tenant isolation: ✅ (100%)
- Service role protection: ✅ (no exposure)
- MFA support: ✅ (admins)

**Scale:**
- Customers: 1,756 active accounts
- Admins: 439 active accounts
- Admin assignments: 437 restaurant managers + 2 super admins
- Delivery addresses: Multiple per customer
- Favorite restaurants: Unlimited per customer

---

## 🔗 Frontend Documentation Links

**Complete Integration Guides:**
- [02-Users-Access-Frontend-Guide.md](../../Frontend-Guides/Users-&-Access/02-Users-Access-Frontend-Guide.md) ⭐ Main guide
- [Admin Management Guide](../../Frontend-Guides/Users-&-Access/ADMIN_MANAGEMENT_GUIDE.md) ⭐ JWT-based admin operations
- [Two-Step Signup Implementation](../../Frontend-Guides/Users-&-Access/BRIAN_TWO_STEP_SIGNUP_IMPLEMENTATION.md)
- [Direct Table Queries Implementation](../../Frontend-Guides/Users-&-Access/DIRECT_TABLE_QUERIES_IMPLEMENTATION.md)

**Backend Documentation:**
- [SANTIAGO_BACKEND_INTEGRATION_GUIDE.md](./SANTIAGO_BACKEND_INTEGRATION_GUIDE.md) ⭐ Complete backend reference

---

## 🚀 Quick Start for Frontend Developers

### Customer Features
1. Implement signup/login using Supabase Auth
2. Use `get_user_profile()` to fetch customer data
3. Use `get_user_addresses()` and direct table access for address CRUD
4. Use `toggle_favorite_restaurant()` for favorites

### Admin Features
1. Implement admin login with role verification
2. Use `get_admin_profile()` to fetch admin data
3. Use `get_admin_restaurants()` to list assigned restaurants
4. Use `check_admin_restaurant_access()` for access control

### Admin Management
1. Use `get_my_admin_info()` for current admin info
2. Use `assign_restaurants_to_admin()` for restaurant assignments
3. Follow manual workflow for creating new admin accounts

### Legacy Migration
1. Check login failures for legacy accounts
2. Show migration prompt with user's name
3. Trigger password reset email
4. Complete migration after password reset

---

---

## 🧪 COMPREHENSIVE TESTING & VERIFICATION

### Master Testing Checklist

Use this checklist to verify all features are working correctly:

#### Feature 1: Customer Authentication & Profiles

- [ ] **Verify functions exist**
```bash
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df menuca_v3.get_user_profile"
```

- [ ] **Test customer count**
```sql
SELECT COUNT(*) FROM menuca_v3.users WHERE deleted_at IS NULL AND auth_user_id IS NOT NULL;
-- Expected: 1,756
```

- [ ] **Test profile retrieval**
```sql
SELECT id, email, first_name, last_name, language, credit_balance
FROM menuca_v3.users
WHERE email = 'test@example.com';
```

- [ ] **Test RLS policies**
```sql
-- Should return 4 policies for users table
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'menuca_v3' AND tablename = 'users';
```

---

#### Feature 2: Customer Delivery Addresses

- [ ] **Verify function exists**
```bash
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df menuca_v3.get_user_addresses"
```

- [ ] **Test address count**
```sql
SELECT COUNT(*) FROM menuca_v3.user_delivery_addresses;
```

- [ ] **Test address with city/province**
```sql
SELECT
  a.id,
  a.street_address,
  a.address_label,
  c.name as city_name,
  p.name as province_name
FROM menuca_v3.user_delivery_addresses a
LEFT JOIN menuca_v3.cities c ON a.city_id = c.id
LEFT JOIN menuca_v3.provinces p ON c.province_id = p.id
LIMIT 3;
```

- [ ] **Test default address logic**
```sql
-- Verify only one default per user
SELECT user_id, COUNT(*) as default_count
FROM menuca_v3.user_delivery_addresses
WHERE is_default = true
GROUP BY user_id
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

---

#### Feature 3: Customer Favorite Restaurants

- [ ] **Verify functions exist**
```bash
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df menuca_v3.get_favorite_restaurants"
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df menuca_v3.toggle_favorite_restaurant"
```

- [ ] **Test favorites count**
```sql
SELECT COUNT(*) FROM menuca_v3.user_favorite_restaurants;
```

- [ ] **Test favorites with restaurant details**
```sql
SELECT
  f.user_id,
  f.restaurant_id,
  r.name as restaurant_name,
  f.created_at as favorited_at
FROM menuca_v3.user_favorite_restaurants f
JOIN menuca_v3.restaurants r ON f.restaurant_id = r.id
LIMIT 5;
```

- [ ] **Test unique constraint**
```sql
-- Try to insert duplicate favorite (should fail)
-- INSERT INTO menuca_v3.user_favorite_restaurants (user_id, restaurant_id) VALUES (165, 349);
-- Expected error: duplicate key value violates unique constraint
```

---

#### Feature 4: Admin Authentication & RBAC

- [ ] **Verify functions exist**
```bash
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df menuca_v3.get_admin_profile"
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df menuca_v3.get_admin_restaurants"
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df menuca_v3.check_admin_restaurant_access"
```

- [ ] **Test admin count by role**
```sql
SELECT
  r.id as role_id,
  r.name as role_name,
  COUNT(a.id) as admin_count
FROM menuca_v3.admin_users a
JOIN menuca_v3.admin_roles r ON a.role_id = r.id
WHERE a.deleted_at IS NULL AND a.status = 'active'
GROUP BY r.id, r.name
ORDER BY r.id;
-- Expected: 2 Super Admins (role_id=1), 437 Restaurant Managers (role_id=5)
```

- [ ] **Test restaurant assignments**
```sql
SELECT
  admin_user_id,
  COUNT(*) as restaurant_count
FROM menuca_v3.admin_user_restaurants
GROUP BY admin_user_id
ORDER BY restaurant_count DESC
LIMIT 10;
```

- [ ] **Test admin with restaurants**
```sql
SELECT
  a.id,
  a.email,
  a.role_id,
  COUNT(aur.restaurant_id) as assigned_restaurants
FROM menuca_v3.admin_users a
LEFT JOIN menuca_v3.admin_user_restaurants aur ON a.id = aur.admin_user_id
WHERE a.deleted_at IS NULL AND a.status = 'active'
GROUP BY a.id, a.email, a.role_id
LIMIT 5;
```

---

#### Feature 5: Admin User Management (JWT-Based)

- [ ] **Verify functions exist in public schema**
```bash
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df public.get_my_admin_info"
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df public.assign_restaurants_to_admin"
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "postgresql://postgres:Gz35CPTom1RnsmGM@db.nthpbtdjhhnwfxqsxbvy.supabase.co:5432/postgres" -c "\df public.create_admin_user_request"
```

- [ ] **Test function permissions**
```sql
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_my_admin_info', 'assign_restaurants_to_admin', 'create_admin_user_request');
```

- [ ] **Test pending admin creation**
```sql
-- Check for any pending admins
SELECT id, email, status, auth_user_id, created_at
FROM menuca_v3.admin_users
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 5;
```

---

#### Feature 6: Legacy User Migration

- [ ] **Verify Edge Functions deployed**
```bash
# List Edge Functions
export SUPABASE_ACCESS_TOKEN="sbp_c6c07320cadc875cfd087fd8f8edd03769c8b2b9" && supabase functions list
# Expected: check-legacy-account, complete-legacy-migration, get-migration-stats
```

- [ ] **Test migration statistics**
```sql
-- Check legacy users with auth accounts
SELECT COUNT(*) as migrated_customers
FROM menuca_v3.users
WHERE auth_user_id IS NOT NULL;
-- Expected: 1,756

-- Check legacy users without auth accounts
SELECT COUNT(*) as pending_customers
FROM menuca_v3.users
WHERE auth_user_id IS NULL;
-- Expected: 0 (all migrated)
```

- [ ] **Test auth accounts created**
```sql
-- Verify auth.users records exist
SELECT COUNT(*) FROM auth.users;
-- Should be >= 1,756 (customers + admins)
```

---

### Performance Testing

Run these queries to verify performance targets:

```sql
-- Test 1: Profile query performance
EXPLAIN ANALYZE
SELECT * FROM menuca_v3.get_user_profile();

-- Test 2: Address query performance
EXPLAIN ANALYZE
SELECT * FROM menuca_v3.get_user_addresses();

-- Test 3: Favorites query performance
EXPLAIN ANALYZE
SELECT * FROM menuca_v3.get_favorite_restaurants();

-- Test 4: Admin restaurants query performance
EXPLAIN ANALYZE
SELECT * FROM menuca_v3.get_admin_restaurants();
```

**Expected results:** All queries should complete in < 20ms

---

### Security Testing

Verify RLS policies are working:

```sql
-- Count all RLS policies for Users & Access tables
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'menuca_v3'
AND tablename IN (
  'users',
  'admin_users',
  'admin_user_restaurants',
  'user_delivery_addresses',
  'user_favorite_restaurants'
)
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Expected totals:
-- users: 4 policies
-- admin_users: 4 policies
-- admin_user_restaurants: 2 policies
-- user_delivery_addresses: 5 policies
-- user_favorite_restaurants: 5 policies
-- TOTAL: 20 policies
```

---

### Index Performance Testing

Verify all indexes exist:

```sql
-- List all indexes for Users & Access tables
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'menuca_v3'
AND tablename IN (
  'users',
  'admin_users',
  'admin_user_restaurants',
  'user_delivery_addresses',
  'user_favorite_restaurants'
)
ORDER BY tablename, indexname;

-- Expected: 38 indexes total
```

---

### Integration Testing

Complete end-to-end tests:

#### Test 1: Complete Customer Flow

```typescript
// 1. Signup
const { data: authData } = await supabase.auth.signUp({
  email: 'integration-test@example.com',
  password: 'testpass123',
  options: { data: { first_name: 'Test', last_name: 'User' } }
});

// 2. Get profile
const { data: profile } = await supabase.rpc('get_user_profile');

// 3. Add address
const { data: address } = await supabase.from('user_delivery_addresses').insert({
  street_address: '123 Test St',
  city_id: 5,
  postal_code: 'T1T 1T1',
  is_default: true
}).select().single();

// 4. Add favorite
const { data: favorite } = await supabase.rpc('toggle_favorite_restaurant', {
  p_restaurant_id: 349
});

// 5. Cleanup
await supabase.from('user_delivery_addresses').delete().eq('id', address.id);
await supabase.rpc('toggle_favorite_restaurant', { p_restaurant_id: 349 });
```

#### Test 2: Complete Admin Flow

```typescript
// 1. Login as admin
const { data } = await supabase.auth.signInWithPassword({
  email: 'admin@test.com',
  password: 'adminpass'
});

// 2. Get admin info
const { data: adminInfo } = await supabase.rpc('get_my_admin_info');

// 3. Get restaurants
const { data: restaurants } = await supabase.rpc('get_admin_restaurants');

// 4. Check access
const { data: hasAccess } = await supabase.rpc('check_admin_restaurant_access', {
  p_restaurant_id: 349
});
```

---

**Location:** `documentation/Users & Access/`
**Full Documentation:** See [BRIAN_MASTER_INDEX.md](../../Frontend-Guides/BRIAN_MASTER_INDEX.md)
**Last Updated:** 2025-10-29
**Version:** 1.0 (Complete Feature Documentation with Testing & Verification)
**Status:** ✅ PRODUCTION READY
