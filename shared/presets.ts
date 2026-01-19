/**
 * Preset definitions for AI image generation.
 * Each preset contains prompt variants for generating creative scene-based images.
 */

import { PhotoStyleId } from './photo-styles';

export interface Preset {
  id: string;
  name: string;
  description: string;
  prompt: string; // Single creative prompt instead of array
  requiresRefs: boolean;
  rainbowBorder?: boolean;
  type: 'image' | 'video';
}

const photoRealisticStyle = "The person is in a Canadian setting, natural composition, make the person look happy and relaxed, friendly atmosphere, realistic photo, high-resolution, cinematic detail, even lighting preserving all facial features, natural confident expression, photorealistic portrait quality, be creative. Do not just place the persons face to the picture. Blend the person into the picture with right proportions.";

const cartoonStyle = "The person is in a Canadian setting, vibrant cartoon illustration style, animated character design, make the person look happy and cheerful, friendly atmosphere, colorful and expressive, high-quality digital art, even lighting preserving all facial features, natural confident expression, cartoon portrait quality with clean lines and bold colors, be creative. Do not just place the persons face to the picture. Blend the person into the cartoon scene with right proportions and consistent art style.";

const vintage50sStyle = "The person is in a Canadian setting with authentic 1950s vintage aesthetic, retro color grading with slightly faded warm tones, subtle film grain and vignette, period-appropriate styling, nostalgic atmosphere, vintage photo quality resembling old photographs from the era, natural happy expression, friendly atmosphere, be creative. Do not just place the persons face to the picture. Blend the person into the vintage scene with right proportions and authentic period feel.";

const cinematicStyle = "The person is in a Canadian setting with dramatic cinematic look, moody atmospheric lighting, rich color grading with deep shadows and highlights, film-like quality with shallow depth of field, epic composition, movie poster aesthetic, professional color correction, natural confident expression, friendly atmosphere, be creative. Do not just place the persons face to the picture. Blend the person into the cinematic scene with right proportions and dramatic impact.";

const oilPaintingStyle = "The person is in a Canadian setting rendered as a classical oil painting, visible brush strokes and rich texture, traditional painting techniques, warm color palette with depth, artistic interpretation while maintaining likeness, museum-quality portrait style, natural happy expression, friendly atmosphere, fine art quality, be creative. Do not just place the persons face to the picture. Blend the person into the painted scene with right proportions and artistic style.";

const watercolorStyle = "The person is in a Canadian setting painted in soft watercolor technique, delicate color washes and gentle blending, translucent layers with artistic flow, light and airy atmosphere, painterly edges and soft details, natural happy expression, friendly atmosphere, fine watercolor art quality, be creative. Do not just place the persons face to the picture. Blend the person into the watercolor scene with right proportions and artistic style.";

const genericStyle = photoRealisticStyle;

