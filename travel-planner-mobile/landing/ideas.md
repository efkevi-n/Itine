# TravelAI Landing Page — Design Brainstorm

## Design Brief
Premium dark-mode landing page for an AI travel planning app. Vibe: Futuristic and techy — Linear.app meets SpaceX. Clean, sharp, confident.

---

<response>
<text>

## Idea 1: "Deep Space Terminal"

**Design Movement:** Brutalist Futurism — raw geometry meets precision engineering

**Core Principles:**
1. Monochromatic depth — near-black base with controlled indigo/sky accents only
2. Sharp edges everywhere — zero border-radius on structural elements, only on interactive ones
3. Data-terminal aesthetic — monospace accents, grid overlays, scanline textures
4. Asymmetric tension — hero text breaks the grid intentionally

**Color Philosophy:**
Background #0d0d14 acts as a void. Indigo #6366f1 is the "signal" — used sparingly for CTAs and key numbers. Sky blue #0EA5E9 is "data flow" — used for secondary highlights and icons. White text at full opacity for headlines, #9ca3af for body copy.

**Layout Paradigm:**
Left-heavy hero with content flush-left, phone mockup floating right with a subtle parallax. Sections use full-bleed horizontal dividers. Stats section uses a horizontal scrolling ticker. No centered layouts except the final CTA.

**Signature Elements:**
1. Thin 1px grid overlay on hero background (subtle, 5% opacity)
2. Glowing indigo border-left accent on feature cards
3. Large monospace step numbers (01, 02, 03) for How It Works

**Interaction Philosophy:**
Hover states reveal more information — cards expand slightly, borders glow. Scroll triggers section reveals. No decorative animations — only purposeful motion.

**Animation:**
- Hero text: staggered word-by-word fade-up on load
- Feature cards: slide-in from bottom on scroll intersection
- Stats: count-up animation when section enters viewport
- Phone mockup: subtle floating animation (translateY loop)

**Typography System:**
- Display: Inter 800 (headlines) — tight letter-spacing (-0.03em)
- Body: Inter 400 — comfortable line-height (1.7)
- Accent: Inter 600 Mono for numbers and labels
- Hierarchy: 72px / 48px / 24px / 16px / 14px

</text>
<probability>0.08</probability>
</response>

<response>
<text>

## Idea 2: "Obsidian Atlas" ← SELECTED

**Design Movement:** Precision Minimalism — the aesthetic of high-end fintech dashboards (Linear, Vercel, Stripe)

**Core Principles:**
1. Controlled restraint — every element earns its place; nothing decorative without purpose
2. Layered darkness — multiple shades of near-black create depth without gradients
3. Surgical typography — Inter at extreme weights, tight tracking on headlines
4. Edge-to-edge confidence — sections use full viewport width, content breathes inside

**Color Philosophy:**
#0d0d14 is the canvas — a near-black with a faint blue undertone that reads as "space" not "void." Cards at #0f0f1a with 1px borders at 8% white opacity create subtle elevation. Indigo #6366f1 is used exclusively for primary actions and key highlights. Sky blue #0EA5E9 for data, icons, and secondary accents. This creates a two-tone accent system that feels premium without being loud.

**Layout Paradigm:**
Asymmetric hero: 55% text/search left, 45% phone mockup right. Feature grid: 3-column masonry with varying card heights. How It Works: horizontal 3-step flow with connecting lines. Stats: 4-column horizontal band. Testimonials: 3-column equal-height cards.

**Signature Elements:**
1. Subtle radial glow behind hero text (indigo, very low opacity)
2. Card borders that glow on hover (indigo border-color transition)
3. Gradient step numbers (indigo→sky) for How It Works

**Interaction Philosophy:**
Micro-interactions on every interactive element. Cards lift on hover (translateY -4px + shadow). Buttons have a subtle shimmer on hover. The AI search bar has a focus state with indigo ring glow.

**Animation:**
- Page load: hero fades in with staggered children (0.1s delay each)
- Scroll: sections use IntersectionObserver for fade-up reveals
- Stats: number counter animation on viewport entry
- Phone mockup: continuous gentle float (3s ease-in-out infinite)
- Feature cards: staggered entrance from bottom

**Typography System:**
- Display: Inter 900 — 80px desktop, tight -0.04em tracking
- Subheading: Inter 600 — 20px, #9ca3af color
- Card titles: Inter 700 — 18px
- Body: Inter 400 — 16px, 1.75 line-height
- Labels/badges: Inter 500 — 12px, uppercase, 0.1em tracking

</text>
<probability>0.09</probability>
</response>

<response>
<text>

## Idea 3: "Neon Meridian"

**Design Movement:** Cyberpunk Luxury — Blade Runner meets Aesop store

**Core Principles:**
1. Tension between darkness and neon — deep blacks with electric accent lines
2. Layered glass morphism — frosted card surfaces with colored inner glows
3. Diagonal composition — sections cut at angles, breaking the horizontal monotony
4. High-contrast hierarchy — maximum contrast between background and accent elements

**Color Philosophy:**
Background #0d0d14 with additional purple tint overlays. Cards use glass morphism (rgba white 3-5% + backdrop-blur). Indigo and sky blue used as neon glow sources. Text uses a gradient from white to #9ca3af for body content.

**Layout Paradigm:**
Full-bleed hero with centered content and a dramatic background. Diagonal section dividers between all major sections. Feature cards use a hexagonal grid pattern. Stats section has a dramatic full-bleed background image.

**Signature Elements:**
1. Neon border glow effects on cards and buttons
2. Diagonal SVG dividers between sections
3. Animated gradient borders on the hero search bar

**Interaction Philosophy:**
Dramatic hover effects — cards glow intensely on hover. Parallax scrolling on background elements. Cursor-following light effect on the hero section.

**Animation:**
- Hero: dramatic fade-in with scale effect
- Background: subtle parallax on scroll
- Cards: intense glow pulse on hover
- Numbers: dramatic count-up with color transitions

**Typography System:**
- Display: Inter 900 with gradient text fill
- Body: Inter 300 for contrast against bold headlines
- Accent: Caps-lock labels with wide tracking

</text>
<probability>0.06</probability>
</response>

---

## Selected Approach: **"Obsidian Atlas"** (Idea 2)

Precision Minimalism — the aesthetic of high-end fintech dashboards. Sharp, controlled, confident. Every pixel earns its place.
