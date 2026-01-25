# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expo/React Native mobile app for AI photo generation with Canadian-themed presets. Users take photos, select presets and styles, and receive 4 AI-generated image variations via fal.ai through Supabase Edge Functions.

## Technology Stack

- **Expo SDK 54** + React Native + TypeScript
- **Expo Router** for file-based navigation
- **Supabase** for auth, database, and Edge Functions
- **RevenueCat** for in-app purchases
- **fal.ai** for AI image generation (via Edge Functions)
- **NativeWind** (Tailwind CSS for React Native)

## Development Commands

```bash
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run prebuild       # Generate native projects
npm run build:ios      # Build iOS with EAS
npm run build:android  # Build Android with EAS
```

## Environment Variables

Required in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=
EXPO_PUBLIC_API_URL=  # Optional: for web API features
```

## Architecture

### Navigation Structure (Expo Router)

```
app/
├── _layout.tsx          # Root: AuthProvider + RevenueCatProvider
├── index.tsx            # Entry: redirects based on auth state
├── (auth)/              # Auth screens (sign-in, sign-up)
├── (tabs)/              # Main tab navigation (home, generate, gallery)
└── (app)/               # Full-screen flows (results, purchase, profile)
```

### Context Providers (in `contexts/`)

- **AuthContext** - Wraps Supabase auth with `useAuth()` hook. Handles OAuth deep links via `kg-photo://auth/callback`
- **RevenueCatContext** - In-app purchases with `useRevenueCat()` hook. Maps product IDs to credits and syncs with Supabase

### Image Generation Flow

**Parallel Generation (Authenticated Users):**
1. `reserveCredit()` → Creates `generations` + `generation_sessions` records, returns `sessionId`
2. `generateSingleImage()` x4 in parallel → Each uses `sessionId`, creates `images` record
3. Images stored in Supabase Storage, URLs in `generations.image_urls`

**Preview Mode (Anonymous Users):**
1. `generatePreview()` → Rate-limited by IP (1/day), returns watermarked image
2. No database persistence, no credits required

### Supabase Edge Functions (in `../supabase/functions/`)

| Function | Purpose |
|----------|---------|
| `reserve-credit` | Decrements credit, creates generation session |
| `generate-single` | Generates one image variant using fal.ai |
| `generate` | Serial generation (4 images, used by web app) |
| `preview` | Anonymous preview with rate limiting |

Shared utilities in `_shared/`: `auth.ts`, `credits.ts`, `presets.ts`, `cors.ts`

### Database Tables (Supabase)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) |
| `credits` | User credit balance (free + paid) |
| `generations` | Generation history (canonical record) |
| `generation_sessions` | Temporary parallel generation tracking |
| `images` | Individual image records with storage paths |
| `purchases` | RevenueCat purchase history |
| `preview_requests` | Rate limiting for anonymous previews |

### Credit System

- **Free credits**: 1 per new user (stored in `credits.free_credits`)
- **Paid credits**: Purchased via RevenueCat (stored in `credits.image_credits`)
- **Decrement**: Uses `decrement_credits` RPC for atomic operations
- **Add credits**: Uses `add_credits` RPC after purchase

### Key Files

| File | Purpose |
|------|---------|
| `lib/supabase.ts` | Supabase client with SecureStore adapter |
| `lib/fal.ts` | Edge Function client for image generation |
| `shared/presets.ts` | Preset definitions and picker options |
| `shared/photo-styles.ts` | Photo style definitions |

## Conventions

### Supabase Imports
All mobile code uses `lib/supabase.ts` client (no server/client distinction like web).

### Component Documentation
Add JSDoc comment at top of new components describing purpose and capabilities.

### Error Handling
Generation functions throw specific error strings: `"UNAUTHORIZED"`, `"INSUFFICIENT_CREDITS"`, `"RATE_LIMITED"`, `"INVALID_SESSION"`. Handle these explicitly in UI.

### Deep Links
OAuth callback URL: `kg-photo://auth/callback`
Handled in `AuthContext` and `app/auth/callback.tsx`
