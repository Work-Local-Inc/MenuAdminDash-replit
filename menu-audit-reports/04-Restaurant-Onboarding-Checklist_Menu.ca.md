# Menu.ca — Restaurant Onboarding Checklist
**Generated:** February 2026  
**Source:** Codebase analysis of admin endpoints and restaurant configuration

---

## Section G — Onboarding & Support

### G1) Restaurant Onboarding Checklist (Repeatable)

#### Phase 1: Data Setup (Admin Dashboard)

| Step | Action | Admin Route / Endpoint | Required Data | Notes |
|---|---|---|---|---|
| 1 | **Create restaurant** | `/admin/restaurants` → Create | Restaurant name | Creates entry in `restaurants` table with `status='pending'` |
| 2 | **Add primary location** | `/api/restaurants/[id]/locations` | Street address, city, province, postal code, phone, email, lat/lng | At least one location required; set `is_primary=true` |
| 3 | **Configure delivery & pickup** | `/api/restaurants/[id]/service-config` | Delivery enabled?, pickup enabled?, takeout time (min), delivery fee settings | Sets up `delivery_and_pickup_configs` |
| 4 | **Set delivery zones** | `/api/restaurants/[id]/delivery-zones` | GeoJSON polygons (via Mapbox draw tool) | Required if delivery is enabled |
| 5 | **Add restaurant contacts** | `/api/restaurants/[id]/contacts` | Name, phone, email, `receives_orders` flag | At least one contact with `receives_orders=true` for fallback calls |
| 6 | **Configure schedules** | `/api/restaurants/[id]/schedules` | Day/time ranges for delivery and takeout | Separate schedules for delivery vs. takeout |
| 7 | **Set up menu categories** | `/api/restaurants/[id]/menu-categories` | Category names, display order | Maps to `courses` table |
| 8 | **Add dishes** | Admin menu builder | Dish name, description, price(s), image, course assignment | Supports size variants via `dish_prices` |
| 9 | **Configure modifiers** | `/api/admin/menu/unified-modifiers` | Modifier groups, options, prices, assignment to dishes | Unified modifier library system |
| 10 | **Set up combo groups** (if applicable) | Admin menu builder | Combo rules, included dishes, pricing | Optional for restaurants with combo meals |
| 11 | **Add tags & cuisines** | `/api/restaurants/[id]/tags` | Tag/cuisine selections | For discoverability |
| 12 | **Configure payment mode** | `/api/restaurants/[id]/payment-options` | Test or Live Stripe | START WITH TEST MODE. Only switch to live after test order succeeds. |
| 13 | **Configure provincial tax** | Service config | Tax rate for restaurant's province | e.g., Ontario HST 13% |
| 14 | **Set up Twilio fallback** (optional) | `/api/restaurants/[id]/twilio-config` | Enable `twilio_call`, verify contact phone numbers | For restaurants with tablets |
| 15 | **Set up subdomain** (optional) | `/api/restaurants/[id]/subdomains` | Desired subdomain (e.g., `restaurantname`) | Creates `restaurantname.menu.ca` routing |

#### Phase 2: Tablet Setup (If Applicable)

| Step | Action | Details |
|---|---|---|
| 16 | **Register tablet device** | Use `/api/tablet/auth/register` with device key |
| 17 | **Configure device** | Assign to restaurant, set as active |
| 18 | **Test tablet connection** | Verify heartbeat appears in `/admin/devices` |
| 19 | **Generate QR code** (optional) | For easy tablet app pairing |

#### Phase 3: Test Order (REQUIRED)

