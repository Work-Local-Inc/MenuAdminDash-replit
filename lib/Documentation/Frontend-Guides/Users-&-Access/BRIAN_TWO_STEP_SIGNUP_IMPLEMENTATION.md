# Two-Step Signup - Frontend Implementation Guide

**For:** Brian (Frontend Developer)  
**Date:** October 23, 2025  
**Backend Status:** ✅ **READY** (All permissions granted, trigger active)

---

## 🎯 **OBJECTIVE**

Implement a two-step signup flow that:
1. Creates user authentication (via Supabase Auth)
2. Updates user profile immediately after signup
3. Ensures `menuca_v3.users` has complete profile data

---

## 🏗️ **BACKEND SETUP (ALREADY COMPLETE)**

### **What's Already Working:**

✅ **Database Trigger:** `public.handle_new_user()`
- Automatically fires when user signs up
- Creates `menuca_v3.users` record
- Links `auth_user_id` to `auth.users`
- Sets defaults: `language: 'EN'`, `credit_balance: 0.00`

✅ **RLS Policies:** User can update their own profile
- `users_authenticated_update` policy allows self-updates
- Filters by `auth.uid() = auth_user_id`

✅ **Function Permissions:** All SQL functions now accessible via REST API
- `get_user_profile()` ✅
- `get_user_addresses()` ✅
- `get_favorite_restaurants()` ✅
- All others ✅

---

## 📋 **THE PROBLEM**

When you call `supabase.auth.signUp()` with metadata:

```typescript
await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      first_name: 'John',
      last_name: 'Doe',
      phone: '+15555551234'
    }
  }
});
```

**What happens:**
1. ✅ `auth.users` created
2. ✅ Trigger fires, creates `menuca_v3.users`
3. ❌ But `first_name`, `last_name`, `phone` are **empty**!

**Why?**  
Supabase Auth doesn't store custom metadata in `raw_user_meta_data`. The trigger can't access what isn't there.

---

## ✅ **THE SOLUTION: TWO-STEP SIGNUP**

### **Step 1:** Create auth account
```typescript
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password
});
```

### **Step 2:** Update profile immediately
```typescript
await supabase
  .from('users')
  .update({
    first_name: firstName,
    last_name: lastName,
    phone: phone
  })
  .eq('auth_user_id', data.user.id);
```

**Total time:** < 500ms  
**User experience:** Seamless (feels like one operation)

---

## 🛠️ **IMPLEMENTATION OPTIONS**

### **Option 1: Single Form (Recommended)** ⭐

Collect all data upfront, then do signup + update.

