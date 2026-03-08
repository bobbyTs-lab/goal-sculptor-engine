

# Over-the-Top Textures & Clashing Design Elements

## Approach
Layer multiple competing visual textures across every surface — cracked stone, parchment grain, vein-like cracks, runic borders, dripping slime edges, and chromatic aberration. The goal is visual excess.

## Changes

### 1. `src/index.css` — Add texture layers and effects
- **Cracked stone texture**: CSS-generated cracks using multiple `linear-gradient` lines at random angles with dark/light seams
- **Parchment grain overlay**: SVG noise filter at higher opacity (0.08–0.12) with warm brown tint
- **Vein/crack pattern**: Additional pseudo-element with jagged linear gradients simulating stone fractures
- **Dripping slime borders**: Bottom borders on cards get a wavy SVG mask simulating ooze dripping down
- **Chromatic aberration on headings**: Layered text-shadows in red/cyan offset to simulate broken CRT
- **Runic border pattern**: Repeating SVG border-image with angular geometric runes
- **Body background**: Stack cracked stone radial gradients, vignette burn at edges, subtle purple fog
- **New utility classes**: `.texture-cracks`, `.texture-parchment`, `.chromatic-aberration`, `.border-runic`, `.drip-edge`, `.vignette-burn`

### 2. `src/components/layout/AppLayout.tsx` — Apply textures to shell
- Add `texture-cracks` and `texture-parchment` overlays to the main container
- Add `vignette-burn` to the outer wrapper for dark burned edges
- Header gets `chromatic-aberration` on the title and a `border-runic` bottom border

### 3. `src/pages/Index.tsx` — Texture the dashboard
- Hero section gets stacked `texture-parchment` + `texture-cracks` pseudo-elements
- Cards get `drip-edge` bottom borders and `scanlines` overlay
- Title gets `chromatic-aberration`

### 4. `src/pages/Goals.tsx` & `src/pages/Workouts.tsx` — Apply everywhere
- All card containers get `texture-noise` + `scanlines` + `border-runic`
- Section headers get `chromatic-aberration`
- Dividers become `drip-edge` style

### 5. `src/components/layout/AppSidebar.tsx` — Texture the sidebar
- Background gets `texture-parchment` overlay
- Nav items get `border-runic` on hover

