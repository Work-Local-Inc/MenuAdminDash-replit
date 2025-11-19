# Documentation Mapping - Restaurant Management

**Purpose:** Quick reference linking Santiago's comprehensive backend documentation to our Next.js build plan  
**Scope:** Restaurant Management Entity only (11 components)  
**Last Updated:** October 21, 2025

---

## Master Documentation Index

**📂 Main Hub:** `lib/Documentation/Frontend-Guides/BRIAN_MASTER_INDEX.md`  
**📖 Restaurant Management Guide:** `lib/Documentation/Frontend-Guides/01-Restaurant-Management-Frontend-Guide.md`

---

## Component-to-Build-Plan Mapping

### ✅ **Already Implemented (Phase 2 Complete)**

| Build Plan Feature | Documentation Component | Doc File | Implementation Status |
|-------------------|------------------------|----------|---------------------|
| **Basic Info** (name, description, logo) | SEO & Full-Text Search | `07-SEO-Full-Text-Search.md` | ✅ Complete |
| **Contact Info** (phone, email, fax) | Contact Management | `05-Contact-Management.md` | ✅ Complete |
| **Locations** (multiple addresses) | *Standard CRUD* | N/A | ✅ Complete |
| **Delivery Areas** (Mapbox polygons) | PostGIS Delivery Zones | `06-PostGIS-Delivery-Zones.md` | ✅ Complete |
| **Hours & Schedules** | *Standard CRUD* | N/A | ✅ Complete |
| **Payment Methods** | *Standard CRUD* | N/A | ✅ Complete |
| **Service Config** (delivery/pickup) | *Standard CRUD* | N/A | ✅ Complete |
| **SEO Settings** | SEO & Full-Text Search | `07-SEO-Full-Text-Search.md` | ✅ Complete |
| **Menu Categories** | Categorization System | `08-Categorization-System.md` | ✅ Complete |
| **Custom Domains** | Domain Verification & SSL | `11-Domain-Verification-SSL.md` | ✅ Complete |
| **Custom CSS** | *Standard CRUD* | N/A | ✅ Complete |
| **Integrations** | *Standard CRUD* | N/A | ✅ Complete |
| **Images** (logo, banner, gallery) | *Standard CRUD* | N/A | ✅ Complete |
| **Feedback** (reviews, ratings) | *Standard CRUD* | N/A | ✅ Complete |
| **Contacts** (owner, manager) | Contact Management | `05-Contact-Management.md` | ✅ Complete |

---

### 📋 **Future Enhancements (Tasks 9-14)**

| Build Plan Task | Documentation Component | Doc File | Status | Priority |
|----------------|------------------------|----------|--------|----------|
| **Task 6: Franchise Management** | Franchise/Chain Hierarchy | `01-Franchise-Chain-Hierarchy.md` | 📋 Pending | HIGH |
| **Task 9: Complete Restaurant Filters** | SEO & Full-Text Search | `07-SEO-Full-Text-Search.md` | 📋 Pending | MEDIUM |
| **Task 10: Add Restaurant Wizard** | Restaurant Onboarding System | `10-Restaurant-Onboarding-System.md` | 📋 Pending | MEDIUM |
| **Task 11: Onboarding Status Dashboard** | Onboarding Status Tracking | `09-Onboarding-Status-Tracking.md` | 📋 Pending | MEDIUM |
| **Task 13: Soft Delete & Recovery** | Soft Delete Infrastructure | `02-Soft-Delete-Infrastructure.md` | 📋 Pending | MEDIUM |
| **Task 14: Restaurant Status Audit Trail** | Status Audit Trail | `04-Status-Audit-Trail.md` | 📋 Pending | LOW |

---

## Component Deep Dive

### 1. Franchise/Chain Hierarchy
**📖 Documentation:** `lib/Documentation/Frontend-Guides/Restaurant Management/01-Franchise-Chain-Hierarchy.md`

**What it does:**
- Multi-location franchise brand management
- Parent-child restaurant relationships
- Bulk operations across all franchise locations
- Franchise-wide analytics and reporting

