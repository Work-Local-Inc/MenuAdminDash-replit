<!-- MEMORY:START -->
# MenuAdminDash-replit

_Last updated: 2026-01-28 | 5 active memories, 5 total_

## Architecture
- Memory tracking system (memory-mcp) initialized with global hooks and project-level configuration in `.memory/` and `... [setup, tooling]
- Project uses Next.js 14, React 18, Tailwind, shadcn/ui for frontend with Supabase PostgreSQL backend and Stripe payments [frontend, backend, stack]

## Key Decisions
- Selected Supabase Auth with Role-Based Access Control (RBAC) supporting Super Admin and Restaurant Admin roles [auth, access-control]
- Prioritize Role-Based Access Control (RBAC) implementation over edge function reliability due to critical data isolat... [security, priority, rbac]

## Patterns & Conventions
- Project memories will be automatically captured and synced after each conversation response [workflow, documentation]

_For deeper context, use memory_search, memory_related, or memory_ask tools._
<!-- MEMORY:END -->
