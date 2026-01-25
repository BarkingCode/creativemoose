/**
 * Photo Style Definitions (Mobile)
 *
 * Shared style definitions for UI pickers/carousels.
 * Full definitions with prompt modifiers live in the web app's shared/photo-styles.ts
 */

export type PhotoStyleId = 'photorealistic' | 'cartoon' | 'vintage50s' | 'cinematic' | 'oil-painting' | 'watercolor';

export interface StylePickerOption {
  id: string;
  name: string;
  emoji: string;
}

/** Picker-friendly array with id, name, emoji */
export const STYLE_PICKER_OPTIONS: StylePickerOption[] = [
  { id: 'photorealistic', name: 'Photo', emoji: '📷' },
  { id: 'cartoon', name: 'Cartoon', emoji: '🎨' },
  { id: 'vintage50s', name: '50s Vibe', emoji: '📺' },
  { id: 'cinematic', name: 'Cinematic', emoji: '🎬' },
  { id: 'oil-painting', name: 'Oil Paint', emoji: '🖼️' },
  { id: 'watercolor', name: 'Watercolor', emoji: '💧' },
];

export const DEFAULT_PHOTO_STYLE: PhotoStyleId = 'photorealistic';
