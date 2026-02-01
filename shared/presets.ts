/**
 * Preset & Style Types for Mobile App
 *
 * UI-only data for pickers. Full prompts live in edge function (_shared/presets.ts).
 * When adding a preset: update edge function + add picker entry here.
 */

// Type definitions (must match edge function)
export type PresetId =
  | 'mapleAutumn'
  | 'winterWonderland'
  | 'northernLights'
  | 'cottageLife'
  | 'urbanCanada'
  | 'wildernessExplorer'
  | 'editorialCanada'
  | 'canadianWildlifeParty'
  | 'ehEdition'
  | 'withus';

export type PhotoStyleId =
  | 'photorealistic'
  | 'cartoon'
  | 'vintage50s'
  | 'cinematic'
  | 'oilPainting'
  | 'watercolor';

// Picker data for UI
export const PRESET_PICKER: { id: PresetId; name: string; emoji: string }[] = [
  { id: 'mapleAutumn', name: 'Maple Autumn', emoji: '🍁' },
  { id: 'winterWonderland', name: 'Winter Wonderland', emoji: '❄️' },
  { id: 'northernLights', name: 'Northern Lights', emoji: '🌌' },
  { id: 'cottageLife', name: 'Cottage Life', emoji: '🏕️' },
  { id: 'urbanCanada', name: 'Urban Canada', emoji: '🏙️' },
  { id: 'wildernessExplorer', name: 'Wilderness Explorer', emoji: '🏔️' },
  { id: 'editorialCanada', name: 'Editorial Canada', emoji: '📸' },
  { id: 'canadianWildlifeParty', name: 'Canadian Wildlife Party', emoji: '🦫' },
  { id: 'ehEdition', name: 'Eh Edition', emoji: '🍁' },
  { id: 'withus', name: 'With Us', emoji: '👥' },
];

export const STYLE_PICKER: { id: PhotoStyleId; name: string; emoji: string }[] = [
  { id: 'photorealistic', name: 'Photo', emoji: '📷' },
  { id: 'cartoon', name: 'Cartoon', emoji: '🎨' },
  { id: 'vintage50s', name: '50s Vibe', emoji: '📺' },
  { id: 'cinematic', name: 'Cinematic', emoji: '🎬' },
  { id: 'oilPainting', name: 'Oil Paint', emoji: '🖼️' },
  { id: 'watercolor', name: 'Watercolor', emoji: '💧' },
];

export const DEFAULT_PRESET: PresetId = 'mapleAutumn';
export const DEFAULT_STYLE: PhotoStyleId = 'photorealistic';

// Backwards-compatible aliases (will be removed in future)
export const PRESET_PICKER_OPTIONS = PRESET_PICKER;
export const STYLE_PICKER_OPTIONS = STYLE_PICKER;
