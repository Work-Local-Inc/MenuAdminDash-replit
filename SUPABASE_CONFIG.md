# SUPABASE CONFIGURATION REFERENCE

## CRITICAL: READ THIS BEFORE ANY SUPABASE WORK

**📖 See also:** [Supabase Best Practices Guide](lib/Documentation/SUPABASE_BEST_PRACTICES.md) - Comprehensive guide covering code organization, security, performance, and common pitfalls.

### Database Schema
**This project uses ONLY SUPABASE** (no Neon database).

The Supabase database uses the **`menuca_v3` schema** for ALL data:
- **ALL admin tables**: `admin_users`, `admin_roles`, `admin_user_restaurants`
- **ALL restaurant platform data**: restaurants, dishes, orders, users, etc.

**CRITICAL**: The `public` schema is NOT used. Everything is in `menuca_v3`.

**ALL Supabase clients MUST be configured with `db: { schema: 'menuca_v3' }` to access restaurant data.**

### Environment Variables & Secrets
```
NEXT_PUBLIC_SUPABASE_URL=<Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Anon/public key>
SUPABASE_SERVICE_ROLE_KEY=<Service role key for admin operations>
```

### Supabase Client Configuration Files

#### 1. Server-Side Client: `lib/supabase/server.ts`
```typescript
// CORRECT - Configure menuca_v3 schema for restaurant data
import { Database } from '@/types/supabase-database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'menuca_v3' },  // REQUIRED
      cookies: { /* ... */ }
    }
  )
}
```

#### 2. Browser Client: `lib/supabase/client.ts`
```typescript
// CORRECT - Configure menuca_v3 schema
import { Database } from '@/types/supabase-database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'menuca_v3' }  // REQUIRED
    }
  )
}
```

#### 3. Admin Client: `lib/supabase/admin.ts`
```typescript
// CORRECT - Configure menuca_v3 schema with service role
import { Database } from '@/types/supabase-database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'menuca_v3' }  // REQUIRED
    }
  )
}
```

#### 4. Middleware: `middleware.ts`
```typescript
// CORRECT - Configure menuca_v3 schema
import { Database } from '@/types/supabase-database'

const supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: { schema: 'menuca_v3' },  // REQUIRED
    cookies: { /* ... */ }
  }
)
```

### Key Tables

**ALL tables are in `menuca_v3` schema**:

**Admin tables**:
- `admin_users` (ID type: **INTEGER**, auth_uuid: **UUID**)
- `admin_roles`
- `admin_user_restaurants`

**Restaurant platform data**:
- `restaurants` (ID type: **INTEGER**, not UUID)
- `courses` (menu categories)
- `dishes` (menu items)
- `dish_prices`
- `modifier_groups`
- `dish_modifiers`
- `orders`
- `users` (customers)
- All other restaurant ordering platform tables

### Restaurant ID Data Type
**CRITICAL**: Restaurant IDs are **INTEGERS**, not UUIDs.
- Primary key: `id` (integer)
- Also has: `uuid` (string, for compatibility)

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://nthpbtdjhhnwfxqsxbvy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_BRANCH_DB_URL=<direct PostgreSQL connection>
```

**IGNORE** `DATABASE_URL` - this is an old Neon database that is NOT being used.

### Querying Data
```typescript
// ✅ CORRECT - Schema configured in client, use integer IDs
const { data } = await supabase
  .from('restaurants')
  .select('*')
  .eq('id', 123)  // Integer ID
  .single()

// ❌ WRONG - Don't manually specify schema in query
const { data } = await supabase
  .from('menuca_v3.restaurants')  // DON'T DO THIS
```

### REMINDER BEFORE EVERY SUPABASE CHANGE
1. ✅ ALL clients must have `db: { schema: 'menuca_v3' }`
2. ✅ Restaurant IDs are integers, not UUIDs
3. ✅ Only Supabase database exists (ignore DATABASE_URL)
4. ✅ Santiago spent 4 weeks migrating everything to Supabase
5. ✅ Test the changes before claiming success

### Last Updated
October 31, 2025
