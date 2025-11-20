# ⚠️ READ THIS BEFORE ANY WORK ⚠️

## DATABASE CONFIGURATION

### THIS PROJECT USES SUPABASE (NOT REPLIT DATABASE)

**Critical Facts:**
1. **Database Provider:** Supabase PostgreSQL
2. **Schema:** `menuca_v3` (NOT `public`)
3. **Connection:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_BRANCH_DB_URL` (for direct psql)

### NEVER DO THESE:
- ❌ `check_database_status` (checks Replit DB, not Supabase)
- ❌ `create_postgresql_database_tool` (Supabase already provisioned)
- ❌ `execute_sql_tool` (use Supabase client instead)
- ❌ Assume schema is `public` (it's `menuca_v3`)

### ALWAYS DO THESE:
- ✅ Read `AGENT_MEMORY_BANK.md` at session start
- ✅ Use Supabase clients with `db: { schema: 'menuca_v3' }`
- ✅ Check AI-AGENTS-START-HERE docs before debugging
- ✅ Remember: 961 restaurants, 32K+ users in LIVE Supabase

### IF YOU SEE:
**"Database is not provisioned"** → IGNORE (that's Replit DB, we use Supabase)  
**"Relation menuca_v3.X does not exist"** → Schema config issue, check clients  
**"Cannot coerce result to single object"** → No data found (query issue, not DB issue)

---

## MANDATORY FIRST STEPS

When starting ANY work session:
1. Read this file ✅
2. Read `AGENT_MEMORY_BANK.md` ✅
3. Check `DATABASE_SCHEMA_QUICK_REF.md` for schema ✅
4. Verify Supabase client configs have `schema: 'menuca_v3'` ✅

---

## QUICK REFERENCE

**Restaurant Lookup:**
```typescript
const id = extractIdFromSlug('econo-pizza-1009') // 1009
const { data } = await supabase.from('restaurants').eq('id', id)
```

**Dish Pricing:**
```typescript
const { data } = await supabase
  .from('dish_prices')
  .eq('dish_id', dishId)
  .eq('size_variant', 'Small')
```

**Common Restaurant IDs:**
- econo-pizza-1009 → ID: 1009
- Test with REAL restaurants from database

---

**If you forget this information, you're breaking the entire workflow.**  
**Bookmark this file mentally. Read it FIRST. Every time.**
