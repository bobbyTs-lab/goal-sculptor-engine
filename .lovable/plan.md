# GoalForge — Next-Level Innovation Ideas

After reviewing the full codebase, here are 6 high-impact features that would meaningfully elevate the app:

---

## 1. Weekly Program Builder with Auto-Scheduling

Currently `WeeklyPlan` exists as a type but has **zero UI**. Build a full weekly program planner:

- Drag-and-drop (or select-based) day planner: assign exercises to Mon-Sun
- Auto-suggest split balance (e.g. warn if pulling 3x/week but pushing 1x)
- "Start Today's Workout" button that pre-loads the correct exercises for that day of the week
- Visual weekly grid on the dashboard showing completed vs planned days
- Another whole weekly planner specifically with the goal section, a huge copiedum of ther "to-dos" for the week and a detailed daily planner to fit the todos into

**Files:** New `src/pages/Program.tsx`, modify `src/pages/Index.tsx` (today's workout widget), sidebar nav, App.tsx route

---

## 2. Achievement / Badge System with Unlockable Ranks

A gamification layer that awards gothic-themed badges:

- **Milestone badges**: "First Blood" (first session), "Century" (100 sessions), "Plate Club" (225 bench / 315 squat / 405 deadlift)
- **Volume badges**: Total tonnage milestones (100k, 500k, 1M lbs moved)
- Badges display as a trophy case on the dashboard with locked/unlocked states
- Unlocking triggers a gothic animation (ember burst + flicker)

**Files:** New `src/components/AchievementSystem.tsx`, new `src/lib/achievements.ts` (badge definitions + check logic), modify Index.tsx

---

## 3. 1RM Calculator & Strength Standards Comparison

Add an interactive calculator/comparison tool:

- Estimate 1RM from any logged set using Epley/Brzycki formulas
- Compare against strength standards (beginner → elite) based on bodyweight
- Bodyweight input in Settings, stored in AppSettings
- Show "You are X% toward Intermediate" per lift on the body diagram tooltips
- Radar/spider chart comparing all lifts normalized to standards

**Files:** New `src/lib/strength-standards.ts`, new `src/components/StrengthRadar.tsx`, modify Settings (bodyweight), modify BodyDiagram tooltips

---



---

## 5. Session Notes & Workout Templates

Enhance the workout logging experience:

- Add free-text notes per session ("felt strong", "left shoulder tight")
- Save any session as a reusable template ("My Push Day A")
- Quick-start from template: one click loads all exercises with last-used weights
- Template management in a new sub-tab under Workouts

**Files:** Modify `WorkoutSession` type (add `notes`, `templateName`), new template storage functions, modify Workouts.tsx (template tab + notes field)

---

## 6. Dark Parchment Theme with Parallax & Ambient Sound Toggle

Push the gothic aesthetic further:

- Aged parchment texture SVG background with subtle parallax on scroll
- Ambient crackling fire / dungeon ambience toggle in Settings (using Web Audio API with a short looping audio file URL)
- CRT monitor power-on animation when the app first loads

**Files:** Modify `src/index.css` (textures, cursor trail, boot animation), new `src/components/AmbientSound.tsx`, modify Settings (sound toggle), modify AppLayout (parallax wrapper)

---

## Recommended Priority Order

1. **Weekly Program Builder** — fills the biggest functional gap (WeeklyPlan type exists unused)
2. **1RM Calculator & Strength Radar** — deepens the lifting analytics
3. **Session Notes & Templates** — quality-of-life for regular users
4. **Theme enhancements** — polish layer

Each feature is independent and can be implemented one at a time.