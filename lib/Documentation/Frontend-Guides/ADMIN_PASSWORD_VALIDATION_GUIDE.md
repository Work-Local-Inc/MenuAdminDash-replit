# Admin Password Validation Guide

**Last Updated**: October 31, 2025  
**Target Audience**: Frontend Developers  
**Purpose**: Implement secure password validation for admin user creation

---

## 📋 Overview

Santiago updated the `create-admin-user` Edge Function with **comprehensive password validation** to ensure all admin accounts have strong, secure passwords. This guide helps you implement matching validation in your frontend forms.

---

## 🔐 Password Requirements

All admin passwords MUST meet **ALL** of the following requirements:

### 1. **Minimum Length**
- ✅ At least **8 characters**
- ❌ Shorter passwords will be rejected

### 2. **Character Complexity**
Must contain **ALL** of these:
- ✅ At least **1 uppercase letter** (A-Z)
- ✅ At least **1 lowercase letter** (a-z)
- ✅ At least **1 number** (0-9)
- ✅ At least **1 special character** (!@#$%^&*()_+-=[]{}|;:,.<>?)

### 3. **Common Password Rejection**
Blocks **30+ common passwords** including:
- `password`, `123456`, `12345678`, `qwerty`, `abc123`
- `password123`, `letmein`, `welcome`, `admin`, `passw0rd`
- `monkey`, `dragon`, `master`, `sunshine`, `iloveyou`
- And 15+ more...

### 4. **No Sequential Characters**
❌ Rejects passwords with sequential patterns:
- Alphabetic: `abc`, `bcd`, `xyz`
- Numeric: `123`, `234`, `789`
- Keyboard patterns: `qwe`, `asd`

### 5. **No Repeated Characters**
❌ Rejects passwords with repeated characters:
- `aaa`, `111`, `222`
- `password111` (contains repeated 1s)
- `Hellooo` (contains repeated os)

---

## 💪 Password Strength Scoring

The backend uses a strength scoring system:

| Strength | Requirements |
|----------|-------------|
| **Weak** | Meets minimum requirements only (8 chars, complexity) |
| **Medium** | 10+ characters with good complexity |
| **Strong** | 12+ characters with excellent complexity |

**Frontend Recommendation**: Display a visual strength meter to guide users toward stronger passwords.

---

## 🎨 Frontend Implementation

### React Hook Form + Zod Schema

```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Password validation schema
const adminPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .refine(
      (password) => /[A-Z]/.test(password),
      'Password must contain at least one uppercase letter'
    )
    .refine(
      (password) => /[a-z]/.test(password),
      'Password must contain at least one lowercase letter'
    )
    .refine(
      (password) => /[0-9]/.test(password),
      'Password must contain at least one number'
    )
    .refine(
      (password) => /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
      'Password must contain at least one special character'
    )
    .refine(
      (password) => {
        const commonPasswords = [
          'password', '123456', '12345678', 'qwerty', 'abc123',
          'password123', 'letmein', 'welcome', 'admin', 'passw0rd',
          'monkey', 'dragon', 'master', 'sunshine', 'iloveyou'
        ];
        return !commonPasswords.includes(password.toLowerCase());
      },
      'Password is too common. Please choose a stronger password'
    )
    .refine(
      (password) => {
        // Check for sequential characters (abc, 123, etc.)
        const sequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i;
        return !sequential.test(password);
      },
      'Password cannot contain sequential characters (like "123" or "abc")'
    )
    .refine(
      (password) => {
        // Check for repeated characters (aaa, 111, etc.)
        return !/(.)\1{2,}/.test(password);
      },
      'Password cannot contain repeated characters (like "aaa" or "111")'
    ),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AdminPasswordForm = z.infer<typeof adminPasswordSchema>;
```

---

### Using the Schema in a Form

```typescript
export function CreateAdminForm() {
  const form = useForm<AdminPasswordForm>({
    resolver: zodResolver(adminPasswordSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  async function onSubmit(values: AdminPasswordForm) {
    // Call create-admin-user Edge Function
    const { data, error } = await supabase.functions.invoke('create-admin-user', {
      headers: {
        Authorization: `Bearer ${superAdminToken}`
      },
      body: {
        email: values.email,
        password: values.password,
        first_name: values.firstName,
        last_name: values.lastName,
        phone: values.phone,
        role_id: 2, // 1=Super Admin, 2=Manager, 5=Restaurant Manager (default)
        restaurant_ids: [349, 350], // Optional: assign restaurants on creation
        mfa_enabled: false // Optional: enable 2FA (default: false)
      }
    });

    if (error) {
      // Handle error (password validation failed on backend)
      toast.error(error.message);
    } else {
      toast.success(`Admin created: ${data.email}`);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter secure password"
                  {...field}
                  data-testid="input-password"
                />
              </FormControl>
              <FormDescription>
                Must be 8+ characters with uppercase, lowercase, number, and special character
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Confirm password"
                  {...field}
                  data-testid="input-confirm-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" data-testid="button-create-admin">
          Create Admin
        </Button>
      </form>
    </Form>
  );
}
```

---

## 📊 Password Strength Meter (Optional)

Add a visual indicator to help users create strong passwords:

```typescript
function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  
  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 10) score += 1;
  if (password.length >= 12) score += 1;
  
  // Complexity scoring
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 1;
  
  // Variety scoring
  const uniqueChars = new Set(password.split('')).size;
  if (uniqueChars >= 8) score += 1;
  
  if (score <= 3) {
    return { score, label: 'Weak', color: 'red' };
  } else if (score <= 5) {
    return { score, label: 'Medium', color: 'yellow' };
  } else {
    return { score, label: 'Strong', color: 'green' };
  }
}

// In your component:
export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = calculatePasswordStrength(password);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>Password Strength</span>
        <span className={`font-semibold text-${strength.color}-600`}>
          {strength.label}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`bg-${strength.color}-600 h-2 rounded-full transition-all`}
          style={{ width: `${(strength.score / 8) * 100}%` }}
        />
      </div>
    </div>
  );
}
```

---

## ✅ Testing Your Implementation

### Test Cases

```typescript
// SHOULD PASS ✅
const validPasswords = [
  'SecureP@ss123',
  'MyStr0ng!Pass',
  'C0mpl3x&Secure',
  'Admin#2025Pass'
];

// SHOULD FAIL ❌
const invalidPasswords = [
  'short',                    // Too short
  'nouppercase123!',          // No uppercase
  'NOLOWERCASE123!',          // No lowercase
  'NoNumbers!',               // No numbers
  'NoSpecial123',             // No special char
  'password123',              // Common password
  'MyPassword123',            // Contains "123" sequential
  'Hello111',                 // Contains repeated "111"
  'Passwooord1!'              // Contains repeated "ooo"
];
```

### Manual Testing Checklist

- [ ] Form rejects password < 8 characters
- [ ] Form rejects password without uppercase
- [ ] Form rejects password without lowercase
- [ ] Form rejects password without number
- [ ] Form rejects password without special char
- [ ] Form rejects common passwords ("password", "123456", etc.)
- [ ] Form rejects sequential characters ("123", "abc")
- [ ] Form rejects repeated characters ("aaa", "111")
- [ ] Form validates password confirmation matches
- [ ] Error messages are clear and helpful
- [ ] Backend validation matches frontend (test with API)

---

## 🚨 Important Notes

### Frontend vs Backend Validation

1. **Frontend Validation**: 
   - Provides immediate feedback to users
   - Improves UX by catching errors early
   - **NOT** a security measure (can be bypassed)

2. **Backend Validation** (Edge Function):
   - **Primary security layer** - Cannot be bypassed
   - Final authority on password acceptance
   - Always validates even if frontend validation passes

**Best Practice**: Implement both, but **always rely on backend validation** for security.

---

### Error Handling

Always handle backend validation errors:

```typescript
const { data, error } = await supabase.functions.invoke('create-admin-user', {
  headers: { Authorization: `Bearer ${token}` },
  body: { email, password, first_name, last_name }
});

if (error) {
  // Backend rejected password (or other validation error)
  if (error.message.includes('password')) {
    form.setError('password', {
      type: 'manual',
      message: error.message
    });
  } else {
    toast.error(error.message);
  }
  return;
}

// Success!
toast.success(`Admin created: ${data.email}`);
```

---

## 👥 Admin Roles & Permissions

When creating an admin, you can specify their role using `role_id`:

| Role ID | Role Name | Permissions |
|---------|-----------|-------------|
| **1** | Super Admin | Full system access, can create admins, manage all restaurants |
| **2** | Manager | Limited admin access, assigned restaurants only |
| **5** | Restaurant Manager | **Default** - Restaurant-level management only |

**Example**:
```typescript
const { data } = await supabase.functions.invoke('create-admin-user', {
  body: {
    email: 'manager@menu.ca',
    password: 'SecureP@ss123',
    role_id: 2, // Manager role
    restaurant_ids: [349, 350]
  }
});
```

**Default Behavior**: If `role_id` is not specified, the admin will be created with role **5 (Restaurant Manager)**.

---

## 🔐 Two-Factor Authentication (MFA)

You can enable 2FA for enhanced security:

```typescript
const { data } = await supabase.functions.invoke('create-admin-user', {
  body: {
    email: 'admin@menu.ca',
    password: 'SecureP@ss123',
    mfa_enabled: true // Enable 2FA
  }
});
```

**Default**: `mfa_enabled: false`

**Note**: When MFA is enabled, the admin will need to set up their 2FA method (authenticator app) on first login.

---

## 📚 Additional Resources

- **Full Documentation**: `lib/Documentation/Frontend-Guides/Users-&-Access/Users & Access features.md`
- **Santiago's Guide**: [GitHub - Users & Access Features](https://github.com/SantiagoWL117/Migration-Strategy/blob/main/documentation/Users%20%26%20Access/Users%20%26%20Access%20features.md)
- **Edge Function**: Supabase Dashboard → Edge Functions → `create-admin-user`

---

## 🎯 Quick Reference

### Valid Password Examples
✅ `SecureP@ss123`  
✅ `MyStr0ng!Admin`  
✅ `C0mpl3x&Pass2025`  

### Invalid Password Examples
❌ `password` (common)  
❌ `Pass123` (no special char)  
❌ `Password!` (no number)  
❌ `MyPass123` (sequential "123")  
❌ `Hello111!` (repeated "111")  

---

**Document Version**: 1.0  
**Last Updated**: October 31, 2025  
**Status**: Production Ready ✅
