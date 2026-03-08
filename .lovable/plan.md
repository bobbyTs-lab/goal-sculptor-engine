# GoalForge — Goal Setting & Workout Progressive Overload App

## Visual Identity

- **Color palette**: Deep greens and golds with transgressive alien-style gradients (emerald → toxic green → gold shifts)
- **Typography**: Medieval/old-English style display font (e.g., OLDENGLISH from Google Fonts) for headings, clean Rockwell for body
- **UI feel**: Dark base with glowing green/gold gradient accents, organic alien textures, bold and unconventional

## Section 1: Goal Setting System (Hierarchical Structure)

### Goal → Phase → Task → To-Do hierarchy

- **Goals**: Top-level objectives with title, description, deadline, and progress ring
- **Phases**: Time-bound milestones within a goal (e.g., "Foundation", "Growth", "Mastery")
- **Tasks**: Actionable items within each phase with status tracking
- **To-Dos**: Granular checklist items within each task

### Features

- Collapsible tree view to navigate the full hierarchy
- Progress auto-calculates upward (to-dos → tasks → phases → goals), wen making a goal it asks you for your end goal, then asks you to split it what it would look like in phases, then it gives you a prompt to give to your own AI agent to generate the tasks and To-DOs. then you can put those in aswell.
- Drag to reorder phases, tasks, and to-dos
- Color-coded status badges (not started, in progress, complete)
- Dashboard with all active goals and overall completion stats

## Section 2: Workout Progressive Overload Engine

### Philosophy: Compound-first, minimal exercises

- Focus on the "Big 5-6" compounds: Squat, Deadlift, Bench Press, Overhead Press, Barbell Row, Pull-Up
- Optional accessory slots (max 1-2 per session)

### Smart Progressive Overload Formula

An intelligent algorithm that tracks and auto-suggests progression:

- **Dual progression model**: First increase reps within a range (e.g., 3×6→3×8), then jump weight and reset reps
- **Volume load tracking**: Weight × Reps × Sets over time, visualized in charts
- **Fatigue-adjusted suggestions**: If you hit all target reps → suggest weight increase; if you miss reps → hold or deload
- **Auto-deload detection**: After 2-3 sessions of stalling, suggest a deload week (reduce volume 40-50%)
- **RPE/difficulty logging**: Simple 1-5 difficulty rating per set to feed the algorithm

### Workout UI

- **Session view**: Clean card-based layout showing today's exercises, target weight/reps, and input fields for actual performance
- **History timeline**: Visual chart showing weight progression per lift over weeks/months (Recharts)
- **Personal records board**: Highlight PRs with gold glow effects
- **Rest timer**: Built-in configurable rest timer between sets
- **Weekly planner**: Simple 3-4 day split view (e.g., Push/Pull/Legs or Upper/Lower)

### Data Visualizations

- Line charts for weight progression per exercise
- Volume load bar charts per week

## Navigation

- Sidebar or tab-based navigation between "Goals" and "Workouts" sections
- All data stored in localStorage with JSON export option