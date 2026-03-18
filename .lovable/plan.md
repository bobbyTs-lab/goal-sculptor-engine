

# Body Diagram Overhaul + Background Texture Fix

## Two Issues to Address

### 1. Background Texture — Not Visible Enough
The current CSS has an inline SVG noise texture, but it's nearly invisible at 0.04 opacity. Fix: increase opacity, add a secondary texture layer, and use `background-attachment: fixed` so the texture doesn't tile in an obvious repeating pattern.

### 2. Body Diagram — Crude SVG Paths
The current muscle figure is just simple geometric curves that look like abstract blobs, not a real human. Need a complete replacement with a clean, modern fitness-app-style anatomical figure.

**Approach:** Build a proper front-view male anatomical silhouette with realistic muscle group shapes. Think of the style used in apps like JEFIT, Hevy, or Strong — a clean, slightly stylized human figure where each muscle group has anatomically accurate contours. Not hyper-realistic medical illustration, but clearly recognizable muscle shapes.

---

## Plan

### `src/index.css` — Enhanced Background Texture
- Increase noise opacity from `0.04` → `0.06`
- Add a second texture layer: a very faint dot grid pattern for paper feel
- Add subtle `background-size` variation to avoid obvious tiling
- Keep the vertical gradient (warm white top → slightly darker bottom)

### `src/components/BodyDiagram.tsx` — Full SVG Rewrite
Replace all `MUSCLE_PATHS` and `BODY_OUTLINE_PATHS` with a properly proportioned anatomical figure:

**Figure specs:**
- ViewBox: `0 0 200 440` (tall, narrow, proportional male figure)
- Standing front pose, arms slightly away from body, feet shoulder-width apart
- Body outline (head, neck, torso shell, arms, hands, legs, feet) as a neutral base layer
- 12 muscle groups with anatomically correct shapes:
  - **Traps**: Triangular from neck to shoulder ridge
  - **Shoulders (Deltoids)**: Rounded caps over the shoulder joint
  - **Chest (Pectorals)**: Fan-shaped from sternum to armpit
  - **Biceps**: Front upper arm, proper bulge shape
  - **Triceps**: Back/side upper arm visible from front
  - **Forearms**: Tapered lower arm
  - **Core (Abs)**: 6-segment rectus abdominis + obliques on sides
  - **Lats**: V-taper visible from front as side torso
  - **Glutes**: Hip area visible from front
  - **Quads**: 4-headed front thigh muscle
  - **Hamstrings**: Inner thigh visible from front
  - **Calves**: Lower leg, diamond shape

**Style:**
- Smooth, slightly rounded SVG paths (not jagged geometric lines)
- Each muscle group is a separate clickable region
- Body outline rendered in muted gray as the silhouette base
- Muscles overlaid with color based on development ratio

**Keep all existing logic** — color function, click handling, detail panel, ranking list. Only the SVG paths change.

### Files Changed
- `src/index.css` — texture enhancement
- `src/components/BodyDiagram.tsx` — complete SVG path rewrite

