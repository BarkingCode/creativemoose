/**
 * Photo Style Definitions
 *
 * Shared definitions for photo styles used across web and mobile apps.
 * Each style has a unique ID, display name, emoji for UI, and description.
 */

export type PhotoStyleId = 'photorealistic' | 'cartoon' | 'vintage50s' | 'cinematic' | 'oil-painting' | 'watercolor';

export interface PhotoStyle {
  id: PhotoStyleId;
  name: string;
  emoji: string;
  description: string;
}

/** Ordered list of style IDs for consistent display */
export const PHOTO_STYLE_ORDER: PhotoStyleId[] = [
  'photorealistic',
  'cartoon',
  'vintage50s',
  'cinematic',
  'oil-painting',
  'watercolor',
];

export const PHOTO_STYLES: Record<PhotoStyleId, PhotoStyle> = {
  photorealistic: {
    id: 'photorealistic',
    name: 'Photo',
    emoji: '📷',
    description: 'Photorealistic style with natural lighting and detail',
  },
  cartoon: {
    id: 'cartoon',
    name: 'Cartoon',
    emoji: '🎨',
    description: 'Vibrant cartoon illustration with bold colors',
  },
  vintage50s: {
    id: 'vintage50s',
    name: '50s Vibe',
    emoji: '📺',
    description: 'Vintage 1950s aesthetic with retro color grading',
  },
  cinematic: {
    id: 'cinematic',
    name: 'Cinematic',
    emoji: '🎬',
    description: 'Dramatic cinematic look with moody lighting',
  },
  'oil-painting': {
    id: 'oil-painting',
    name: 'Oil Paint',
    emoji: '🖼️',
    description: 'Classical oil painting with brush strokes',
  },
  watercolor: {
    id: 'watercolor',
    name: 'Watercolor',
    emoji: '💧',
    description: 'Soft watercolor painting with delicate washes',
  },
};

export const DEFAULT_PHOTO_STYLE: PhotoStyleId = 'photorealistic';

/** Get all styles as an ordered array (for pickers/carousels) */
export function getAllPhotoStyles(): PhotoStyle[] {
  return PHOTO_STYLE_ORDER.map((id) => PHOTO_STYLES[id]);
}

/** Picker-friendly array with id, name, emoji */
export const STYLE_PICKER_OPTIONS = PHOTO_STYLE_ORDER.map((id) => ({
  id: PHOTO_STYLES[id].id,
  name: PHOTO_STYLES[id].name,
  emoji: PHOTO_STYLES[id].emoji,
}));
