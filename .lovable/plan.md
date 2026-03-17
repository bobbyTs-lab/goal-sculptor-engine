

# Complete UI & Design Overhaul — Eggshell White + Navy Blue + Color Circles

## Design Vision

Replace the dark gothic/alien theme with a **light, paper-textured, modern design** built around:
- **Eggshell white** background with subtle paper texture
- **Navy blue** (#1B2A4A) as the primary accent
- **Colored circles** as a recurring design motif — each section/page gets a distinct pastel accent color rendered as soft circular elements (backgrounds, badges, progress indicators)
- Clean sans-serif typography (Inter) replacing the gothic fonts
- Soft shadows instead of neon glows

## Color System

| Element | Color |
|---|---|
| Background | Eggshell white `40 30% 96%` with paper texture |
| Foreground/text | Dark navy `220 30% 15%` |
| Primary (accent) | Navy blue `220 60% 30%` |
| Card | White `0 0% 100%` with soft shadow |
| Muted | Warm gray `40 10% 90%` |
| Section circles | Coral (Home), Teal (Program), Violet (Goals), Amber (People), Sky (Workouts) |

## Circle Design Motif

Each page/section features a **large soft gradient circle** as a background decoration, plus smaller circle badges and indicators throughout:
- Home: warm coral circle behind the body diagram
- Program: teal circle behind the planner
- Goals: violet circle accents on progress rings
- People: amber circle motif
- Workouts: sky blue circles
- Stats shown in circular pill-badges
- Navigation active indicator is a filled circle dot

## Files to Change

### 1. `index.html`
- Remove gothic fonts (UnifrakturMaguntia, MedievalSharp), add Inter from Google Fonts
- Change `class="dark"` to no class (light mode)
- Update theme-color meta to eggshell `#F5F2EB`

### 2. `src/index.css` — Full rewrite
- New CSS variables: eggshell background, navy foreground, warm grays
- Replace all gothic utility classes (`.gradient-alien`, `.glow-green`, `.font-gothic`, `.border-rough`, `.scanlines`, `.ember-*`, `.crt-*`, `.divider-alien`) with new ones:
  - `.section-circle` — large decorative background circle
  - `.circle-coral`, `.circle-teal`, `.circle-violet`, `.circle-amber`, `.circle-sky` — color variants
  - `.paper-texture` — subtle paper noise on body
- Remove CRT boot animation from `#root`
- Keep hidden scrollbars

### 3. `tailwind.config.ts`
- Update color tokens to match new palette
- Remove `gold`, `gold-glow`, `toxic-green`, `emerald` custom colors
- Add section accent colors (coral, teal, violet, amber, sky)
- Update radius to more rounded (`0.75rem`)

### 4. `src/components/layout/AppLayout.tsx`
- Remove gradient overlays and gothic header styling
- Clean white header with navy text, no ambient sound icon
- Soft bottom border instead of gradient

### 5. `src/components/layout/AppSidebar.tsx`
- Replace gothic title/gradient with clean "GoalForge" in navy
- Replace `divider-alien` with simple light border
- Clean active states with navy highlight and circle dot indicator

### 6. `src/components/layout/MobileTabBar.tsx`
- White/frosted background instead of dark card
- Navy active icon color with small filled circle indicator below
- Remove green glow drop-shadow, medieval font

### 7. All pages (Index, Goals, Program, People, Workouts, Settings)
- Strip all gothic class references: `font-gothic`, `font-medieval`, `gradient-alien`, `gradient-alien-text`, `glow-green-text`, `ember-particles`, `border-rough`, `divider-alien`, `scanlines`, `texture-noise`, `crt-hover`
- Replace with clean typography and section-specific circle accent colors
- Add decorative background circles per page
- Use `EmberCard`/`EmberText`/`FlickerIn` → replace with simple `motion.div` fade-in or remove entirely

### 8. `src/components/BodyDiagram.tsx`
- Update muscle color scheme from green→gold to navy→coral gradient for development levels
- Selected muscle panel uses the page's circle accent color

### 9. `src/components/ProgressRing.tsx`
- Update ring colors from green/gold to navy/section-accent

### 10. `src/components/EmberAnimations.tsx`
- Can be left in place but all imports removed from pages (dead code cleanup optional)

## Typography
- **Headings**: Inter 600/700 weight, navy color
- **Body**: Inter 400/500, dark gray
- **Small labels**: Inter 500 uppercase tracking-wide, muted gray

## Summary of Removals
- Dark mode (`class="dark"` on html)
- All gothic/alien/CRT/ember CSS and animations
- Gothic fonts (UnifrakturMaguntia, MedievalSharp)
- Green/gold/toxic color scheme
- Neon glows, scanlines, noise textures, animated borders

## What's Added
- Light eggshell paper background
- Navy blue accent system
- 5 section-specific pastel accent colors
- Decorative gradient circles as page backgrounds
- Circle-based UI indicators (nav dots, badges, progress)
- Inter font family
- Soft shadows and clean borders

