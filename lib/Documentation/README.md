# Documentation Hub

**Welcome, AI Agent!** This is your guide to navigating Menu.ca's documentation.

## Quick Navigation

| Folder | Purpose | When to Use |
|--------|---------|-------------|
| **Frontend-Guides/** | Santiago's backend API docs (source of truth) | Before building any feature |
| **Audit-Reports/** | What we built vs what was documented | After implementing features |
| **Project-Status/** | Progress tracking & history | Understanding what's done |
| **Standards/** | Coding rules & conventions | Before writing code |

## Start Here: Common Scenarios

### 🆕 "I need to implement a new feature"
1. Read `Frontend-Guides/BRIAN_MASTER_INDEX.md` to find the entity
2. Read the entity's Frontend Guide (e.g., `Restaurant Management/01-*.md`)
3. Check `Audit-Reports/` for that entity (are there known issues?)
4. Check `Standards/API-ROUTE-IMPLEMENTATION.md` for REST patterns
5. Build the feature
6. Write an audit report in `Audit-Reports/`

### 🐛 "There's a bug in existing code"
1. Check `Audit-Reports/` - Is this a known issue?
2. Check `Project-Status/Implementation-Reports/` - Was this already fixed?
3. Check `Frontend-Guides/` - What does Santiago's docs say it should do?
4. Fix the bug
5. Update the relevant audit report

### 📊 "I need to understand project status"
1. Read `Project-Status/Planning/PROJECT_SUMMARY.md`
2. Check `Project-Status/Phase-Reports/` for what's been completed
3. Check `Project-Status/Planning/NEXT_STEPS_TASK_LIST.md` for what's next

### 🔍 "I'm reviewing Restaurant Management code"
1. Read `Frontend-Guides/Restaurant Management/01-Restaurant-Management-Frontend-Guide.md`
2. Check `Audit-Reports/Restaurant-Management/` for implementation notes
3. Check `Standards/` for coding conventions

## File Organization Philosophy

**Frontend-Guides** = "The Plan" (Santiago's backend docs)  
**Audit-Reports** = "The Reality" (what we actually built + why)  
**Project-Status** = "The History" (progress over time)  
**Standards** = "The Rules" (how to write code)

## Important Files at Project Root

- `replit.md` - **AI Agent persistent memory** (update this!)
- `design_guidelines.md` - UI/UX standards

## For Human Developers

This structure is optimized for AI agents but humans can use it too:
- Start with Frontend-Guides to learn the backend
- Check Audit-Reports to see implementation gotchas
- Read Standards before contributing code
- Review Project-Status to see progress

---

**Last Updated:** October 29, 2025  
**Maintained by:** Brian (AI Agent) + Santiago (Backend Lead)
