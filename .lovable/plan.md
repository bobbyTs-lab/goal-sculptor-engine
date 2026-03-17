

# Home Screen & Body Diagram Overhaul

## What Changes

### 1. `src/pages/Index.tsx` — Full Rewrite
Strip to 3 clean sections, no clutter:

**A. Greeting Bar**
- Left: time-of-day greeting ("Good morning"), small "GoalForge" subtitle
- Right: settings gear icon (links to /settings)
- No hero, no decorative dividers, no motivational quote

**B. Today's Workout Card**
- Full-width card with split name, exercise badges, and "Start" button
- If rest day: calm "Rest Day" card with a different treatment
- If no plan exists: "Set up your program →" CTA linking to /program

**C. Stats Strip**
- Single horizontal row of 4 pill items (not 4 separate cards)
- Goals | Sessions | Badges | Volume — compact, inline, minimal

**D. Body Diagram — Full Width Centerpiece**
- Takes remaining vertical space
- Tap a muscle → slide-up detail panel (replaces hover side panel)
- No Card wrapper, no side-by-side with StrengthRadar

**Removed from home:** MotivationalQuotes, AchievementSystem, StrengthRadar, quick-link cards, dividers, EmberStagger/EmberCard wrappers.

### 2. `src/components/BodyDiagram.tsx` — Full Rewrite

Replace the current abstract SVG with a realistic anatomical muscle figure:

- **Front-view standing pose** (arms slightly out, not Vitruvian spread) using detailed SVG paths for ~12 muscle groups: traps, deltoids, pectorals, biceps, triceps, forearms, rectus abdominis, obliques, quadriceps, hamstrings (inner thigh visible from front), glutes (hip area), calves
- Each muscle group is a separate clickable path with realistic anatomical contours
- Remove the Vitruvian circle/square/spiral decorations
- Remove hover-based interaction; use `onClick` + `useState` for selected muscle
- Selected muscle detail appears as an animated bottom sheet/panel below the diagram (slide up with framer-motion)
- Keep existing color logic (green→gold gradient based on PR ratio)
- Make SVG responsive: full-width on mobile, max-width ~320px centered
- Default state shows top-5 muscle ranking list below the figure

### 3. Removed Animations
Strip `EmberCard`, `EmberStagger`, `EmberText`, `FlickerIn` wrappers from the home page. Use simple `motion.div` fade-ins for subtlety instead of the heavy gothic animation system.

## Files Touched
- `src/pages/Index.tsx` — rewrite
- `src/components/BodyDiagram.tsx` — rewrite
- No changes to StrengthRadar, AchievementSystem, or MotivationalQuotes (they just stop being imported on the home page)

