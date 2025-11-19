# Service Role Implementation Guide - Super Admin Operations

**Purpose:** Guide for implementing secure super admin operations using Supabase Service Role
**Created:** October 28, 2025
**Status:** Production Ready
**Security Level:** 🔴 CRITICAL - Service Role Access

---

## 🎯 Overview

This guide explains how to securely implement super admin functionality for managing admin users and restaurant assignments using Supabase's service role key.

### What is the Service Role?

**Supabase provides THREE API keys:**

| Key Type | Access Level | Use Case | Security |
|----------|--------------|----------|----------|
| **Anon Key** | Public | Client-side apps | ✅ Safe to expose - RLS enforced |
| **Authenticated Key** | User-specific | Logged-in users | ✅ Safe - RLS enforced per user |
| **Service Role Key** | FULL ACCESS | Server-side admin ops | 🔴 NEVER expose - Bypasses ALL RLS |

**Service Role Key:**
- Bypasses ALL Row-Level Security (RLS) policies
- Has complete database access (read/write/delete)
- Can access `auth.users` table directly
- Should ONLY be used server-side
- **NEVER expose in frontend code**

---

## 🏗️ Architecture Options

### Option 1: Next.js API Routes (Recommended)

**Best for:** React/Next.js applications

```
┌─────────────────┐
│  Frontend UI    │  (Next.js Client Component)
│  - Super Admin  │  - Uses anon key only
│    Dashboard    │  - Makes requests to /api routes
└────────┬────────┘
         │
         │ HTTP Request
         ▼
┌─────────────────┐
│  Next.js API    │  (Server-Side)
│  Routes         │  - Uses service role key
│  /api/admin/*   │  - Calls Edge Functions
└────────┬────────┘
         │
         │ Edge Function Call
         ▼
┌─────────────────┐
│  Supabase Edge  │  (Validates service role)
│  Functions      │  - create-admin-user
│                 │  - assign-admin-restaurants
└─────────────────┘
```

**Directory Structure:**
```
app/
├── api/
│   └── admin/
│       ├── create-user/
│       │   └── route.ts          # POST /api/admin/create-user
│       └── assign-restaurants/
│           └── route.ts          # POST /api/admin/assign-restaurants
├── admin/
│   └── users/
│       ├── page.tsx              # Admin user management UI
│       └── components/
│           ├── CreateAdminForm.tsx
│           └── AssignRestaurantsForm.tsx
└── layout.tsx
```

**Example: `/app/api/admin/create-user/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // From .env.local (never committed)
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the requesting user is a Super Admin
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create anon client to verify user token
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // 2. Check if user is Super Admin (role_id = 1)
    const { data: adminUser } = await supabaseAdmin
      .from('admin_users')
      .select('id, role_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!adminUser || adminUser.role_id !== 1) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { email, password, first_name, last_name, restaurant_ids } = body;

    // 4. Call Edge Function with service role key
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-admin-user`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          first_name,
          last_name,
          restaurant_ids
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(result, { status: response.status });
    }

    // 5. Log admin action for audit trail
    await supabaseAdmin.from('admin_action_logs').insert({
      admin_user_id: adminUser.id,
      action: 'create_admin_user',
      resource_type: 'admin_users',
      resource_id: result.admin_user_id,
      metadata: {
        email,
        restaurants_assigned: result.restaurants_assigned
      }
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Frontend Component: `/app/admin/users/components/CreateAdminForm.tsx`**
```typescript
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function CreateAdminForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const first_name = formData.get('first_name') as string;
    const last_name = formData.get('last_name') as string;

    try {
      // Get current user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call our API route (server-side)
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          first_name,
          last_name
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create admin');
      }

      alert(`Admin user created successfully! ID: ${result.admin_user_id}`);
      e.currentTarget.reset();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">Create Admin User</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          name="email"
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">First Name</label>
          <input
            type="text"
            name="first_name"
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Last Name</label>
          <input
            type="text"
            name="last_name"
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Admin User'}
      </button>
    </form>
  );
}
```

---

### Option 2: Express.js Backend

**Best for:** Separate backend API server

```typescript
// server.ts
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Middleware to verify Super Admin
async function verifySuperAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify token and check role
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { data: adminUser } = await supabaseAdmin
    .from('admin_users')
    .select('id, role_id')
    .eq('auth_user_id', user.id)
    .single();

  if (!adminUser || adminUser.role_id !== 1) {
    return res.status(403).json({ error: 'Forbidden - Super Admin required' });
  }

  req.user = user;
  req.adminUser = adminUser;
  next();
}

// Create admin user
app.post('/admin/create-user', verifySuperAdmin, async (req, res) => {
  try {
    const { email, password, first_name, last_name, restaurant_ids } = req.body;

    const response = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/create-admin-user`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          first_name,
          last_name,
          restaurant_ids
        })
      }
    );

    const result = await response.json();
    res.status(response.status).json(result);

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