**Build Plan Tasks Using This:**
- ✅ Phase 2: Basic franchise linking (partial implementation)
- 📋 Task 6: Full franchise management system

**Key APIs:**
- 13 SQL Functions (read operations)
- 3 Edge Functions (write operations)

**When to implement:** Task 6 (Franchise Management)

---

### 2. Soft Delete Infrastructure
**📖 Documentation:** `lib/Documentation/Frontend-Guides/Restaurant Management/02-Soft-Delete-Infrastructure.md`

**What it does:**
- Audit-compliant soft delete with 30-day recovery
- Complete deletion audit trail
- GDPR/CCPA compliance
- Zero data loss on accidents

**Build Plan Tasks Using This:**
- 📋 Task 13: Soft Delete & Recovery UI

**Key APIs:**
- 3 SQL Functions (read/restore operations)
- 3 Edge Functions (delete operations)

**When to implement:** Task 13 (after core features stable)

---

### 3. Status & Online/Offline Toggle
**📖 Documentation:** `lib/Documentation/Frontend-Guides/Restaurant Management/03-Status-Online-Toggle.md`

**What it does:**
- Restaurant availability management
- Emergency shutdown capability
- Real-time status updates
- Customer-facing availability display

**Build Plan Tasks Using This:**
- ✅ Phase 2: Status toggle (basic implementation exists)

**Key APIs:**
- 3 SQL Functions
- 3 Edge Functions

**When to implement:** Already implemented in Phase 2

---

### 4. Status Audit Trail
**📖 Documentation:** `lib/Documentation/Frontend-Guides/Restaurant Management/04-Status-Audit-Trail.md`

**What it does:**
- Complete status change tracking
- Compliance reporting
- Historical analytics
- Who changed what, when

**Build Plan Tasks Using This:**
- 📋 Task 14: Restaurant Status Audit Trail

**Key APIs:**
- 2 SQL Functions
- 1 Edge Function

**When to implement:** Task 14 (low priority, after core features)

---

### 5. Contact Management
**📖 Documentation:** `lib/Documentation/Frontend-Guides/Restaurant Management/05-Contact-Management.md`

**What it does:**
- Priority-based contact hierarchy
- Role-based communication routing
- Automatic fallback support
- Emergency contact management

**Build Plan Tasks Using This:**
- ✅ Phase 2: Contact Info tab (already implemented)

**Key APIs:**
- 1 SQL Function
- 3 Edge Functions

**When to implement:** Already implemented in Phase 2

---

### 6. PostGIS Delivery Zones
**📖 Documentation:** `lib/Documentation/Frontend-Guides/Restaurant Management/06-PostGIS-Delivery-Zones.md`

**What it does:**
- Precise delivery boundary polygon drawing
- Zone-based pricing
- Sub-100ms proximity search
- Complete zone CRUD operations

**Build Plan Tasks Using This:**
- ✅ Phase 2: Delivery Areas tab with Mapbox (already implemented)

**Key APIs:**
- 8 SQL Functions (geospatial queries)
- 4 Edge Functions (zone management)

**When to implement:** Already implemented in Phase 2 with Mapbox GL JS

---

### 7. SEO & Full-Text Search
**📖 Documentation:** `lib/Documentation/Frontend-Guides/Restaurant Management/07-SEO-Full-Text-Search.md`

**What it does:**
- Restaurant discovery via search
- Full-text search with ranking
- SEO metadata optimization
- Multi-language support

**Build Plan Tasks Using This:**
- ✅ Phase 2: SEO Settings tab (already implemented)
- 📋 Task 9: Advanced restaurant filters with full-text search

**Key APIs:**
- 2 SQL Functions
- 1 Database View

**When to implement:** 
- ✅ Basic SEO: Already done (Phase 2)
- 📋 Advanced search: Task 9

---

### 8. Categorization System
**📖 Documentation:** `lib/Documentation/Frontend-Guides/Restaurant Management/08-Categorization-System.md`

**What it does:**
- Tag-based restaurant filtering
- Cuisine and dietary tags
- Feature-based categorization
- Marketing tag management

**Build Plan Tasks Using This:**
- ✅ Phase 2: Menu Categories tab (already implemented)
- 📋 Task 9: Advanced filters using category tags

