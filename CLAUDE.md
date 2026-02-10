<!-- MEMORY:START -->
# MenuAdminDash-replit

_Last updated: 2026-02-10 | 19 active memories, 31 total_

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
- Created heartbeat system with `POST /api/tablet/heartbeat` endpoint tracking `last_check_at` to monitor tablet connec... [monitoring, reliability]
- Generated SSH keys for Replit connection with different naming conventions and troubleshooting approaches [ssh, replit, connection]
- Implemented comprehensive price lookup refactoring in both credit card and cash order routes to support compound key ... [pricing, database-mapping]
- Discovered precise pricing structure for Hot Peppers Modifiers and Meat Lovers Pizza with size-specific pricing varia... [pricing, menu]
- Implemented price lookup refactoring in order routes to support dynamic modifier pricing across different pizza sizes [orders, pricing]

## Gotchas & Pitfalls
- Stripe error logging requires external dashboard access (Stripe, Replit, Supabase), not just local log files [debugging, logging, payments]
- Replit SSH configuration requires careful management: manual UI setup generates dynamic connection credentials, publi... [ssh, deployment, replit]
- Modifier price lookup in order creation routes failed to handle size-based pricing variants, causing prices to defaul... [pricing, order-processing]
- Price lookup requires careful mapping of `modifier_size_variant_id` with specific price tiers for each dish and modif... [data-mapping, pricing]
- Order processing routes require careful modifier price lookup with compound keys including both modifier ID and size ... [pricing, orders]

_For deeper context, use memory_search, memory_related, or memory_ask tools._
<!-- MEMORY:END -->