export const PRESETS: Record<string, Preset> = {
  mapleAutumn: {
    id: "mapleAutumn",
    name: "Maple Autumn",
    description: "Golden fall leaves and cozy Canadian atmosphere",
    requiresRefs: false,
    type: 'image',
    prompt: `${genericStyle}. Immerse the person in a stunning Canadian autumn scene with vibrant fall colors - warm oranges, deep reds, and golden yellows. Create diverse and creative compositions featuring maple leaves, cozy seasonal clothing, and beautiful fall lighting. Vary the settings between forests, lakesides, parks, and charming towns. Experiment with different times of day, weather conditions, and activities. Make each generation unique - from cozy and intimate to grand and cinematic. Capture the magical essence of Canadian fall with creativity and variety.`,
  },
  winterWonderland: {
    id: "winterWonderland",
    name: "Winter Wonderland",
    description: "Snowy Canadian winter moments",
    requiresRefs: false,
    type: 'image',
    prompt: `${genericStyle}. Place the person in a magical Canadian winter wonderland with pristine snow, frosted trees, and beautiful winter light. Use soft whites, cool blues, and warm accent colors. Be creative with winter elements - snowfall, ice, evergreens, cozy cabins, winter sports. Vary the locations between wilderness, mountains, lakesides, and charming snowy towns. Experiment with different lighting conditions, weather, and activities. Create diverse moods from adventurous and dynamic to cozy and serene. Each generation should feel unique and capture the breathtaking beauty of Canadian winter.`,
  },
  northernLights: {
    id: "northernLights",
    name: "Northern Lights",
    description: "Magical aurora and night sky filters",
    requiresRefs: false,
    type: 'image',
    prompt: `${genericStyle}. Create breathtaking scenes with the person under the Northern Lights in the Canadian wilderness. Use vibrant aurora colors - greens, purples, blues, and pinks dancing across the night sky. Include stunning night elements like stars, snow, wilderness, water reflections. Be creative with compositions - from dramatic silhouettes to illuminated portraits. Vary the settings between arctic landscapes, frozen lakes, snowy forests, and remote wilderness. Experiment with different aurora patterns, lighting contrasts, and perspectives. Make each generation unique and magical, capturing the awe-inspiring wonder of the aurora borealis in diverse and creative ways.`,
  },
  cottageLife: {
    id: "cottageLife",
    name: "Cottage Life",
    description: "Peaceful lakefront and cozy cabin filters",
    requiresRefs: false,
    type: 'image',
    prompt: `${genericStyle}. Immerse the person in serene Canadian cottage country with beautiful lakefront settings. Use natural colors - greens, blues, warm wood tones. Create diverse scenes with cottage elements like docks, canoes, Muskoka chairs, cabins, fire pits. Vary the locations between lakesides, forests, and waterfront properties. Experiment with different times of day - sunrise, golden hour, misty mornings, sunset. Include various activities like paddling, relaxing, enjoying nature, or peaceful moments. Make each generation unique with different moods from tranquil and peaceful to adventurous and lively. Capture the essence of Canadian cottage living with creativity and variety.`,
  },
  urbanCanada: {
    id: "urbanCanada",
    name: "Urban Canada",
    description: "Modern Canadian city life filter",
    requiresRefs: false,
    type: 'image',
    prompt: `${genericStyle}. Place the person in vibrant Canadian city environments showcasing modern urban life. Feature contemporary architecture, city lights, street art, trendy cafés, bustling markets, iconic buildings, and multicultural neighborhoods. Vary the settings between downtown cores, waterfronts, rooftops, markets, and historic districts. Experiment with different times - daytime energy, blue hour, golden hour, night lights. Include diverse activities like exploring, dining, walking, or enjoying city views. Create unique compositions with varied moods from energetic and dynamic to sophisticated and casual. Capture the cosmopolitan essence of Canadian cities with creativity and diversity.`,
  },

  wildernessExplorer: {
    id: "wildernessExplorer",
    name: "Wilderness Explorer",
    description: "Wild landscapes and adventure scenes",
    requiresRefs: false,
    type: 'image',
    prompt: `${genericStyle}. Place the person in epic Canadian wilderness settings full of adventure and natural beauty. Feature dramatic landscapes - towering mountains, ancient forests, rushing waterfalls, pristine lakes, rugged trails, and vast national parks. Use stunning natural lighting and powerful compositions. Vary the locations and scale - from intimate forest scenes to grand mountain vistas. Experiment with different weather conditions, times of day, and activities like hiking, exploring, camping, or contemplating nature. Make each generation unique with diverse moods from peaceful and contemplative to dramatic and adventurous. Capture the raw, majestic beauty of Canada's wild spaces creatively.`,
  },
  editorialCanada: {
    id: "editorialCanada",
    name: "Editorial Canada",
    description: "Stylish portrait filters inspired by Canadian fashion & culture",
    requiresRefs: false,
    type: 'image',
    prompt: `${genericStyle}. Create magazine-worthy editorial portraits with the person in stylish Canadian settings. Use sophisticated lighting, elegant compositions, and fashion-forward aesthetics. Feature diverse backdrops - modern urban architecture, minimalist nature, cultural landmarks, or unique Canadian locations. Experiment with different styling approaches - contemporary, rustic-elegant, bold, or classic. Vary the lighting from dramatic and moody to soft and refined. Include creative depth of field, interesting angles, and professional techniques. Make each generation unique with varied moods from confident and powerful to sophisticated and casual-chic. Capture the intersection of Canadian culture and contemporary fashion with artistic creativity.`,
  },
  canadianWildlifeParty: {
    id: "canadianWildlifeParty",
    name: "Canadian Wildlife Party",
    description: "Funny and surreal wildlife interactions in Canadian settings",
    requiresRefs: false,
    type: 'image',
    prompt: `${genericStyle}. Create hilarious and surreal scenes with the person interacting with Canadian wildlife in unexpected and comedic ways. Feature iconic animals - moose, beavers, bears, raccoons, geese - in absurd but photorealistic situations. Imagine creative scenarios like playing sports together, sharing meals, outdoor adventures, or everyday activities. Vary the settings from wilderness to urban to recreational areas. Use good lighting and realistic rendering while embracing the humor and whimsy. Make each generation uniquely funny with different animals, activities, and comedic situations. Keep it charming and heartwarming while capturing the playful side of Canadian wildlife encounters.`,
  },
  ehEdition: {
    id: "ehEdition",
    name: "Eh Edition",
    description: "Lighthearted and comedic takes on Canadian stereotypes",
    requiresRefs: false,
    type: 'image',
    prompt: `${genericStyle}. Create fun and comedic scenes celebrating Canadian stereotypes with the person in hilarious situations. Feature iconic Canadiana - maple syrup, hockey, Tim Hortons, Mounties, extreme politeness, winter obsessions, apologizing excessively, poutine. Imagine creative scenarios that playfully exaggerate national pride and cultural quirks. Vary the settings and situations - everyday life with excessive Canadian elements, over-the-top polite encounters, winter worship, or hockey fanaticism. Use photorealistic quality while embracing good-natured humor. Make each generation uniquely funny with different stereotypes and comedic situations. Keep it affectionate and lighthearted, capturing Canadian humor with pride and charm.`,
  },
  withus: {
    id: "withus",
    name: "With Eray and Evren",
    description: "User appears with two reference hosts in Canadian settings",
    requiresRefs: true,
    type: 'image',
    prompt: `${genericStyle}. Create natural and authentic group photos with three people together exploring beautiful Canadian settings. Use balanced compositions with all three faces clearly visible and naturally integrated. Feature diverse Canadian backdrops - stunning nature, vibrant cities, cultural landmarks, or unique locations. Vary the group activities and interactions - outdoor adventures, city exploration, relaxed moments, shared experiences, laughing together. Experiment with different lighting, times of day, and perspectives. Make each generation unique with varied settings, poses, and moods from adventurous and dynamic to relaxed and joyful. Capture the genuine atmosphere of friends experiencing Canada together with creativity and authenticity. Maintain realistic proportions and natural group dynamics.`,
  },
  // ilacSceneMatch: {
  //   id: "ilacSceneMatch",
  //   name: "ILAC Campus (Toronto)",
  //   description: "Places the person naturally into ILAC Toronto school interiors: lobby, corridors, and themed halls.",
  //   requiresRefs: true, // expects the 4 ILAC photos as reference backgrounds
  //   rainbowBorder: true,
  //   type: 'image',
  //   prompts: [
  //     // 1. Lobby with ILAC branding and colorful seating
  //     `${genericStyle}. Use the ILAC LOBBY background plate (colorful couches, blue walls, ILAC logo columns). Place the person casually standing or sitting within the lobby area, well-integrated with reflections on the floor. Match warm indoor lighting and soft ceiling lights; maintain perspective and correct shadowing on the floor; keep ILAC signage visible and crisp.`,
  //     // 2. "The 6" hallway area
  //     `${genericStyle}. Use the ILAC HALLWAY background plate with 'THE 6' installation. Position the person walking or leaning near the glass or doorway; align body angle with corridor lines; match warm indoor light temperature and gentle shadow under feet; preserve clean reflections on shiny surfaces.`,
  //     // 3. Curved wall with world map graphic
  //     `${genericStyle}. Use the ILAC WORLD MAP corridor plate. Place the person walking along or pointing toward the world map, aligning posture to the curve of the wall; match even overhead lighting and natural skin tones; add a faint contact shadow on the polished floor; keep map text clearly visible.`,
  //     // 4. LOVE hallway with art and geometric lights
  //     `${genericStyle}. Use the ILAC LOVE HALLWAY plate. Place the person mid-hall or near the mosaic artwork; match warm light tones and perspective depth; cast a natural soft floor shadow; maintain balanced exposure and realistic scale; ensure colorful artwork remains unobstructed.`,
  //   ],
  // },
};