```typescript
// components/SignUpForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner'; // or your preferred toast library

interface SignUpFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export function SignUpForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Create auth account
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (signupError) {
        throw signupError;
      }

      if (!authData.user) {
        throw new Error('Signup failed - no user returned');
      }

      // Step 2: Update profile (trigger already created menuca_v3.users)
      const { error: profileError } = await supabase
        .from('users')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null
        })
        .eq('auth_user_id', authData.user.id);

      if (profileError) {
        console.error('Profile update failed:', profileError);
        // Don't throw - account is created, they can update profile later
        toast.warning('Account created, but profile update failed. You can complete your profile later.');
      } else {
        toast.success('Account created successfully! Please check your email to confirm.');
      }

      // Redirect to email confirmation page
      router.push('/auth/check-email');
      
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="you@example.com"
          required
          className="mt-1 block w-full rounded-md border px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="••••••••"
          required
          minLength={8}
          className="mt-1 block w-full rounded-md border px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          At least 8 characters
        </p>
      </div>

      <div>
        <label htmlFor="firstName" className="block text-sm font-medium">
          First Name
        </label>
        <input
          id="firstName"
          type="text"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          placeholder="John"
          required
          className="mt-1 block w-full rounded-md border px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="lastName" className="block text-sm font-medium">
          Last Name
        </label>
        <input
          id="lastName"
          type="text"
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          placeholder="Doe"
          required
          className="mt-1 block w-full rounded-md border px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium">
          Phone Number <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+1 (555) 123-4567"
          className="mt-1 block w-full rounded-md border px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

---

### **Option 2: Multi-Step Wizard**

If you prefer a stepped UX (auth first, then profile):

```typescript
// components/SignUpWizard.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function SignUpWizard() {
  const [step, setStep] = useState(1); // 1 = auth, 2 = profile
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAuthStep(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned');

      setAuthUserId(data.user.id);
      setStep(2); // Move to profile step
      toast.success('Account created! Now complete your profile.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileStep(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null
        })
        .eq('auth_user_id', authUserId);

      if (error) throw error;

      toast.success('Profile completed! Check your email to confirm.');
      router.push('/auth/check-email');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 1) {
    return (
      <form onSubmit={handleAuthStep}>
        <h2>Step 1: Create Account</h2>
        {/* Email and password inputs */}
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Continue'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleProfileStep}>
      <h2>Step 2: Complete Profile</h2>
      {/* First name, last name, phone inputs */}
      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Complete Signup'}
      </button>
    </form>
  );
}
```

---

### **Option 3: Composable Hook**

Create a reusable hook for signup logic:

```typescript
// hooks/useSignUp.ts
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SignUpParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export function useSignUp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signUp({ email, password, firstName, lastName, phone }: SignUpParams) {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Auth signup
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password
      });

      if (signupError) throw signupError;
      if (!authData.user) throw new Error('Signup failed');

      // Step 2: Update profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null
        })
        .eq('auth_user_id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // Don't throw - account exists
      }

      return { success: true, user: authData.user };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  return { signUp, loading, error };
}

// Usage in component:
// const { signUp, loading, error } = useSignUp();
// await signUp({ email, password, firstName, lastName, phone });
```

---

## 🧪 **TESTING**

### **Test Case 1: Successful Signup**

```typescript
// Test data
const testData = {
  email: 'test@worklocal.ca',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  phone: '+15555551234'
};

// Expected result:
// 1. auth.users created ✅
// 2. menuca_v3.users created ✅
// 3. Profile fields populated ✅
```

### **Test Case 2: Profile Update Fails**

```typescript
// What if Step 2 fails?
// - User account still exists in auth.users
// - menuca_v3.users exists but with empty profile
// - Show warning, don't block user
// - They can update profile later via settings
```

### **Test Case 3: Duplicate Email**

```typescript
// Supabase handles this automatically
// Returns error: "User already registered"
// Show appropriate error message
```

---

## 🔍 **VERIFICATION**

After signup, verify the profile was created correctly:

```typescript
// Get user profile
const { data: profile, error } = await supabase.rpc('get_user_profile');

console.log('Profile:', profile);
// Expected:
// {
//   user_id: 12345,
//   email: 'test@worklocal.ca',
//   first_name: 'Test',     ✅
//   last_name: 'User',      ✅
//   phone: '+15555551234',  ✅
//   credit_balance: '0.00',
//   language: 'EN'
// }
```

---

## ⚠️ **ERROR HANDLING**

### **Common Errors:**

#### **1. Email Already Registered**
```typescript
// Error: "User already registered"
// Action: Show "Email already in use. Try logging in instead."
```

#### **2. Weak Password**
```typescript
// Error: "Password should be at least 8 characters"
// Action: Show password requirements
```

#### **3. Profile Update Fails**
```typescript
// Error: RLS policy violation or network error
// Action: Don't block signup, show warning
// Allow user to update profile later in settings
```

#### **4. Network Error**
```typescript
// Error: "Failed to fetch"
// Action: Show "Network error. Please try again."
// Retry button
```

---

## 🎨 **UI/UX RECOMMENDATIONS**

### **Loading States:**

```typescript
{loading && <Spinner />}
{loading && 'Creating account...'}
{loading && 'Updating profile...'}
```

### **Success Messages:**

```typescript
toast.success('Account created! Check your email to confirm.');
```

### **Error Messages:**

```typescript
toast.error('Failed to create account: ' + error.message);
```

### **Progress Indicator (for multi-step):**

```typescript
<div className="steps">
  <div className={step === 1 ? 'active' : 'complete'}>1. Account</div>
  <div className={step === 2 ? 'active' : ''}>2. Profile</div>
