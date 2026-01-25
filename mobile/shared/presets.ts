/**
 * Preset Definitions (Mobile)
 *
 * Preset metadata and picker options for the mobile app UI.
 * Actual prompt generation happens server-side in Supabase Edge Functions.
 */

export interface PresetPickerOption {
  id: string;
  name: string;
  emoji: string;
}

export interface Preset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  prompt: string;
  requiresRefs: boolean;
  type: "image" | "video";
}

export const PRESETS: Record<string, Preset> = {
  mapleAutumn: {
    id: "mapleAutumn",
    name: "Maple Autumn",
    emoji: "🍁",
    description: "Golden fall leaves and cozy Canadian atmosphere",
    requiresRefs: false,
    type: "image",
    prompt: `Immerse the person in a stunning Canadian autumn scene with vibrant fall colors - warm oranges, deep reds, and golden yellows. Create diverse and creative compositions featuring maple leaves, cozy seasonal clothing, and beautiful fall lighting. Vary the settings between forests, lakesides, parks, and charming towns. Experiment with different times of day, weather conditions, and activities. Make each generation unique - from cozy and intimate to grand and cinematic. Capture the magical essence of Canadian fall with creativity and variety.`,
  },
  winterWonderland: {
    id: "winterWonderland",
    name: "Winter Wonderland",
    emoji: "❄️",
    description: "Snowy Canadian winter moments",
    requiresRefs: false,
    type: "image",
    prompt: `Place the person in a magical Canadian winter wonderland with pristine snow, frosted trees, and beautiful winter light. Use soft whites, cool blues, and warm accent colors. Be creative with winter elements - snowfall, ice, evergreens, cozy cabins, winter sports. Vary the locations between wilderness, mountains, lakesides, and charming snowy towns. Experiment with different lighting conditions, weather, and activities. Create diverse moods from adventurous and dynamic to cozy and serene. Each generation should feel unique and capture the breathtaking beauty of Canadian winter.`,
  },
  northernLights: {
    id: "northernLights",
    name: "Northern Lights",
    emoji: "🌌",
    description: "Magical aurora and night sky filters",
    requiresRefs: false,
    type: "image",
    prompt: `Create breathtaking scenes with the person under the Northern Lights in the Canadian wilderness. Use vibrant aurora colors - greens, purples, blues, and pinks dancing across the night sky. Include stunning night elements like stars, snow, wilderness, water reflections. Be creative with compositions - from dramatic silhouettes to illuminated portraits. Vary the settings between arctic landscapes, frozen lakes, snowy forests, and remote wilderness. Experiment with different aurora patterns, lighting contrasts, and perspectives. Make each generation unique and magical, capturing the awe-inspiring wonder of the aurora borealis in diverse and creative ways.`,
  },
  cottageLife: {
    id: "cottageLife",
    name: "Cottage Life",
    emoji: "🏕️",
    description: "Peaceful lakefront and cozy cabin filters",
    requiresRefs: false,
    type: "image",
    prompt: `Immerse the person in serene Canadian cottage country with beautiful lakefront settings. Use natural colors - greens, blues, warm wood tones. Create diverse scenes with cottage elements like docks, canoes, Muskoka chairs, cabins, fire pits. Vary the locations between lakesides, forests, and waterfront properties. Experiment with different times of day - sunrise, golden hour, misty mornings, sunset. Include various activities like paddling, relaxing, enjoying nature, or peaceful moments. Make each generation unique with different moods from tranquil and peaceful to adventurous and lively. Capture the essence of Canadian cottage living with creativity and variety.`,
  },
  urbanCanada: {
    id: "urbanCanada",
    name: "Urban Canada",
    emoji: "🏙️",
    description: "Modern Canadian city life filter",
    requiresRefs: false,
    type: "image",
    prompt: `Place the person in vibrant Canadian city environments showcasing modern urban life. Feature contemporary architecture, city lights, street art, trendy cafés, bustling markets, iconic buildings, and multicultural neighborhoods. Vary the settings between downtown cores, waterfronts, rooftops, markets, and historic districts. Experiment with different times - daytime energy, blue hour, golden hour, night lights. Include diverse activities like exploring, dining, walking, or enjoying city views. Create unique compositions with varied moods from energetic and dynamic to sophisticated and casual. Capture the cosmopolitan essence of Canadian cities with creativity and diversity.`,
  },
  wildernessExplorer: {
    id: "wildernessExplorer",
    name: "Wilderness Explorer",
    emoji: "🏔️",
    description: "Wild landscapes and adventure scenes",
    requiresRefs: false,
    type: "image",
    prompt: `Place the person in epic Canadian wilderness settings full of adventure and natural beauty. Feature dramatic landscapes - towering mountains, ancient forests, rushing waterfalls, pristine lakes, rugged trails, and vast national parks. Use stunning natural lighting and powerful compositions. Vary the locations and scale - from intimate forest scenes to grand mountain vistas. Experiment with different weather conditions, times of day, and activities like hiking, exploring, camping, or contemplating nature. Make each generation unique with diverse moods from peaceful and contemplative to dramatic and adventurous. Capture the raw, majestic beauty of Canada's wild spaces creatively.`,
  },
  editorialCanada: {
    id: "editorialCanada",
    name: "Editorial Canada",
    emoji: "📸",
    description: "Stylish portrait filters inspired by Canadian fashion & culture",
    requiresRefs: false,
    type: "image",
    prompt: `Create magazine-worthy editorial portraits with the person in stylish Canadian settings. Use sophisticated lighting, elegant compositions, and fashion-forward aesthetics. Feature diverse backdrops - modern urban architecture, minimalist nature, cultural landmarks, or unique Canadian locations. Experiment with different styling approaches - contemporary, rustic-elegant, bold, or classic. Vary the lighting from dramatic and moody to soft and refined. Include creative depth of field, interesting angles, and professional techniques. Make each generation unique with varied moods from confident and powerful to sophisticated and casual-chic. Capture the intersection of Canadian culture and contemporary fashion with artistic creativity.`,
  },
  canadianWildlifeParty: {
    id: "canadianWildlifeParty",
    name: "Canadian Wildlife Party",
    emoji: "🦫",
    description: "Funny and surreal wildlife interactions in Canadian settings",
    requiresRefs: false,
    type: "image",
    prompt: `Create hilarious and surreal scenes with the person interacting with Canadian wildlife in unexpected and comedic ways. Feature iconic animals - moose, beavers, bears, raccoons, geese - in absurd but photorealistic situations. Imagine creative scenarios like playing sports together, sharing meals, outdoor adventures, or everyday activities. Vary the settings from wilderness to urban to recreational areas. Use good lighting and realistic rendering while embracing the humor and whimsy. Make each generation uniquely funny with different animals, activities, and comedic situations. Keep it charming and heartwarming while capturing the playful side of Canadian wildlife encounters.`,
  },
  ehEdition: {
    id: "ehEdition",
    name: "Eh Edition",
    emoji: "🍁",
    description: "Lighthearted and comedic takes on Canadian stereotypes",
    requiresRefs: false,
    type: "image",
    prompt: `Create fun and comedic scenes celebrating Canadian stereotypes with the person in hilarious situations. Feature iconic Canadiana - maple syrup, hockey, Tim Hortons, Mounties, extreme politeness, winter obsessions, apologizing excessively, poutine. Imagine creative scenarios that playfully exaggerate national pride and cultural quirks. Vary the settings and situations - everyday life with excessive Canadian elements, over-the-top polite encounters, winter worship, or hockey fanaticism. Use photorealistic quality while embracing good-natured humor. Make each generation uniquely funny with different stereotypes and comedic situations. Keep it affectionate and lighthearted, capturing Canadian humor with pride and charm.`,
  },
  withus: {
    id: "withus",
    name: "With Us",
    emoji: "👥",
    description: "User appears with two reference hosts in Canadian settings",
    requiresRefs: true,
    type: "image",
    prompt: `Create natural and authentic group photos with three people together exploring beautiful Canadian settings. Use balanced compositions with all three faces clearly visible and naturally integrated. Feature diverse Canadian backdrops - stunning nature, vibrant cities, cultural landmarks, or unique locations. Vary the group activities and interactions - outdoor adventures, city exploration, relaxed moments, shared experiences, laughing together. Experiment with different lighting, times of day, and perspectives. Make each generation unique with varied settings, poses, and moods from adventurous and dynamic to relaxed and joyful. Capture the genuine atmosphere of friends experiencing Canada together with creativity and authenticity. Maintain realistic proportions and natural group dynamics.`,
  },
};

export const PRESET_ORDER = [
  "mapleAutumn",
  "winterWonderland",
  "northernLights",
  "cottageLife",
  "urbanCanada",
  "wildernessExplorer",
  "editorialCanada",
  "canadianWildlifeParty",
  "ehEdition",
  "withus",
];

/** Picker-friendly array with id, name, emoji */
export const PRESET_PICKER_OPTIONS: PresetPickerOption[] = PRESET_ORDER.map(
  (id) => ({
    id: PRESETS[id].id,
    name: PRESETS[id].name,
    emoji: PRESETS[id].emoji,
  })
);

export const DEFAULT_PRESET = "mapleAutumn";