| Step | Action | Verification |
|---|---|---|
| 20 | **Ensure payment mode = TEST** | `delivery_and_pickup_configs.payment_mode = 'test'` |
| 21 | **Place test order** (pickup) | Visit restaurant URL → add items → checkout → use Stripe test card `4242 4242 4242 4242` |
| 22 | **Verify order appears** | Check `orders` table or tablet app |
| 23 | **Verify tablet receives order** | If tablet configured, check it shows the order |
| 24 | **Walk through order lifecycle** | Confirm → Preparing → Ready → Completed |
| 25 | **Test refund** | Process refund via admin → verify Stripe test refund |
| 26 | **Place test delivery order** | If delivery enabled, test with a valid delivery address |
| 27 | **Verify delivery fee calculation** | Check fee matches zone configuration |
| 28 | **Test fallback call** (if enabled) | Wait 3 min without acknowledging → verify Twilio call placed |

#### Phase 4: Go-Live

| Step | Action | Notes |
|---|---|---|
| 29 | **Switch payment mode to LIVE** | `delivery_and_pickup_configs.payment_mode = 'live'` |
| 30 | **Activate restaurant** | Set `restaurants.status = 'active'` |
| 31 | **Enable online ordering** | `is_online_ordering_active = true` |
| 32 | **Verify live payment** | Place a real small order and refund it |
| 33 | **Share restaurant URL** | `orders.menu.ca/r/[slug]` or branded subdomain |

#### Phase 5: First Week Monitoring

| Check | Frequency | What to Look For |
|---|---|---|
| Order flow | Daily | Orders going through, being acknowledged, completed |
| Payment success | Daily | No failed payments |
| Tablet health | Daily | Device showing green/healthy in `/admin/devices` |
| Customer complaints | Daily | Any reported issues |
| Menu accuracy | Once | All items, prices, modifiers correct |
| Delivery zone coverage | Once | Zones cover intended service area |
| Fallback calls | Monitor | Should NOT be triggering if tablet is healthy |

### Known Pitfalls

| Pitfall | Symptoms | Prevention |
|---|---|---|
| **Forgetting to switch from test to live** | Real orders use test Stripe keys → payments succeed but money doesn't transfer | Checklist step 29 — always verify before announcing |
| **Missing `receives_orders` contact** | Fallback calls fail (no phone number found) | Ensure at least one contact with `receives_orders=true` |
| **Delivery zones not configured** | Delivery option shows but fee calculation fails | Test with real delivery address before go-live |
| **Modifier groups not assigned to dishes** | Customers can't customize items | Verify each dish has expected modifiers in menu builder |
| **Schedule not set** | Restaurant shows as "closed" during business hours | Set both delivery and takeout schedules |
| **Tablet not paired** | Orders go through but restaurant never sees them | Always complete tablet setup before go-live (or rely on fallback calls) |
| **Tax rate not configured** | Orders charged without tax → accounting issues | Verify provincial tax rate is set |

---

### G2) Support Intake → Engineering Loop

#### Where Issues Are Reported
- Restaurant owners: Direct calls/texts to Brian
- Customer complaints: Through ordering website or direct contact
- Tablet issues: Sentry alerts (React Native app) + restaurant reports
- System issues: Admin dashboard monitoring + Twilio call logs

#### Triage Template

```markdown
**Issue Report**
- Restaurant: [name and ID]
- Reporter: [who reported and how]
- Timestamp: [when it happened, ET]
- Environment: [production / dev]
- Symptoms: [what went wrong from the user's perspective]
- Reproduction: [steps to reproduce, if known]
- Severity: [P1-P4 based on revenue impact]
- Screenshots/logs: [attach if available]
```

#### SLA Targets

| Severity | First Response | Resolution Target |
|---|---|---|
| P1 — Revenue blocking | 15 min | 1 hour |
| P2 — Degraded service | 30 min | 4 hours |
| P3 — Partial impact | 2 hours | 24 hours |
| P4 — Low impact | Next business day | 1 week |

#### When to Open an Incident
- Any P1 or P2 issue
- Same issue reported by multiple restaurants
- System-wide errors (Supabase/Stripe/Twilio down)
- Fallback system triggering repeatedly for same restaurant

#### When to Create Backlog Items
- Feature requests from restaurants
- UX improvements identified during support
- Non-urgent bugs that have workarounds
- Performance improvements
