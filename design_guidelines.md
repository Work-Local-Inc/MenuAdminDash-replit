# Design Guidelines for Menu.ca Admin Dashboard

## Design Approach

**Selected Approach**: Design System + Reference-Based Hybrid

**Primary References**: 
- Linear (clean, modern dashboard aesthetics)
- Vercel Dashboard (minimalist data presentation)
- Stripe Dashboard (sophisticated data tables)
- Notion (intuitive forms and organization)

**Rationale**: This is a utility-focused, data-intensive admin platform requiring consistency, efficiency, and learnability. We'll build on shadcn/ui's component library while drawing inspiration from industry-leading admin dashboards for proven patterns.

---

## Core Design Elements

### A. Color Palette

**Light Mode**:
- **Background**: 0 0% 100% (pure white)
- **Surface**: 0 0% 98% (slight gray for cards/panels)
- **Border**: 0 0% 90% (subtle borders)
- **Primary**: 222 47% 11% (deep navy/black for text and primary actions)
- **Accent**: 221 83% 53% (vivid blue for interactive elements, links, active states)
- **Success**: 142 71% 45% (green for positive actions, active restaurants)
- **Warning**: 38 92% 50% (amber for pending states)
- **Destructive**: 0 72% 51% (red for suspended/cancelled)
- **Muted Text**: 0 0% 45% (gray for secondary text)

**Dark Mode**:
- **Background**: 222 47% 11% (deep navy)
- **Surface**: 217 33% 17% (elevated panels)
- **Border**: 217 19% 27% (subtle borders)
- **Primary**: 0 0% 98% (near-white text)
- **Accent**: 221 83% 53% (same vivid blue)
- **Success**: 142 71% 45% (consistent green)
- **Warning**: 38 92% 50% (consistent amber)
- **Destructive**: 0 72% 51% (consistent red)
- **Muted Text**: 0 0% 65% (lighter gray)

### B. Typography

**Font Families**:
- Primary: Inter (via Google Fonts) - clean, readable, modern
- Monospace: JetBrains Mono - for order IDs, timestamps, code

**Type Scale**:
- **Display** (Dashboard titles): text-3xl (30px), font-bold
- **Heading 1** (Section titles): text-2xl (24px), font-semibold
- **Heading 2** (Card titles): text-lg (18px), font-medium
- **Body**: text-sm (14px), font-normal
- **Small** (Table data, captions): text-xs (12px), font-normal
- **Mono** (IDs, timestamps): text-xs, font-mono

### C. Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8** consistently
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Card gaps: gap-4
- Form field spacing: space-y-4

**Grid System**:
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Data tables: Full width with horizontal scroll
- Forms: max-w-2xl for single column, grid-cols-2 for split layouts
- Sidebar width: w-64 (256px) on desktop, collapsible on mobile

**Container Strategy**:
- Main content: max-w-7xl mx-auto px-4
- Modal forms: max-w-2xl
- Wide tables: Full viewport width with inner padding

### D. Component Library

**Navigation & Layout**:
- **Sidebar**: Fixed left sidebar (w-64) with collapsible groups, icons from Lucide React
- **Top Header**: Sticky header (h-16) with breadcrumbs, search, user menu
- **Breadcrumbs**: text-sm with slash separators, last item bold
- **Tabs**: Underline style (Linear-inspired) for sub-navigation

**Data Display**:
- **Tables**: shadcn/ui DataTable with sortable columns, row selection, pagination
- **Status Badges**: Rounded pills (rounded-full) with color coding (green=active, amber=pending, red=suspended, gray=inactive)
- **Stat Cards**: White cards with large numbers, small labels, icon in corner, subtle hover lift
- **Charts**: Recharts line/bar charts with accent color, grid lines, responsive tooltips

**Forms & Input**:
- **Input Fields**: Border style with focus ring in accent color, h-10 standard height
- **Select Dropdowns**: shadcn/ui Select with search for long lists
- **Date Pickers**: shadcn/ui Calendar for date ranges
- **File Upload**: Drag-and-drop zones with preview thumbnails
- **Multi-step Forms**: Progress stepper at top, next/previous buttons

**Overlays**:
- **Dialogs**: Centered modals with backdrop blur, max-w-2xl
- **Sheets**: Slide-in panels from right for quick edits (w-96)
- **Dropdowns**: shadcn/ui DropdownMenu for actions
- **Tooltips**: Small, dark tooltips on hover for icon buttons

**Feedback**:
- **Toast Notifications**: Top-right corner, 4s auto-dismiss, shadcn/ui Sonner
- **Loading States**: Skeleton screens for tables, spinner for buttons
- **Empty States**: Centered illustration + text + CTA button

### E. Patterns & Interactions

**Dashboard Overview**:
- 4-column stat card grid at top (Total Orders, Revenue, Active Restaurants, New Users)
- Revenue chart below (full width, h-80)
- Recent orders table + Top restaurants side-by-side (60/40 split)

**List Views** (Restaurants, Orders, Users):
- Filters in top bar (dropdowns for province, city, status, date range)
- Search input with debounce
- Bulk action toolbar appears when rows selected
- Pagination at bottom with page size selector

**Detail/Edit Views**:
- Tab navigation for subsections (15 tabs for restaurant edit)
- Sticky header with Save/Cancel buttons
- Auto-save indicators
- Validation errors inline with red text

**Map Integration** (Delivery Areas):
- Full-screen Mapbox canvas
- Draw polygon controls in top-left
- Restaurant marker at center
- Distance radius overlay

**Real-time Updates**:
- Live order feed with WebSocket connection
- New order toast notifications
- Auto-refresh indicator in top-right

### F. Accessibility

- Maintain WCAG AA contrast ratios (4.5:1 for text)
- Keyboard navigation with visible focus states
- ARIA labels for icon-only buttons
- Dark mode respects system preference but user-toggleable
- Form inputs with proper labels and error announcements

### G. Responsive Behavior

**Mobile (< 768px)**:
- Sidebar collapses to hamburger menu
- Stat cards stack vertically (grid-cols-1)
- Tables horizontal scroll with sticky first column
- Tabs scroll horizontally

**Tablet (768px - 1024px)**:
- Sidebar remains visible
- 2-column grids where applicable
- Reduced padding (p-4 instead of p-6)

**Desktop (> 1024px)**:
- Full layout with sidebar
- 4-column grids
- Generous spacing (p-6 to p-8)

---

## Key Design Principles

1. **Data Clarity**: Prioritize readability of tables and numbers over decorative elements
2. **Efficient Workflows**: Minimize clicks with inline editing, bulk actions, keyboard shortcuts
3. **Consistent Patterns**: Reuse components across sections for familiarity
4. **Progressive Disclosure**: Show essential info first, details on demand
5. **Trustworthy Design**: Professional, stable aesthetics that inspire confidence