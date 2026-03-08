

# Program Builder Innovation Plan

## Current State
The Program Builder has two tabs: a workout day planner (Mon-Sun split/exercise assignment) and a basic "Weekly Goals" tab that just lists pending to-dos from the goal system. The goals tab is flat and passive — no way to plan, schedule, or interact with items.

## Innovations

### 1. Daily Planner with Time Blocks
Transform the Weekly Goals tab into an interactive **daily planner** where users can assign to-dos to specific days of the week and optionally time-slot them (morning/afternoon/evening). Each day shows both workout info AND goal tasks side-by-side.

- **Unified day view**: Each day card shows the workout split on top + assigned goal to-dos below
- **Drag to-dos into days**: Pick from a "backlog" of pending to-dos and assign them to Mon-Sun
- **Time slots**: Morning / Afternoon / Evening sections per day for rough scheduling
- Persist assignments in a new `weeklySchedule` storage key

### 2. Week-at-a-Glance Dashboard
Replace the separate tabs with a single **unified weekly timeline** view:

- 7-column grid (compact on mobile as scrollable row)
- Each column shows: split badge, exercise count, assigned to-do count, completion checkmarks
- Color intensity indicates load (rest = dim, heavy day = bright)
- Click a day to expand its detail panel below

### 3. Smart To-Do Aggregation with Context
Enrich the to-do display with actionable context:

- **Goal progress bar** next to each goal section
- **Phase indicator** showing which phase each to-do belongs to
- **Deadline proximity** badges (overdue / due today / this week / upcoming)
- **Quick-complete toggle** — check off to-dos directly from the planner without navigating to Goals page
- **Workload score** per day: sum of workout exercises + to-dos = a "load" number to balance the week

### 4. Weekly Focus / Priority Picker
A top-level "This Week's Focus" section:

- Pick 1-3 goals to prioritize this week (starred)
- Starred goals' to-dos appear first and are highlighted
- Weekly summary stats: X to-dos planned, Y completed, Z overdue

## Technical Approach

### New Storage
- `weeklySchedule`: `Record<string, string[]>` mapping day names to to-do IDs
- `weeklyFocus`: `string[]` of prioritized goal IDs

### Modified Files
- **`src/pages/Program.tsx`** — Major rewrite: unified week view, daily planner, quick-complete toggles, focus picker
- **`src/lib/storage.ts`** — Add `weeklySchedule` and `weeklyFocus` storage functions
- **`src/hooks/useGoals.ts`** — No changes needed (toggleToDo already exists)

### UI Structure
```text
┌─────────────────────────────────────────────┐
│  This Week's Focus: [Goal A ★] [Goal B ★]  │
│  Stats: 12 planned · 4 done · 2 overdue     │
├─────────────────────────────────────────────┤
│ Mon    Tue    Wed    Thu    Fri   Sat   Sun  │
│ Push   Pull   Rest   Legs  Push  Pull  Rest  │
│ 3 ex   3 ex   —     2 ex  3 ex  3 ex   —    │
│ 4 todo 2 todo 1 todo 3 todo 0    1     1    │
├─────────────────────────────────────────────┤
│ ▼ Monday (expanded)                          │
│ ┌──────────┐ ┌──────────────────────────┐   │
│ │ WORKOUT  │ │ GOALS & TO-DOS           │   │
│ │ Push     │ │ ☐ Research gym equipment  │   │
│ │ Bench    │ │ ☐ Write meal plan         │   │
│ │ OHP      │ │ ☐ Schedule physio         │   │
│ │          │ │ ☐ Read chapter 3          │   │
│ │ [Start]  │ │                           │   │
│ └──────────┘ └──────────────────────────┘   │
├─────────────────────────────────────────────┤
│ Unassigned Backlog (14 pending to-dos)      │
│ [Goal A] ☐ item... ☐ item...  [+ assign]   │
└─────────────────────────────────────────────┘
```

### Key Interactions
- Click day in the 7-column header to expand it
- "Assign" button on backlog to-dos opens a day picker popover
- Checkbox on any to-do calls `toggleToDo()` directly
- Focus picker is a multi-select of active goals, persisted to storage
- Workload balancing: if a day has 5+ items, show a yellow "heavy day" indicator

