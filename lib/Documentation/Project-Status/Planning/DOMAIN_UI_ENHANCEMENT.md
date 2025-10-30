# Domain Verification UI Enhancement
**Status:** 📋 PENDING (Future Work)  
**Priority:** Medium  
**Effort:** 1-2 days  
**Type:** UI Feature (Backend Already Complete)

---

## Context

Component 11 (Domain Verification & SSL Monitoring) backend is **100% implemented** per Santiago's spec:

✅ **Backend APIs (All Working):**
- `GET /api/domains/[id]/status` → `get_domain_verification_status()` RPC
- `POST /api/domains/[id]/verify` → `verify-single-domain` Edge Function
- `GET /api/domains/summary` → `v_domain_verification_summary` SQL View
- `GET /api/domains/needing-attention` → `v_domains_needing_attention` SQL View

⚠️ **Frontend Gap:**
- Domains tab (`components/restaurant/tabs/domains.tsx`) only does basic CRUD
- Doesn't connect to verification APIs
- No SSL/DNS status display or manual verification triggers

---

## Required UI Features

### 1. Verification Status Display
**Location:** Domain list table in Domains tab

Add columns/badges showing:
- SSL verification status (✅ Verified / ❌ Failed / ⏳ Pending)
- DNS verification status (✅ Verified / ❌ Failed / ⏳ Pending)
- SSL expiration date
- Days until SSL expires (with warnings for < 30 days)

**API:** `GET /api/domains/[id]/status` for each domain

---

### 2. Manual Verification Trigger
**Location:** Domain detail view or inline action button

Add "Verify Now" button that:
- Triggers on-demand verification
- Shows loading state
- Displays verification results
- Updates status badges

**API:** `POST /api/domains/[id]/verify`

---

### 3. Verification Dashboard
**Location:** New "Domain Monitoring" page or Domains tab header

Display summary showing:
- Total domains monitored
- SSL verified count
- DNS verified count
- Domains with expiring SSL (< 30 days)
- Domains needing attention

**API:** `GET /api/domains/summary`

---

### 4. Priority Domain List
**Location:** Dashboard or alert section

Show priority-sorted list of domains requiring action:
- SSL expired or expiring soon
- DNS verification failures
- Last checked > 7 days ago

**API:** `GET /api/domains/needing-attention`

---

## Implementation Notes

### Current File to Modify
`components/restaurant/tabs/domains.tsx`

### New Hook to Create (Optional)
`lib/hooks/use-domain-verification.ts`

Example hook structure:
```typescript
export function useDomainVerification(domainId: number) {
  const status = useQuery({
    queryKey: ['/api/domains', domainId, 'status'],
  });
  
  const verify = useMutation({
    mutationFn: () => fetch(`/api/domains/${domainId}/verify`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains', domainId, 'status'] });
    },
  });
  
  return { status, verify };
}
```

---

## Acceptance Criteria

- [ ] Domain list shows SSL/DNS verification status badges
- [ ] SSL expiration dates displayed with color-coded warnings
- [ ] "Verify Now" button triggers verification and updates status
- [ ] Dashboard shows verification summary statistics
- [ ] Priority domain list highlights domains needing attention
- [ ] Real-time status updates after verification

---

## Related Documentation

- **Santiago's Spec:** `lib/Documentation/Frontend-Guides/Restaurant Management/11-Domain-Verification-SSL.md`
- **Backend APIs:** `app/api/domains/[id]/status/route.ts`, `app/api/domains/[id]/verify/route.ts`
- **Audit Report:** `lib/Documentation/Audit-Reports/Restaurant-Management/CORRECTED_FINAL_AUDIT_OCT30.md`

---

**Note:** This is a UI enhancement, NOT an architectural issue. Backend is fully compliant with Santiago's specification.
