# AI Agent Knowledge Base
**Purpose:** Central knowledge repository for AI agents working on Menu.ca  
**Last Updated:** November 20, 2025

---

## 📖 Quick Start for Agents

**👋 New to this project?** Read these in order:

1. **`AGENT_MEMORY_BANK.md`** ⭐ START HERE
   - Git workflow (MUST follow)
   - Database & schema overview
   - Common bugs & fixes
   - Environment variables
   - Testing patterns

2. **`DATABASE_SCHEMA_QUICK_REF.md`**
   - Complete schema structure
   - All tables and columns
   - Created by Replit Agent

3. **`CHECKOUT_SCHEMA_REFERENCE.md`**
   - Checkout-specific patterns
   - Pricing architecture
   - Validation logic
   - SQL query examples

---

## 🗂️ File Organization

```
.ai-agents/
├── README.md (this file)
├── AGENT_MEMORY_BANK.md ⭐ Read this first!
├── DATABASE_SCHEMA_QUICK_REF.md
└── CHECKOUT_SCHEMA_REFERENCE.md
```

---

## 🚨 Critical Rules (Never Break These)

1. **Git Workflow:**
   - Pull BEFORE making changes: `git pull origin main --no-rebase`
   - Push AFTER committing: `git push origin main`

2. **Database:**
   - ONLY use Supabase (not Neon, not local)
   - ALL clients need: `db: { schema: 'menuca_v3' }`
   - NEVER hardcode schema in queries

3. **Schema:**
   - Dishes: prices in `dish_prices` table (NOT in dishes table)
   - Modifiers: prices in `dish_modifier_prices` table (may not exist = free)
   - Restaurants: NO `slug` column (extract ID from slug)

4. **Before Any Database Work:**
   - Check if column exists
   - Check if table exists
   - Verify with Supabase MCP if unsure

---

## 🔍 How to Use These Docs

### When Starting Work
```
1. Read AGENT_MEMORY_BANK.md (5 min)
2. Pull from git
3. Check relevant schema in DATABASE_SCHEMA_QUICK_REF.md
4. Start coding
```

### When Debugging
```
1. Read error message carefully
2. Check AGENT_MEMORY_BANK.md "Common Bugs" section
3. Verify schema in DATABASE_SCHEMA_QUICK_REF.md
4. Use Supabase MCP to check actual data
5. Fix and document the solution
```

### When Adding Features
```
1. Pull from git first
2. Read existing code
3. Check schema for required columns
4. Implement feature
5. Test thoroughly
6. Update AGENT_MEMORY_BANK.md with new patterns
7. Commit and push
```

---

## 🤖 Agent-Specific Notes

### For Replit Agent
- You have direct access to the live environment
- Always pull before starting new tasks
- Your commits auto-push (good!)
- Read `AGENT_MEMORY_BANK.md` at session start

### For Cursor Agent
- You work in local/sync environment
- Use Supabase MCP for schema exploration
- Pull Replit's changes regularly
- Focus on code review and debugging

### For Future Agents
- This folder contains everything you need
- Start with `AGENT_MEMORY_BANK.md`
- When in doubt, check the schema
- Document new patterns you discover

---

## 📈 Maintenance

### When to Update These Docs
- ✅ After fixing a bug (add to "Common Bugs")
- ✅ After schema changes (update schema refs)
- ✅ After adding new patterns (add to memory bank)
- ✅ After environment changes (update secrets list)

### Who Updates
- Any agent can update these docs
- Commit with clear message: "Update agent docs: <what changed>"
- Keep it concise and scannable

---

## 💬 Feedback Loop

**Found an issue with these docs?**
- Add a note here with date
- Describe what was unclear
- Suggest improvement

**Issues Log:**
- None yet (created Nov 20, 2025)

---

**Remember:** These docs exist to make YOUR life easier. Keep them updated and they'll save you hours of debugging! 🚀