---

## 🔐 Environment Variables

**`.env.local` (Next.js) or `.env` (Node.js):**
```env
# Public (safe to expose in browser)
NEXT_PUBLIC_SUPABASE_URL=https://nthpbtdjhhnwfxqsxbvy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Private (NEVER expose - server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
```

**Getting Your Service Role Key:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `nthpbtdjhhnwfxqsxbvy`
3. Go to **Settings → API**
4. Find **service_role** key under "Project API keys"
5. Copy and add to `.env.local` (NEVER commit this file)

---

## 🛡️ Security Checklist

### ✅ DO:
- ✅ Use service role key ONLY in server-side code
- ✅ Store service role key in environment variables
- ✅ Verify user is Super Admin before allowing operations
- ✅ Add `.env.local` to `.gitignore`
- ✅ Log all admin actions for audit trail
- ✅ Use HTTPS in production
- ✅ Implement rate limiting on admin endpoints
- ✅ Add CORS restrictions if using separate backend

### ❌ DON'T:
- ❌ NEVER expose service role key in frontend code
- ❌ NEVER commit service role key to Git
- ❌ NEVER pass service role key in URL params
- ❌ NEVER allow non-Super Admins to access these endpoints
- ❌ NEVER skip user authentication checks
- ❌ NEVER log service role key in console/logs

---

## 📋 Complete Implementation Checklist

### Backend Setup:
- [ ] Create Next.js API routes or Express endpoints
- [ ] Add service role key to `.env.local`
- [ ] Implement Super Admin verification middleware
- [ ] Call Edge Functions with service role key
- [ ] Add audit logging for all operations
- [ ] Add rate limiting
- [ ] Test error handling

### Frontend Setup:
- [ ] Create Super Admin dashboard page
- [ ] Build CreateAdminForm component
- [ ] Build AssignRestaurantsForm component
- [ ] Implement user authentication check
- [ ] Add loading states and error handling
- [ ] Test with Super Admin account
- [ ] Verify non-Super Admins cannot access

### Security:
- [ ] Verify `.env.local` is in `.gitignore`
- [ ] Confirm service role key is not in frontend bundle
- [ ] Test that RLS is bypassed correctly
- [ ] Add rate limiting (10 requests/hour recommended)
- [ ] Enable CORS restrictions if needed
- [ ] Set up audit log monitoring

---

## 🚀 Deployment

### Vercel (Next.js):
1. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret)
2. Deploy normally
3. Verify API routes work in production

### Railway/Render (Node.js):
1. Add environment variables in platform settings
2. Ensure service role key is marked as secret
3. Deploy backend
4. Test endpoints

---

## 📊 Monitoring & Audit

**Log all admin operations:**
```sql
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id BIGINT REFERENCES menuca_v3.admin_users(id),
  action VARCHAR NOT NULL,
  resource_type VARCHAR NOT NULL,
  resource_id BIGINT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_action_logs_admin ON admin_action_logs(admin_user_id);
CREATE INDEX idx_admin_action_logs_action ON admin_action_logs(action);
CREATE INDEX idx_admin_action_logs_created ON admin_action_logs(created_at DESC);
```

**Query recent admin actions:**
```sql
SELECT
  l.action,
  a.email as admin_email,
  l.resource_type,
  l.resource_id,
  l.metadata,
  l.created_at
FROM admin_action_logs l
JOIN menuca_v3.admin_users a ON l.admin_user_id = a.id
ORDER BY l.created_at DESC
LIMIT 100;
```

---

## 🔍 Troubleshooting

### Error: "Unauthorized - Service role required"
- Verify service role key is correct
- Check that key is in Authorization header
- Ensure Edge Functions are checking for service role correctly

### Error: "Invalid token"
- Verify user is logged in
- Check that access token is being passed correctly
- Ensure token hasn't expired (refresh if needed)

### Error: "Forbidden - Super Admin required"
- Verify user has role_id = 1 in admin_users table
- Check that admin_user_id lookup is working
- Ensure admin account is not suspended

### Service role key not working:
- Regenerate key in Supabase dashboard if compromised
- Update environment variables everywhere
- Restart servers after updating env vars

---

## 📚 Additional Resources

- [Supabase Service Role Documentation](https://supabase.com/docs/guides/api/api-keys)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated:** October 28, 2025
**Status:** ✅ Production Ready
**Security Review:** Required before deployment
