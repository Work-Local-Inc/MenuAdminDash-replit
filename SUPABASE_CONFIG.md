# SUPABASE CONFIGURATION REFERENCE

## CRITICAL: READ THIS BEFORE ANY SUPABASE WORK

### Database Schema
**SCHEMA: `public`** (NOT `menuca_v3`)
- All tables exist in the `public` schema
- DO NOT configure `db: { schema: 'menuca_v3' }` in Supabase clients
- The default schema is `public` - use that

### Environment Variables & Secrets
```
NEXT_PUBLIC_SUPABASE_URL=<Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Anon/public key>
SUPABASE_SERVICE_ROLE_KEY=<Service role key for admin operations>
```

### Supabase Client Configuration Files

#### 1. Server-Side Client: `lib/supabase/server.ts`
```typescript
// CORRECT - No schema override, uses default 'public' schema
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { /* ... */ }
    }
  )
}
```

#### 2. Middleware: `middleware.ts`
```typescript
// CORRECT - No schema override, uses default 'public' schema
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: { /* ... */ }
  }
)
```

#### 3. Direct PostgreSQL: `lib/db/postgres.ts`
- Uses `pg` Pool for direct SQL queries
- Queries should target `menuca_v3` schema in SQL: `FROM menuca_v3.restaurants`
- But Supabase clients use `public` schema

### Key Tables (in `public` schema)
- `restaurants`
- `courses` (menu categories)
- `dishes` (menu items)
- `orders`
- `users`
- `admin_users`
- `admin_roles`

### REMINDER BEFORE EVERY SUPABASE CHANGE
1. ✅ Check this file first
2. ✅ Verify schema is `public` (default, no override)
3. ✅ Check environment variables are correct
4. ✅ Test the changes before claiming success
