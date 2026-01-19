/**
 * Photo Style Definitions
 *
 * Defines available photo styles for AI image generation.
 * Each style has a unique ID, display name, and prompt modifier.
 */

export type PhotoStyleId = 'photorealistic' | 'cartoon' | 'vintage50s' | 'cinematic' | 'oil-painting' | 'watercolor';

export interface PhotoStyle {
  id: PhotoStyleId;
  name: string;
  description: string;
}

export const PHOTO_STYLES: Record<PhotoStyleId, PhotoStyle> = {
  photorealistic: {
    id: 'photorealistic',
    name: 'Photo',
    description: 'Photorealistic style with natural lighting and detail',
  },
  cartoon: {
    id: 'cartoon',
    name: 'Cartoon',
    description: 'Vibrant cartoon illustration with bold colors',
  },
  vintage50s: {
    id: 'vintage50s',
    name: '50s Vibe',
    description: 'Vintage 1950s aesthetic with retro color grading',
  },
  cinematic: {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Dramatic cinematic look with moody lighting',
  },
  'oil-painting': {
    id: 'oil-painting',
    name: 'Oil Paint',
    description: 'Classical oil painting with brush strokes',
  },
  watercolor: {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Soft watercolor painting with delicate washes',
  },
};

export const DEFAULT_PHOTO_STYLE: PhotoStyleId = 'photorealistic';
