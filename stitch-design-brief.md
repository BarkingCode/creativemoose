# PhotoApp Design Brief for Stitch

## App Overview
**App Name:** KG-Photo
**Platform:** iOS/Android Mobile
**Purpose:** AI-powered photo transformation app with Canadian-themed presets
**Target Users:** Young adults (18-35) who want fun, shareable AI-generated photos

## Brand Identity
- **Personality:** Playful, modern, premium, slightly whimsical
- **Theme:** Dark mode first, Canadian cultural elements
- **Vibe:** Instagram meets AI art studio

## Design System

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Background | #0f0a0a | Primary dark background |
| Surface | #1a1a1a | Cards, elevated elements |
| Border | #262626 | Subtle borders |
| Primary | #ffffff | Text, icons, buttons |
| Accent | #10b981 | CTAs, highlights (emerald) |
| Muted | #a1a1a1 | Secondary text |
| Danger | #ef4444 | Errors, destructive actions |

### Typography
- **Headlines:** Bold, 24-32px, white
- **Body:** Regular, 14-16px, white/muted
- **Captions:** Regular, 12px, muted

### Effects
- **Glassmorphism:** White at 10% opacity with blur
- **Borders:** 1px subtle (white at 10%)
- **Radius:** 16px for cards, full for avatars/buttons
- **Shadows:** Subtle drop shadows for depth

---

## Screen 1: Onboarding/Welcome

### Purpose
First screen users see. Introduce the app concept and drive sign-up.

### Layout Description
- **Background:** Solid dark (#0f0a0a)
- **Hero Section (top 60%):**
  - Large illustration or photo collage showing transformation examples
  - Before photo on left, arrow, AI-generated variations on right
  - Floating preset badges: "Hockey Player", "Mountie", "Artist"
- **Content Section (bottom 40%):**
  - App logo: Camera icon with maple leaf accent
  - App name: "KG-Photo" in bold white
  - Tagline: "Transform into anyone. Powered by AI." in muted text
  - Primary CTA: Emerald green button "Get Started"
  - Secondary link: "Already have an account? Sign in"

### Key Elements
- Show 3-4 transformation examples as floating cards
- Create excitement about possibilities
- Clear value proposition above the fold
- Single prominent call-to-action

---

## Screen 2: Camera Capture

### Purpose
Main camera interface where users take photos and select styles/presets.

### Layout Description
- **Full-screen camera preview** as background
- **Top Bar (frosted glass):**
  - Left: Empty or close button
  - Center: KG-Photo logo (small)
  - Right: Credits badge showing "5" with coin icon
- **Left Edge - Style Swiper:**
  - Vertical scrollable list of circular style thumbnails
  - Each: 48px circle with image, label below
  - Styles: Hockey Player, Mountie, Artist, Lumberjack, Chef
  - Selected style has white ring border (3px)
  - Slight scale up on selection (1.1x)
- **Bottom Area:**
  - **Preset Carousel:** Horizontal scroll of pill buttons
    - "Natural", "Dramatic", "Vintage", "Vibrant", "Noir"
    - Selected preset: white background, dark text
    - Unselected: transparent with white border
  - **Control Row:**
    - Left: Gallery button (square icon, 44px)
    - Center: Shutter button (72px outer ring, 56px white inner)
    - Right: Flip camera button (refresh icon, 44px)
  - All controls on frosted glass bar

### Key Elements
- Camera preview is the hero - UI overlays shouldn't obstruct
- Style swiper inspired by Instagram stories but vertical
- Large, tactile shutter button as focal point
- Frosted glass effects for depth without blocking camera

---

## Screen 3: Results Gallery

### Purpose
Display the 4 AI-generated image variations after processing.

### Layout Description
- **Background:** Solid dark (#0f0a0a)
- **Header:**
  - Left: Back arrow button
  - Center: "Your Creations" title
  - Right: Share icon button
- **Image Grid (2x2):**
  - 4 equal-sized cards with 12px gap
  - Each image: 16px border radius, subtle white border
  - Images show same subject in 4 different artistic interpretations
  - Optional: Small style label overlay at bottom of each
- **Action Bar (below grid):**
  - "Download All" button: Outline style, white border
  - "Share to Feed" button: Filled emerald green
  - Both buttons same width, 12px gap between
- **Thumbnail Strip (bottom):**
  - 4 small circular thumbnails for quick selection
  - Current image has white ring indicator
- **Loading State Variant:**
  - Skeleton cards with shimmer animation
  - Progress indicator: "Generating 2 of 4..."

### Key Elements
- Celebratory feel - user's creations are the star
- Easy access to download and share actions
- Quick thumbnail navigation for comparing results
- Show loading/skeleton state for progressive generation

---

## Screen 4: Credits Purchase

### Purpose
In-app purchase screen for buying generation credits.

### Layout Description
- **Background:** Dark with subtle gradient (#0f0a0a to #1a1517)
- **Header:**
  - Left: Close X button
  - Center: "Get More Credits" title
- **Current Balance:**
  - Coin/credit icon with "You have 0 credits"
  - Subtle card background
- **Pricing Card (single option, centered):**
  - Border: Emerald (#10b981) - highlighted as featured option
  - "5 Credits" - Large bold text
  - "$1.99" - Price prominently displayed
  - "$0.40/credit" - Per-unit value below
  - Large emerald "Purchase" button inside card
  - Card should feel premium and tappable

- **Footer:**
  - "Restore Purchases" link
  - "Secure payment via App Store" with lock icon

### Key Elements
- Single clean pricing option - no decision paralysis
- Emerald accent makes the purchase card feel premium
- Trust indicators for purchase confidence
- Simple, straightforward purchase flow

---

## Additional Notes for Stitch

### Interaction Hints
- Buttons should feel tappable (adequate size, clear states)
- Cards should feel interactive with subtle shadows
- Loading states should feel polished, not jarring

### Canadian Theme Elements
- Maple leaf accent in logo
- Warm, welcoming despite dark theme
- Preset names reference Canadian culture subtly

### Consistency
- All screens share same dark background (#0f0a0a)
- Same rounded corner radius (16px)
- Same emerald accent for primary actions
- Consistent spacing (16px base unit)
