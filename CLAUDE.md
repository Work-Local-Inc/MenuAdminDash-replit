<!-- MEMORY:START -->
# MenuAdminDash-replit

_Last updated: 2026-02-10 | 12 active memories, 33 total_

## Architecture
- Memory tracking system (memory-mcp) initialized with global hooks and project-level configuration in `.memory/` and `... [setup, tooling]
- Project uses Next.js 14, React 18, Tailwind, shadcn/ui for frontend with Supabase PostgreSQL backend and Stripe payments [frontend, backend, stack]
- Implemented tablet order processing flow with polling mechanism checking tablet status every 5 seconds via `/api/tabl... [orders, tablet, reliability]

## Key Decisions
- Reconsider previous decision that SSH is not needed for project, exploring direct SSH access to Replit for advanced l... [ssh, debugging]
- Planning Twilio-based fallback notification system to alert restaurant staff when tablet goes offline during order pr... [orders, failover, communication]
- Implemented Supabase Auth with comprehensive Role-Based Access Control (RBAC), prioritizing data isolation for multi-... [authentication, access-control, security]
- Modified order processing code to store and lookup modifier prices using compound keys that include both modifier ID ... [order-processing, pricing-strategy]

## Patterns & Conventions
- Created a standardized BACKLOG.md tracking file in AI-AGENTS-START-HERE folder with predefined sections and usage tem... [documentation, workflow]
- Implemented comprehensive price lookup refactoring in order routes with dynamic modifier pricing, supporting compound... [pricing, order-route, refactoring]

## Gotchas & Pitfalls
- Stripe error logging requires external dashboard access (Stripe, Replit, Supabase), not just local log files [debugging, logging, payments]
- Modifier price lookup in order creation routes requires careful mapping of modifier size variants, using compound key... [pricing, order-processing, error-handling]

_For deeper context, use memory_search, memory_related, or memory_ask tools._
<!-- MEMORY:END -->