**Key APIs:**
- 3 SQL Functions
- 3 Edge Functions

**When to implement:**
- ✅ Basic categories: Already done (Phase 2)
- 📋 Advanced filtering: Task 9

---

### 9. Onboarding Status Tracking
**📖 Documentation:** `lib/Documentation/Frontend-Guides/Restaurant Management/09-Onboarding-Status-Tracking.md`

**What it does:**
- Step-by-step workflow tracking
- Completion percentage calculation
- Admin oversight dashboard
- Progress visualization

**Build Plan Tasks Using This:**
- 📋 Task 11: Onboarding Status Dashboard

**Key APIs:**
- 4 SQL Functions
- 3 Edge Functions

**When to implement:** Task 11 (medium priority)

---

### 10. Restaurant Onboarding System
**📖 Documentation:** `lib/Documentation/Frontend-Guides/Restaurant Management/10-Restaurant-Onboarding-System.md`

**What it does:**
- Complete onboarding lifecycle
- Guided multi-step wizard
- Automated validation
- Progress persistence

**Build Plan Tasks Using This:**
- 📋 Task 10: Add Restaurant Wizard

**Key APIs:**
- 9 SQL Functions
- 4 Edge Functions

**When to implement:** Task 10 (medium priority)

---

### 11. Domain Verification & SSL Monitoring
**📖 Documentation:** `lib/Documentation/Frontend-Guides/Restaurant Management/11-Domain-Verification-SSL.md`

**What it does:**
- Custom domain verification
- Automated SSL certificate monitoring
- DNS health checks
- Domain configuration validation

**Build Plan Tasks Using This:**
- ✅ Phase 2: Custom Domains tab (already implemented)

**Key APIs:**
- 2 SQL Functions
- 2 Edge Functions

**When to implement:** Already implemented in Phase 2

---

## Quick Search by Feature

### Need franchise management?
→ **Component 1:** Franchise/Chain Hierarchy  
→ **Doc:** `01-Franchise-Chain-Hierarchy.md`  
→ **Build Task:** Task 6

### Need soft delete/recovery?
→ **Component 2:** Soft Delete Infrastructure  
→ **Doc:** `02-Soft-Delete-Infrastructure.md`  
→ **Build Task:** Task 13

### Need delivery zone mapping?
→ **Component 6:** PostGIS Delivery Zones  
→ **Doc:** `06-PostGIS-Delivery-Zones.md`  
→ **Status:** ✅ Already implemented (Phase 2)

### Need onboarding wizard?
→ **Component 10:** Restaurant Onboarding System  
→ **Doc:** `10-Restaurant-Onboarding-System.md`  
→ **Build Task:** Task 10

### Need advanced search/filters?
→ **Component 7:** SEO & Full-Text Search  
→ **Doc:** `07-SEO-Full-Text-Search.md`  
→ **Build Task:** Task 9

### Need audit trails?
→ **Component 4:** Status Audit Trail  
→ **Doc:** `04-Status-Audit-Trail.md`  
→ **Build Task:** Task 14

---

## How to Use This Mapping

### When starting a new task:
1. Find the task in NEXT_STEPS_TASK_LIST.md
2. Check this mapping for relevant documentation components
3. Open the specific component guide for detailed API reference
4. Implement using the provided SQL functions and Edge functions
5. Follow the code examples and best practices in the guide

### When implementing features:
- Use the **SQL functions** for read operations (fast, direct queries)
- Use the **Edge functions** for write operations (auth, audit, validation)
- Follow the authentication patterns documented in each component
- Test with the provided example code

### Quick links:
- **Master Index:** `lib/Documentation/Frontend-Guides/BRIAN_MASTER_INDEX.md`
- **All Components:** `lib/Documentation/Frontend-Guides/Restaurant Management/`
- **Build Plan:** `NEXT_STEPS_TASK_LIST.md`

---

**Last Updated:** October 21, 2025  
**Maintained By:** Development Team  
**For Backend Details:** See `lib/Documentation/Frontend-Guides/BRIAN_MASTER_INDEX.md`
