<!-- MEMORY:START -->
# MenuAdminDash-replit

_Last updated: 2026-02-05 | 20 active memories, 21 total_

## Architecture
- Memory tracking system (memory-mcp) initialized with global hooks and project-level configuration in `.memory/` and `... [setup, tooling]
- Project uses Next.js 14, React 18, Tailwind, shadcn/ui for frontend with Supabase PostgreSQL backend and Stripe payments [frontend, backend, stack]
- Implemented tablet order processing flow with polling mechanism checking tablet status every 5 seconds via `/api/tabl... [orders, tablet, reliability]

## Key Decisions
- Selected Supabase Auth with Role-Based Access Control (RBAC) supporting Super Admin and Restaurant Admin roles [auth, access-control]
- Prioritize Role-Based Access Control (RBAC) implementation over edge function reliability due to critical data isolat... [security, priority, rbac]
- Simplified admin dropdown menu by removing redundant 'Settings' option, keeping only 'Profile' and 'Log out' [ui, navigation]
- Reconsider previous decision that SSH is not needed for project, exploring direct SSH access to Replit for advanced l... [ssh, debugging]
- Planning Twilio-based fallback notification system to alert restaurant staff when tablet goes offline during order pr... [orders, failover, communication]

## Patterns & Conventions
- Project memories will be automatically captured and synced after each conversation response [workflow, documentation]
- Created a standardized BACKLOG.md tracking file in AI-AGENTS-START-HERE folder with predefined sections and usage tem... [documentation, workflow]
- Generated SSH key for Replit connection using ed25519 algorithm with custom naming convention 'claude-code-replit' [ssh, authentication]
- Generated new SSH key for Replit with simplified 'claude' comment to troubleshoot key submission issues [ssh, key-generation]
- Created new SSH key file named 'replit_new' for connecting to Replit instance, different from previous 'replit' key [ssh, remote-access]
- Created heartbeat system with `POST /api/tablet/heartbeat` endpoint tracking `last_check_at` to monitor tablet connec... [monitoring, reliability]

## Gotchas & Pitfalls
- Stripe error logging requires external dashboard access (Stripe, Replit, Supabase), not just local log files [debugging, logging, payments]
- Replit SSH access requires manual configuration through UI and generates dynamic connection credentials that must be ... [infrastructure, security]
- SSH public key must be pasted as a single line, with key type (ssh-ed25519), key data, and optional comment all on th... [ssh, key-management]
- SSH key generation might require minimalist comments to prevent submission errors in Replit's interface [ssh, troubleshooting]
- Replit SSH sessions might require '-T' flag for stable terminal interaction and disable pseudo-terminal allocation [ssh, remote-debugging]

_For deeper context, use memory_search, memory_related, or memory_ask tools._
<!-- MEMORY:END -->