</div>
```

---

## 📱 **MOBILE CONSIDERATIONS**

### **Phone Number Input:**

```typescript
<input
  type="tel"
  pattern="[+]?[0-9]{10,15}"
  placeholder="+1 (555) 123-4567"
  inputMode="tel"
/>
```

### **Auto-capitalize Names:**

```typescript
<input
  type="text"
  autoCapitalize="words"
  placeholder="First Name"
/>
```

### **Email Keyboard:**

```typescript
<input
  type="email"
  inputMode="email"
  autoComplete="email"
/>
```

---

## 🔐 **SECURITY NOTES**

### **✅ What's Already Secure:**

- Passwords hashed with bcrypt (Supabase handles this)
- JWT tokens properly signed
- RLS policies enforce user isolation
- Profile updates filtered by `auth.uid()`

### **✅ What You Should Do:**

- **Validate email format** before submission
- **Check password strength** (min 8 chars, complexity)
- **Sanitize phone numbers** (remove spaces, format consistently)
- **Don't expose error details** (e.g., "User exists" could leak info)
- **Rate limit signup attempts** (Supabase has built-in rate limiting)

---

## 📊 **BACKEND API REFERENCE**

### **Signup Endpoint:**

```typescript
POST https://nthpbtdjhhnwfxqsxbvy.supabase.co/auth/v1/signup

Headers:
  apikey: <SUPABASE_ANON_KEY>
  Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "password123"
}

Response: 200 OK
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2025-10-23T..."
  },
  "session": null  // null until email confirmed
}
```

### **Profile Update Endpoint:**

```typescript
PATCH https://nthpbtdjhhnwfxqsxbvy.supabase.co/rest/v1/users?auth_user_id=eq.<uuid>

Headers:
  apikey: <SUPABASE_ANON_KEY>
  Authorization: Bearer <SERVICE_ROLE_KEY>  // or user's JWT after login
  Content-Type: application/json
  Prefer: return=representation

Body:
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+15555551234"
}

Response: 200 OK
[{
  "id": 12345,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+15555551234"
}]
```

---

## ✅ **CHECKLIST FOR BRIAN**

- [ ] Choose implementation option (Single Form / Multi-Step / Hook)
- [ ] Create signup form component
- [ ] Implement two-step signup logic:
  - [ ] Step 1: `supabase.auth.signUp()`
  - [ ] Step 2: `supabase.from('users').update()`
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success/error toasts
- [ ] Test with valid data
- [ ] Test with duplicate email
- [ ] Test with weak password
- [ ] Test profile update failure (graceful handling)
- [ ] Add form validation (client-side)
- [ ] Add phone number formatting
- [ ] Test on mobile devices
- [ ] Verify profile data in database

---

## 🎯 **SUMMARY**

### **What Backend Provides:**

✅ Trigger creates `menuca_v3.users` automatically  
✅ RLS policies allow self-update  
✅ All functions have EXECUTE permissions  
✅ Ready for immediate frontend integration

### **What Frontend Must Do:**

1. Collect: email, password, first_name, last_name, phone
2. Call `supabase.auth.signUp()` with email/password
3. Immediately call `supabase.from('users').update()` with profile
4. Handle errors gracefully
5. Show confirmation message

### **Expected Flow:**

```
User fills form
  ↓
Click "Sign Up"
  ↓
Step 1: Create auth.users (via Supabase Auth)
  ↓
Trigger: Create menuca_v3.users (empty profile)
  ↓
Step 2: Update menuca_v3.users (fill profile)
  ↓
Success! Redirect to email confirmation
```

**Total time:** < 500ms  
**User experience:** Seamless, single-click signup

---

## 📞 **QUESTIONS?**

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify RLS policies (should allow user to update own record)
4. Test with SQL directly to isolate frontend vs backend issues

**Backend is ready! You're good to implement.** ✅

