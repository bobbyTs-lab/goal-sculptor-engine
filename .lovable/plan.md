

# AI Prompt Generator + Paste-Back Auto-Importer

## Concept
Two-step offline AI workflow — no in-app AI calls:

1. **Generate Prompt** — produces a hyper-specific prompt that instructs the external AI to return a strictly formatted, dated plan
2. **Paste Back** — a textarea where you paste the AI's response, parser reads the structured format and bulk-creates all phases, tasks, and to-dos with deadlines automatically

## What Changes

### 1. Upgraded Prompt Generator
The current `generateAIPrompt` produces a vague prompt. Replace it with one that:
- Includes the goal's deadline so the AI can distribute dates
- Specifies an **exact parseable format** (e.g. `PHASE|title|description|YYYY-MM-DD`, `TASK|title|description|YYYY-MM-DD`, `TODO|title|YYYY-MM-DD`)
- Requires deadlines on every single item, distributed across the goal timeline
- Tells the AI the exact number of phases already created (or to generate new ones)

Example output format the prompt demands:
```
PHASE: Foundation | Research and planning | 2026-04-15
  TASK: Research competitors | Analyze top 5 competitors | 2026-04-01
    TODO: List competitor features | 2026-03-20
    TODO: Write comparison doc | 2026-03-25
  TASK: Set up tools | Install required software | 2026-04-10
    TODO: Install IDE | 2026-04-05
```

### 2. Paste-Back Parser + Import
Add a second tab/step in the AI Prompt dialog:
- **Tab 1: "Copy Prompt"** — the generated prompt (existing, but upgraded)
- **Tab 2: "Import Response"** — textarea to paste the AI's output
- Parser reads the indented `PHASE:/TASK:/TODO:` format line-by-line
- Preview the parsed result as a tree before importing
- "Import All" button calls `addPhase`, `addTask`, `addToDo` in sequence with all parsed deadlines

### 3. Parser Logic
Simple line-by-line parser:
- Lines starting with `PHASE:` → new phase (split by `|` for title, description, deadline)
- Lines starting with `TASK:` (indented) → new task under current phase
- Lines starting with `TODO:` (indented further) → new todo under current task
- Trim whitespace, validate dates, skip malformed lines with warnings

## Files Modified

- **`src/pages/Goals.tsx`** — Replace AI prompt dialog with tabbed dialog (Copy Prompt / Import Response), upgraded `generateAIPrompt`, new `parseAIResponse` function, preview tree, and bulk import logic
- No other files need changes — uses existing `addPhase`, `addTask`, `addToDo` hooks

## UI Flow
```text
┌─────────────────────────────────────────┐
│  AI Goal Builder                        │
│  ┌──────────┐ ┌───────────────┐         │
│  │ 1. Prompt │ │ 2. Import     │        │
│  └──────────┘ └───────────────┘         │
│                                         │
│  Tab 1:                                 │
│  ┌─────────────────────────────────┐    │
│  │ [Generated prompt text...]      │    │
│  └─────────────────────────────────┘    │
│  [Copy Prompt]                          │
│                                         │
│  Tab 2:                                 │
│  ┌─────────────────────────────────┐    │
│  │ [Paste AI response here...]     │    │
│  └─────────────────────────────────┘    │
│  [Parse]                                │
│                                         │
│  Preview:                               │
│  ▸ Phase: Foundation (Apr 15)           │
│    ▸ Task: Research (Apr 1)             │
│      ☐ Todo: List features (Mar 20)    │
│      ☐ Todo: Write doc (Mar 25)        │
│                                         │
│  [Import All — 4 phases, 12 tasks, 36 todos] │
└─────────────────────────────────────────┘
```

