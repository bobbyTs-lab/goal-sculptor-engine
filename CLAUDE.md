# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
```

To run a single test file:
```bash
npx vitest run src/path/to/file.test.ts
```

## Architecture

**TELOS** is a client-side-only React SPA for goal tracking and fitness. There is no backend — all data is persisted in `localStorage` via `src/lib/storage.ts`.

### Data Flow

User interaction → Page/Component → Custom Hook → `useState` + `localStorage` → Re-render

The two primary hooks are:
- `src/hooks/useGoals.ts` — manages the entire goal hierarchy
- `src/hooks/useWorkouts.ts` — manages workout sessions and exercise configs

### Goal Data Model

Goals have a strict hierarchy:
```
Goal → Phase[] → Task[] → ToDo[] | Habit[]
```
Types and utility functions for this hierarchy live in `src/types/goals.ts`.

### Workout Domain

Workout types are in `src/types/workout.ts`. Core domain logic lives in:
- `src/lib/progressive-overload.ts` — weight/rep progression suggestions
- `src/lib/achievements.ts` — badge/milestone evaluation
- `src/lib/strength-standards.ts` — strength benchmarks by bodyweight

### Storage Keys

All `localStorage` keys are prefixed `telos_`: `telos_goals`, `telos_sessions`, `telos_exercise_configs`, `telos_weekly_plan`, `telos_settings`, `telos_achievements`, `telos_weekly_schedule`, `telos_time_blocks`, `telos_repeatable_blocks`, `telos_contacts`.

### Routing & Layout

`src/App.tsx` defines routes. `src/components/layout/AppLayout.tsx` wraps all pages with `AppSidebar` (desktop) and `MobileTabBar` (mobile). Pages are in `src/pages/`.

### UI

Built on **shadcn/ui** (`src/components/ui/`) over Radix UI primitives, styled with Tailwind. Custom theme colors: coral, teal, violet, amber, sky. Dark mode uses the `class` strategy. Path alias `@/` maps to `src/`.

### TypeScript

The project uses loose TypeScript (`noImplicitAny: false`, `strictNullChecks: false`).

### Testing

Tests use Vitest + jsdom + Testing Library. Config is in `vitest.config.ts`; setup in `src/test/setup.ts`. Test coverage is currently minimal.
