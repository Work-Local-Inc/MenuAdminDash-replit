# Menu.ca v3 - Restaurant Ordering Platform

Multi-tenant restaurant ordering platform serving 961 restaurants and 32,330+ users.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

## 📚 Essential Documentation

### **For Developers**

**🔥 [API Architecture Guide](lib/Documentation/API_ARCHITECTURE_GUIDE.md)** ⭐  
Complete reference for all API endpoints, authentication patterns, and frontend integration.  
**Use this for:** Building new features, understanding the codebase, React Query patterns.

**[Supabase Configuration](SUPABASE_CONFIG.md)**  
Critical database schema information and client setup.  
**⚠️ READ BEFORE ANY SUPABASE WORK**

**[Project Overview](replit.md)**  
High-level project architecture, user preferences, and system overview.

### **Frontend Implementation Guides**

Located in `lib/Documentation/Frontend-Guides/`:

1. **[Restaurant Management](lib/Documentation/Frontend-Guides/Restaurant%20Management/)** - Franchise hierarchy, status management, onboarding
2. **[Users & Access](lib/Documentation/Frontend-Guides/Users-&-Access/)** - Admin users, permissions, authentication
3. **[Menu Catalog](lib/Documentation/Frontend-Guides/Menu-refatoring/)** - Dishes, categories, modifiers, inventory
4. **[Marketing & Promotions](lib/Documentation/Frontend-Guides/Marketing%20&%20Promotions/)** - Deals, coupons, analytics
5. **[Service Configuration](lib/Documentation/Frontend-Guides/Service_configuration_and_schedules/)** - Schedules, delivery zones

### **Standards & Best Practices**

- **[API Route Implementation](lib/Documentation/Standards/API-ROUTE-IMPLEMENTAITON.md)** - Complete route reference by component
- **[State Management Rules](lib/Documentation/Standards/STATE_MANAGEMENT_RULES.md)** - React Query patterns
- **[Design Guidelines](design_guidelines.md)** - UI/UX standards

## 🏗️ Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Supabase PostgreSQL (menuca_v3 schema)
- **Auth:** Supabase Auth with middleware
- **State:** React Query, Zustand (shopping cart)
- **Forms:** React Hook Form + Zod validation

## 🔐 Database Schema

**Two schemas:**
- `public` - Admin tables only (`admin_users`, `admin_roles`, `admin_user_restaurants`)
- `menuca_v3` - ALL restaurant data (restaurants, dishes, orders, users, promotions)

**⚠️ Critical:** All Supabase clients MUST include `db: { schema: 'menuca_v3' }`

See **[SUPABASE_CONFIG.md](SUPABASE_CONFIG.md)** for complete details.

## 📁 Project Structure

```
app/
├── admin/              # Admin dashboard pages
│   ├── promotions/     # Promotional deals management
│   ├── menu/           # Menu catalog management
│   └── ...
├── api/                # API routes
│   ├── admin/          # Admin-only endpoints
│   └── customer/       # Public customer endpoints
└── r/[slug]/           # Public restaurant menu pages

components/
├── ui/                 # shadcn/ui components
└── ...                 # Feature components

lib/
├── api/                # API utilities (permissions, helpers)
├── supabase/           # Supabase client configuration
├── hooks/              # Custom React hooks
└── Documentation/      # Technical documentation

types/
└── *.ts                # TypeScript type definitions

hooks/
└── *.ts                # React Query hooks
```

## 🎯 Key Features

- ✅ Multi-tenant restaurant management (961 restaurants)
- ✅ Menu management with modifiers & inventory tracking
- ✅ Promotional deals & coupons system
- ✅ Franchise/chain hierarchy management
- ✅ Restaurant-location-specific permissions
- ✅ Domain verification & SSL monitoring
- ✅ Onboarding tracking (8-step process)
- ✅ Public menu pages with shopping cart
- ✅ Admin dashboard with analytics

## 🔑 Environment Variables

Required secrets (use Replit Secrets):
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_BRANCH_DB_URL=<direct-postgres-connection>
```

## 🛠️ Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio (database GUI)
npm test             # Run tests
```

## 📖 Common Tasks

### Adding a New API Endpoint
1. Review **[API Architecture Guide](lib/Documentation/API_ARCHITECTURE_GUIDE.md)**
2. Follow authentication/authorization patterns
3. Add Zod validation schema
4. Create React Query hook
5. Update API Architecture Guide

### Adding a New Feature
1. Check **Frontend Guides** for relevant patterns
2. Follow restaurant permission model (if applicable)
3. Use TypeScript types from `Database` type
4. Add to documentation

### Working with Promotions
See **[Marketing & Promotions Guide](lib/Documentation/Frontend-Guides/Marketing%20&%20Promotions/Marketing%20&%20Promotions%20features.md)**

### Menu Management
See **[Menu Catalog Refactoring Guide](lib/Documentation/Frontend-Guides/Menu-refatoring/SANTIAGO_REFACTORED_BACKEND_GUIDE.md)**

## 🤝 Contributing

1. Read the **[API Architecture Guide](lib/Documentation/API_ARCHITECTURE_GUIDE.md)**
2. Follow existing patterns and conventions
3. Update documentation when adding features
4. Test thoroughly before deploying

## 📞 Support

Questions about the codebase? Check the documentation first:
- API questions → **[API Architecture Guide](lib/Documentation/API_ARCHITECTURE_GUIDE.md)**
- Database questions → **[SUPABASE_CONFIG.md](SUPABASE_CONFIG.md)**
- Feature implementation → **Frontend Guides**

---

**Last Updated:** November 4, 2025  
**Platform:** Menu.ca v3 Restaurant Ordering System
