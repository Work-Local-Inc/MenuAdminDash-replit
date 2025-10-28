# Admin User Management Guide

## Overview

This guide documents the secure PostgreSQL functions that replace Edge Functions for admin user management. These functions use JWT authentication and are accessible via the Supabase REST API.

## Available Functions

### 1. `get_my_admin_info()`

Returns information about the currently authenticated admin user.

**Authentication Required:** Yes (JWT token)

**REST API Endpoint:**
```bash
POST https://<project-ref>.supabase.co/rest/v1/rpc/get_my_admin_info
Headers:
  - apikey: <anon-key>
  - Authorization: Bearer <admin-jwt-token>
  - Content-Type: application/json
```

**Response:**
```json
[{
  "admin_id": 927,
  "email": "admin@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "status": "active",
  "is_active": true
}]
```

**Security:**
- Uses `auth.uid()` to identify the authenticated user
- Only returns data for the currently logged-in admin
- Validates admin is active and not deleted

---

### 2. `assign_restaurants_to_admin()`

Manage restaurant assignments for an admin user. Supports add, remove, and replace operations.

**Authentication Required:** Yes (JWT token from active admin)

**Parameters:**
- `p_admin_user_id` (BIGINT): The admin user ID to modify
- `p_restaurant_ids` (BIGINT[]): Array of restaurant IDs
- `p_action` (TEXT): One of 'add', 'remove', or 'replace'

**REST API Endpoint:**
```bash
POST https://<project-ref>.supabase.co/rest/v1/rpc/assign_restaurants_to_admin
Headers:
  - apikey: <anon-key>
  - Authorization: Bearer <admin-jwt-token>
  - Content-Type: application/json
Body:
{
  "p_admin_user_id": 927,
  "p_restaurant_ids": [349, 350, 55],
  "p_action": "add"
}
```

**Actions:**

**ADD:** Adds new restaurant assignments (ignores duplicates)
```json
{
  "p_admin_user_id": 927,
  "p_restaurant_ids": [349, 350],
  "p_action": "add"
}
```

**REMOVE:** Removes specified restaurant assignments
```json
{
  "p_admin_user_id": 927,
  "p_restaurant_ids": [349],
  "p_action": "remove"
}
```

**REPLACE:** Removes all existing assignments and adds new ones
```json
{
  "p_admin_user_id": 927,
  "p_restaurant_ids": [55, 273, 109],
  "p_action": "replace"
}
```

**Response:**
```json
[{
  "success": true,
  "action": "add",
  "out_admin_user_id": 927,
  "admin_email": "admin@example.com",
  "assignments_before": 0,
  "assignments_after": 2,
  "affected_count": 2,
  "message": "Successfully added 2 restaurant(s) for admin@example.com"
}]
```

**Security:**
- Caller must be an active admin (verified via `auth.uid()`)
- Target admin must exist and be active
- Validates all restaurant IDs exist and are not deleted
- Provides detailed audit information in response

---

### 3. `create_admin_user_request()`

Creates a pending admin user record. **Note:** This does NOT create the auth account.

**Authentication Required:** Yes (JWT token from active admin)

**Parameters:**
- `p_email` (TEXT): Admin email address
- `p_first_name` (TEXT): First name
- `p_last_name` (TEXT): Last name
- `p_phone` (TEXT, optional): Phone number

**REST API Endpoint:**
```bash
POST https://<project-ref>.supabase.co/rest/v1/rpc/create_admin_user_request
Headers:
  - apikey: <anon-key>
  - Authorization: Bearer <admin-jwt-token>
  - Content-Type: application/json
Body:
{
  "p_email": "newadmin@menu.ca",
  "p_first_name": "Jane",
  "p_last_name": "Smith",
  "p_phone": "+1234567890"
}
```

**Response:**
```json
[{
  "success": true,
  "admin_user_id": 928,
  "email": "newadmin@menu.ca",
  "status": "pending",
  "message": "Admin user created with id 928. NEXT STEPS: 1. Create auth account in Supabase Dashboard 2. Update admin_users.auth_user_id with the UUID 3. Update admin_users.status to active"
}]
```

**Security:**
- Caller must be an active admin
- Validates email format
- Prevents duplicate emails
- Creates user with 'pending' status

---

## Manual Process: Creating a New Admin User

Because Supabase doesn't allow creating auth users via client-side API, the admin creation process requires manual steps:

### Step 1: Create Admin User Request (Via API)

An existing active admin calls the `create_admin_user_request()` function:

```bash
curl -X POST "https://nthpbtdjhhnwfxqsxbvy.supabase.co/rest/v1/rpc/create_admin_user_request" \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "p_email": "newadmin@menu.ca",
    "p_first_name": "Jane",
    "p_last_name": "Smith",
    "p_phone": "+1234567890"
  }'
```

This creates a record in `menuca_v3.admin_users` with status='pending'.

### Step 2: Create Auth Account (Manual - Supabase Dashboard)

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/nthpbtdjhhnwfxqsxbvy/auth/users
2. Click "Add User" → "Create new user"
3. Enter the same email: `newadmin@menu.ca`
4. Set a temporary password (admin will reset on first login)
5. Check "Auto Confirm User" (or send confirmation email)
6. Click "Create user"
7. **Copy the UUID** of the newly created user (e.g., `38300e36-812e-487a-9966-0f4c9a29b591`)

### Step 3: Link Auth Account to Admin User (Database)

Update the admin user record with the auth UUID:

```sql
UPDATE menuca_v3.admin_users
SET
  auth_user_id = '38300e36-812e-487a-9966-0f4c9a29b591',
  status = 'active'
WHERE email = 'newadmin@menu.ca';
```

