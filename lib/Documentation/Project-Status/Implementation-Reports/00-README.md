# Backend Memory Bank

**Purpose:** Permanent reference documentation for the Menu.ca Admin Dashboard backend integration.

**Last Updated:** October 24, 2025

## ⚠️ CRITICAL NOTICE - DOCUMENTATION UNDER CORRECTION

**Issue Found:** Route paths in documentation do not match actual filesystem structure.  
**Status:** Being corrected  
**Impact:** API Routes Reference and Compliance Report have incorrect paths (e.g., `/api/franchises` should be `/api/franchise`)  

**Do NOT use until corrected.** Refer to actual filesystem in `app/api/` for correct paths.

## What is This?

This folder contains authoritative documentation about how the Menu.ca Admin Dashboard integrates with Santiago's backend infrastructure (50+ SQL Functions, 29 Edge Functions). It serves as a "memory bank" to ensure all future development follows the established patterns.

## Critical Rule

**ALL backend integration MUST follow the BRIAN_MASTER_INDEX.md guide:**
- Use Santiago's documented SQL Functions for reads
- Use Santiago's documented Edge Functions for writes
- Never write custom queries without checking the guide first

## Documentation Files

### 1. BRIAN-Compliance-Report.md
Complete audit of all 11 restaurant management components, verification results, and fixes applied.

### 2. API-Routes-Reference.md
Comprehensive mapping of all 80+ API routes to their corresponding Edge Functions, SQL Functions, or DB tables.

### 3. Authentication-Status.md
Complete authentication coverage report across all routes with security audit results.

### 4. Testing-Results.md
End-to-end testing scenarios and results for all restaurant management features.

## Quick Reference

### Backend Architecture Pattern
```
READ Operations → Use SQL Functions (via supabase.rpc())
WRITE Operations → Use Edge Functions (via supabase.functions.invoke())
Simple CRUD → Direct DB only when no Edge Function exists
```

### Authentication Pattern
```typescript
export async function HANDLER(request: NextRequest) {
  try {
    await verifyAdminAuth(request);
    // ... handler logic
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    // ... other error handling
  }
}
```

### Key Statistics
- **Total API Routes:** 80+ routes
- **Authenticated Routes:** 80 routes (100%)
- **Edge Functions Used:** 29 functions
- **SQL Functions Used:** 50+ functions
- **Components Verified:** 11/11 (100%)

## Related Documentation

- **Santiago's Guide:** `lib/Documentation/Frontend-Guides/BRIAN_MASTER_INDEX.md`
- **Frontend Guides:** `lib/Documentation/Frontend-Guides/Restaurant Management/`
- **Project Overview:** `replit.md`
