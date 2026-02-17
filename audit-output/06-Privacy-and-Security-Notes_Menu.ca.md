# Menu.ca — Privacy & Security Notes
**Generated:** February 2026  
**Source:** Codebase audit

---

## Section H — Security, Privacy, and Compliance

### PII Storage Inventory

| PII Type | Storage Location | Table(s) | Access Control |
|---|---|---|---|
| Customer email | Supabase PostgreSQL | `users.email`, Supabase Auth `auth.users` | Supabase RLS; admin via `createAdminClient()` |
| Customer name | Supabase PostgreSQL | `users.first_name`, `users.last_name` | Same |
| Customer phone | Supabase PostgreSQL | `users.phone` | Same |
| Delivery addresses | Supabase PostgreSQL | `user_addresses` (street, city, province, postal, lat/lng) | Supabase RLS per user; admin bypass |
| Order details | Supabase PostgreSQL | `orders`, `order_items` | Associated with `user_id`; admin bypass |
| Payment method tokens | Stripe (NOT in our DB) | Stripe Customer objects | Stripe manages; we store `stripe_customer_id` only |
| Restaurant contact info | Supabase PostgreSQL | `restaurant_contacts` (name, phone, email) | Admin access only |
| Admin user credentials | Supabase Auth | `auth.users` (for admins) + `admin_users` table | Supabase Auth manages password hashing |
| Device session tokens | Supabase PostgreSQL | `device_sessions.session_token` | Bcrypt-hashed device keys; session tokens stored directly |

### Access Controls

| Role | Data Access | Enforcement |
|---|---|---|
| **Customer** | Own profile, own orders, own addresses | Supabase RLS policies + `auth.getUser()` check in API routes |
| **Admin (Restaurant)** | Assigned restaurant's orders, menu, config | `verifyAdminAuth()` + `verifyRestaurantAccess()` |
| **Admin (Super)** | All data across all restaurants | `verifyAdminAuth()` with `role_id` check |
| **Tablet Device** | Own restaurant's orders (with PII masking) | `verifyDeviceAuth()` via Bearer token; customer phone/email masked in response |
| **System/Cron** | Orders needing fallback calls | `ORDER_FALLBACK_CRON_SECRET` header check |

### PII Masking in Tablet API

The tablet API masks customer PII before sending to devices:

```typescript
// app/api/tablet/orders/[id]/route.ts
customer: {
  name: customerName,
  phone: maskPhone(customerPhone),    // e.g., "***-***-1234"
  email: maskEmail(customerEmail),    // e.g., "b***@***.ca"
}
```

**Location:** `app/api/tablet/orders/[id]/route.ts` (lines 143-146)

### Logging Rules

| Category | Current State | Risk Level |
|---|---|---|
| **API request bodies** | Some endpoints log request bodies for debugging | MEDIUM — may contain PII |
| **Order creation logs** | Logs order metadata (restaurant_id, amounts) but NOT customer PII | LOW |
| **Stripe payment intent** | Logs first 25 chars of secret key (safe — public prefix) | LOW |
| **Error logs** | Stack traces may include PII in error context | MEDIUM |
| **Tablet heartbeat logs** | Logs device health data, no PII | LOW |
| **Admin auth logs** | Logs admin email on authentication | LOW (admin emails are not customer PII) |

**Recommendations:**
1. Add a PII scrubbing middleware for error logs before they reach any external service
2. Remove verbose request body logging from production (especially customer endpoints)
3. Ensure `console.log` statements in API routes don't include customer email/phone/address

### Payment Provider Integration Boundaries

| Boundary | Implementation | Verification |
|---|---|---|
| **Card data never touches our server** | Stripe Elements / PaymentElement handles card input client-side | Card numbers go directly to Stripe; we only receive `payment_intent_id` |
| **PCI compliance scope** | SAQ-A eligible (card data never enters our environment) | Stripe.js + Elements handles all card collection |
| **Stripe Customer ID storage** | `users.stripe_customer_id` stores Stripe customer reference | No card details stored locally |
| **Payment mode isolation** | Test vs. live Stripe keys per restaurant | `getRestaurantPaymentMode()` in `app/api/customer/create-payment-intent/route.ts` |
| **Refund processing** | Server-side via Stripe API using `payment_intent` ID | `app/api/refunds/route.ts` — admin auth required |

### Webhook Signature Verification

| Webhook | Verification | Code Location | Status |
|---|---|---|---|
| **Stripe webhook** | `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET` | `app/api/customer/stripe-webhook/route.ts` (line 38) | VERIFIED — fails closed if secret not configured |
| **Twilio voice webhook** | `TWILIO_VOICE_TOKEN` query parameter check | `app/api/twilio/voice/order-fallback/route.ts` | IMPLEMENTED — but query param is less secure than header-based auth |
| **Cron endpoint** | `ORDER_FALLBACK_CRON_SECRET` header check | `app/api/cron/order-fallback/route.ts` | IMPLEMENTED |

### Security Risks & Recommendations

| Risk | Severity | Current State | Recommendation |
|---|---|---|---|
| **Debug/test endpoints exposed** | HIGH | `/api/test-connection`, `/api/test-restaurant`, `/api/test-auth`, `/api/check-public-tables`, `/api/tablet/test-bcrypt` are publicly accessible | Gate behind admin auth or remove from production |
| **No rate limiting** | MEDIUM | No rate limiting on customer-facing endpoints | Add rate limiting to `/api/customer/create-payment-intent`, `/api/customer/orders`, login endpoints |
| **Twilio webhook uses query param auth** | MEDIUM | Token passed as query parameter instead of signed header | Consider using Twilio request validation (`validateRequest`) |
| **Shared dev/prod database** | MEDIUM | Single database for all environments | Accidental data exposure or corruption in dev affects production |
| **No CSP headers** | LOW | No Content Security Policy configured | Add CSP headers in `next.config.mjs` |
| **Device session tokens stored in plaintext** | MEDIUM | `device_sessions.session_token` stored as-is | Consider hashing session tokens (device key IS hashed via bcrypt) |
| **Admin auth logs email** | LOW | Admin email logged on each auth check | Acceptable for audit trail, but reduce verbosity in production |

### Compliance Considerations

| Area | Status | Notes |
|---|---|---|
| **PIPEDA (Canadian privacy law)** | PARTIAL | PII stored securely in Supabase; no formal privacy policy audit |
| **PCI DSS** | SAQ-A eligible | Card data never enters our environment (Stripe handles) |
| **CASL (anti-spam)** | UNKNOWN | Email sending via Resend — ensure opt-in consent is captured |
| **Data retention** | NO POLICY | No automated data cleanup or retention limits |
| **Right to deletion** | NOT IMPLEMENTED | No self-service account deletion; `users.deleted_at` field exists but no API endpoint |
| **Data breach notification** | NO PLAN | No documented breach response plan |
