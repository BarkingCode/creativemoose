# Presets & Styles Architecture

## Overview

The presets and styles system is split between mobile (UI-only) and edge functions (prompts/logic). This separation allows prompt updates without app releases.

## Architecture Diagram

```
Mobile (UI only)                    Edge Function (Source of Truth)
────────────────                    ─────────────────────────────────
shared/presets.ts                   supabase/functions/_shared/presets.ts
├── PresetId type                   ├── Full Preset interface
├── PhotoStyleId type               ├── All prompt strings
├── PRESET_PICKER (id,name,emoji)   ├── getPresetPromptWithStyle()
├── STYLE_PICKER (id,name,emoji)    └── Complete preset definitions
├── DEFAULT_PRESET
└── DEFAULT_STYLE
```

## File Locations

| File | Purpose |
|------|---------|
| `shared/presets.ts` | Mobile UI data - types and picker arrays (id, name, emoji) |
| `supabase/functions/_shared/presets.ts` | Edge function - full prompts and `getPresetPromptWithStyle()` |

## Adding a New Preset

### Step 1: Add to Edge Function (Required)

Edit `supabase/functions/_shared/presets.ts`:

```typescript
// Add to PRESETS object
myNewPreset: {
  id: "myNewPreset",
  name: "My New Preset",
  emoji: "🎉",
  description: "Description for internal reference",
  requiresRefs: false,
  type: "image",
  prompt: `Your creative prompt here describing the scene...`,
},

// Add to PRESET_ORDER array
export const PRESET_ORDER = [
  // ... existing presets
  "myNewPreset",
];
```

### Step 2: Add to Mobile Picker (Required)

Edit `shared/presets.ts`:

```typescript
// Add to PresetId type
export type PresetId =
  | 'mapleAutumn'
  // ... existing presets
  | 'myNewPreset';

// Add to PRESET_PICKER array
export const PRESET_PICKER: { id: PresetId; name: string; emoji: string }[] = [
  // ... existing presets
  { id: 'myNewPreset', name: 'My New Preset', emoji: '🎉' },
];
```

### Step 3: Deploy Edge Function

```bash
supabase functions deploy generate-single
supabase functions deploy preview
```

## Adding a New Style

### Step 1: Add Style String to Edge Function

Edit `supabase/functions/_shared/presets.ts`:

```typescript
// Add style string
const myNewStyle = `Description of the visual style...`;

// Add to styleMap
const styleMap: Record<PhotoStyleId, string> = {
  // ... existing styles
  'my-new-style': myNewStyle,
};
```

### Step 2: Add to Mobile Types and Picker

Edit `shared/presets.ts`:

```typescript
// Add to PhotoStyleId type
export type PhotoStyleId =
  | 'photorealistic'
  // ... existing styles
  | 'my-new-style';

// Add to STYLE_PICKER array
export const STYLE_PICKER: { id: PhotoStyleId; name: string; emoji: string }[] = [
  // ... existing styles
  { id: 'my-new-style', name: 'My Style', emoji: '✨' },
];
```

## Why This Architecture?

1. **Prompt Security**: Prompts stay server-side, not exposed in app bundle
2. **Hot Updates**: Change prompts without app store review/release
3. **Smaller Bundle**: Mobile only ships ~60 lines instead of 200+
4. **Type Safety**: Both sides share the same type definitions
5. **Single Source of Truth**: Edge function owns all generation logic

## Current Presets

| ID | Name | Emoji |
|----|------|-------|
| `mapleAutumn` | Maple Autumn | 🍁 |
| `winterWonderland` | Winter Wonderland | ❄️ |
| `northernLights` | Northern Lights | 🌌 |
| `cottageLife` | Cottage Life | 🏕️ |
| `urbanCanada` | Urban Canada | 🏙️ |
| `wildernessExplorer` | Wilderness Explorer | 🏔️ |
| `editorialCanada` | Editorial Canada | 📸 |
| `canadianWildlifeParty` | Canadian Wildlife Party | 🦫 |
| `ehEdition` | Eh Edition | 🍁 |
| `withus` | With Us | 👥 |

## Current Styles

| ID | Name | Emoji |
|----|------|-------|
| `photorealistic` | Photo | 📷 |
| `cartoon` | Cartoon | 🎨 |
| `vintage50s` | 50s Vibe | 📺 |
| `cinematic` | Cinematic | 🎬 |
| `oilPainting` | Oil Paint | 🖼️ |
| `watercolor` | Watercolor | 💧 |
