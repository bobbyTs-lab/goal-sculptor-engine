# Daily Time Blocks: Drag-and-Drop, Overlapping Blocks & Backlog Linking

## What's Changing

Rewrite `DailyTimeBlocks.tsx` to support three major upgrades:

### 1. Drag-and-Drop Repositioning

- Use native pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`) on each block for drag-to-reposition — no external library needed.
- On drag start, capture the offset between pointer and block top. On move, snap to nearest 30-min slot. On release, commit new `startHour`/`startMinute`.
- Dragging block gets `z-30`, slight scale-up, and reduced opacity for visual feedback.
- Remove the ChevronUp/ChevronDown arrow buttons since drag replaces them.

### 2. Overlapping / Concurrent Blocks (AreaBook-style columns)

- Currently blocks are positioned absolutely with `left-16 right-2`, so they always overlap visually if they share a time slot.
- Implement a **column-packing algorithm**: for each time range, detect overlapping blocks, assign each a column index, then divide the horizontal space evenly (e.g., 2 overlapping blocks each get 50% width, 3 get 33%).
- This mirrors how AreaBook and Google Calendar handle concurrent events.
- Algorithm: sort blocks by start time, track active blocks, assign column indices, compute `left` and `width` per block.
- time alotments can go alll the way down to 5 minutes

### 3. Backlog-to-Block Linking

- Add a "Link Todo" button inside the block edit controls that opens a popover listing pending backlog todos (from the parent `Program.tsx`).
- When a todo is linked, set `block.todoId` and `block.title` to the todo title. The block's checkbox then toggles the goal todo directly.
- New prop: pass `backlogTodos` (array of `{todoId, title, goalTitle}`) from `Program.tsx` into `DailyTimeBlocks`.
- Show a small "unlink" button if a todo is already linked.

### 4. Resize by Drag (Bottom Edge)

- Add a resize handle at the bottom of each block (a small grab bar).
- On pointer-down on the handle, track vertical movement and snap duration to 30-min increments.
- This replaces the +/- size buttons.

## Files Modified

`**src/components/DailyTimeBlocks.tsx**` — Major rewrite:

- Add `dragging` state (`{blockId, offsetY, startScrollTop}`)
- Add `resizingDrag` state for bottom-edge resize
- Column-packing layout function
- New `backlogTodos` prop and link popover
- Remove arrow/resize buttons, keep delete and category picker

`**src/pages/Program.tsx**` — Pass backlog data to `DailyTimeBlocks`:

- Add `backlogTodos` prop with `todoId`, `title`, `goalTitle` from the existing `backlog` array

`**src/lib/storage.ts**` — No changes needed (TimeBlock already has `todoId` and `done` fields).

## Column-Packing Algorithm (Key Logic)

```text
Input: blocks sorted by start time
For each block:
  - Find all blocks that overlap with it (startA < endB && startB < endA)
  - Assign to first available column (0, 1, 2...)
  - Track max columns in each overlap group
Output: each block gets { column: number, totalColumns: number }
  → left = 16 + (column / totalColumns) * availableWidth
  → width = availableWidth / totalColumns
```

## Interaction Model

- **Tap** a block to edit (title, category, link todo)
- **Drag** the block body to reposition vertically (snaps to 30-min grid)
- **Drag** the bottom edge to resize (snaps to 30-min increments, min 30 min)
- **Tap empty slot** to create a new block (unchanged)
- Blocks at the same time automatically spread into side-by-side columns