# GoalForge — Improvised Improvements

After reviewing the full codebase, here are creative improvements that add real value and lean into the gothic alien aesthetic:

## 1. Workout Streak Tracker & Consistency Heatmap

- Add a human body diagram, with  mucsles, they all start green and then indivualy grow to gold as the users maxs improve, make the body an interactable chart also make sure that muscles turn gold at a solid ratio that aligns with standard weightlifting ratios. 
- Green/gold intensity based on session volume that day
- Stored by parsing existing session dates — no new data needed
- streak counter with elepphants

## 2. Session History Log (Missing Feature)

- Currently sessions are logged but there's no way to **view past sessions**
- Add a "History" tab to the Workouts page showing a reverse-chronological list of all sessions
- Each card shows date, split day, exercises, total volume, and an expand to see individual sets
- Ability to delete old sessions

## 3. Data Import + Export Panel

- Export already exists as a function but has **no UI**
- Add a Settings/Data page accessible from the sidebar
- "Export All Data" button that downloads a JSON file
- "Import Data" with file upload and merge/replace options
- "Clear All Data" with a confirmation dialog

## 4. Motivational cutom Quotes Banner

- A rotating gothic-themed motivational quote on the dashboard hero section
- Quotes cycle on each visit with a flicker-in animation
- this is only there until the uer toggles t on in setttings and sets the quotes himself

## 5. Goal Deadline Countdown & Urgency Indicators

- Show "X days remaining" on each goal card, set deadlines and timeframing for individual phases and tasks and todos as well
- Color-coded urgency: gold (plenty of time), green (on track), red glow (overdue or <7 days)
- Overdue goals get a pulsing red border animation

## 6. Animated Progress Rings (Replace Progress Bars)

- Replace the flat `<Progress>` bars on the dashboard and goal cards with SVG circular progress rings
- Green-to-gold gradient stroke that glows brighter as completion increases
- Animated fill on mount using framer-motion

## Technical Approach

### New files:

- `src/components/StreakHeatmap.tsx` — SVG grid heatmap + streak counter
- `src/components/ProgressRing.tsx` — Animated circular progress SVG
- `src/pages/Settings.tsx` — Data export/import/clear UI

### Modified files:

- `src/pages/Index.tsx` — Add heatmap, progress rings, motivational quotes
- `src/pages/Goals.tsx` — Deadline countdowns, urgency borders, progress rings
- `src/pages/Workouts.tsx` — Add "History" tab with session list
- `src/components/layout/AppSidebar.tsx` — Add Settings nav link
- `src/App.tsx` — Add Settings route
- `src/lib/storage.ts` — Add `importAllData` and `clearAllData` functions
- `src/index.css` — Add urgency pulse animations and heatmap cell styles