Or use psql:
```bash
psql "postgresql://postgres:<password>@<host>:5432/postgres" \
  -c "UPDATE menuca_v3.admin_users SET auth_user_id = '38300e36-812e-487a-9966-0f4c9a29b591', status = 'active' WHERE email = 'newadmin@menu.ca';"
```

### Step 4: Assign Restaurants (Via API)

An existing active admin can now assign restaurants to the new admin:

```bash
curl -X POST "https://nthpbtdjhhnwfxqsxbvy.supabase.co/rest/v1/rpc/assign_restaurants_to_admin" \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "p_admin_user_id": 928,
    "p_restaurant_ids": [349, 350, 55],
    "p_action": "add"
  }'
```

### Step 5: Send Credentials to New Admin

Send the new admin:
- Email: `newadmin@menu.ca`
- Temporary password (set in Step 2)
- Login URL: Your admin portal URL
- Instructions to reset password on first login

---

## Testing Guide

### Test 1: Get Admin Info

```bash
# 1. Login as admin to get JWT token
curl -X POST "https://nthpbtdjhhnwfxqsxbvy.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@menu.ca", "password": "your-password"}'

# 2. Extract access_token from response

# 3. Get admin info
curl -X POST "https://nthpbtdjhhnwfxqsxbvy.supabase.co/rest/v1/rpc/get_my_admin_info" \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json"
```

### Test 2: Add Restaurants

```bash
curl -X POST "https://nthpbtdjhhnwfxqsxbvy.supabase.co/rest/v1/rpc/assign_restaurants_to_admin" \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "p_admin_user_id": 927,
    "p_restaurant_ids": [349, 350],
    "p_action": "add"
  }'
```

### Test 3: Remove Restaurants

```bash
curl -X POST "https://nthpbtdjhhnwfxqsxbvy.supabase.co/rest/v1/rpc/assign_restaurants_to_admin" \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "p_admin_user_id": 927,
    "p_restaurant_ids": [349],
    "p_action": "remove"
  }'
```

### Test 4: Replace Restaurants

```bash
curl -X POST "https://nthpbtdjhhnwfxqsxbvy.supabase.co/rest/v1/rpc/assign_restaurants_to_admin" \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "p_admin_user_id": 927,
    "p_restaurant_ids": [55, 273, 109],
    "p_action": "replace"
  }'
```

---

## Security Considerations

### Authentication & Authorization

1. **JWT-Based Authentication**: All functions use `auth.uid()` to verify the caller is authenticated
2. **Admin Verification**: Functions verify the caller is an active admin before allowing any operations
3. **SECURITY DEFINER**: Functions run with elevated privileges but validate all inputs
4. **RLS Policies**: Row-level security policies enforce additional access controls

### Input Validation

1. **Email Format**: Email addresses are validated against regex pattern
2. **Restaurant Validation**: All restaurant IDs are validated to exist and not be deleted
3. **Admin Status Check**: Target admins must be active (not suspended/deleted)
4. **Action Validation**: Only 'add', 'remove', 'replace' actions are allowed

### Audit Trail

1. **Detailed Responses**: All functions return comprehensive information about changes made
2. **Assignments Tracking**: Before/after counts and affected rows are returned
3. **Error Messages**: Clear error messages for validation failures

### Best Practices

1. **Use HTTPS**: Always use HTTPS for API calls to protect JWT tokens
2. **Token Expiry**: JWT tokens expire after 1 hour by default
3. **Minimal Permissions**: Functions only grant necessary permissions (GRANT EXECUTE TO authenticated)
4. **No Service Role Exposure**: Client never needs service role key

---

## Migration from Edge Functions

These PostgreSQL functions replace the following Edge Functions:

| Edge Function | PostgreSQL Function | Status |
|--------------|---------------------|--------|
| `create-admin-user` | `create_admin_user_request()` | ✅ Replaced (partial - still needs manual auth creation) |
| `assign-admin-restaurants` | `assign_restaurants_to_admin()` | ✅ Fully replaced |
| N/A | `get_my_admin_info()` | ✅ New helper function |

**Benefits of PostgreSQL Functions:**
- No Edge Function deployment complexity
- No service role key exposure issues
- Simpler JWT-based authentication
- Better integration with RLS policies
- Faster execution (no cold starts)
- Easier debugging (SQL logs in Supabase Dashboard)

**Limitations:**
- Admin user creation still requires manual Supabase Dashboard step
- Cannot programmatically create auth users from client side

---

## Deployment

The functions are defined in `admin_functions_public.sql` and deployed to the `public` schema for REST API accessibility.

**Deploy/Update:**
```bash
psql "postgresql://postgres:<password>@<host>:5432/postgres" \
  -f "admin_functions_public.sql"
```

**Verify Deployment:**
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_my_admin_info',
  'assign_restaurants_to_admin',
  'create_admin_user_request'
);
```

---

## Support

For issues or questions:
1. Check function logs in Supabase Dashboard: https://supabase.com/dashboard/project/nthpbtdjhhnwfxqsxbvy/logs/postgres-logs
2. Review error messages returned by functions
3. Verify JWT token is valid and not expired
4. Ensure admin user is active (not suspended/deleted)

---

## Version History

- **v1.0** (2025-10-28): Initial implementation with JWT-based authentication
  - Created `get_my_admin_info()` helper function
  - Created `assign_restaurants_to_admin()` for managing assignments
  - Created `create_admin_user_request()` for admin creation workflow
  - Fixed type casting issues for varchar/enum columns
  - Fixed ambiguous column reference in RETURNS TABLE