export const PRESET_ORDER = ["mapleAutumn", "winterWonderland", "northernLights", "cottageLife", "urbanCanada", "wildernessExplorer", "editorialCanada", "canadianWildlifeParty", "ehEdition", "withus"];

export function getPreset(id: string): Preset | undefined {
  return PRESETS[id];
}

export function getAllPresets(): Preset[] {
  return PRESET_ORDER.map((id) => PRESETS[id]);
}

/**
 * Get preset prompt with a specific photo style
 * Returns an array with the same prompt repeated 4 times (for 4 generations)
 */
export function getPresetPromptsWithStyle(presetId: string, styleId: PhotoStyleId = 'photorealistic'): string[] {
  const preset = PRESETS[presetId];
  if (!preset) {
    return [];
  }

  // Map style IDs to their corresponding style strings
  const styleMap: Record<PhotoStyleId, string> = {
    'photorealistic': photoRealisticStyle,
    'cartoon': cartoonStyle,
    'vintage50s': vintage50sStyle,
    'cinematic': cinematicStyle,
    'oil-painting': oilPaintingStyle,
    'watercolor': watercolorStyle,
  };

  const selectedStyle = styleMap[styleId] || photoRealisticStyle;

  // Replace the genericStyle in the prompt with the selected style
  const styledPrompt = preset.prompt.replace(photoRealisticStyle, selectedStyle);

  // Return the same prompt 4 times (AI will create 4 unique variations)
  return [styledPrompt, styledPrompt, styledPrompt, styledPrompt];
}
