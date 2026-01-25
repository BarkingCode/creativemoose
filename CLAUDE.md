# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PhotoApp is a monorepo containing a mobile app and web app for AI photo generation with Canadian-themed presets. Users upload photos, select presets/styles, and receive AI-generated image variations.

## Repository Structure

```
photoapp/
├── mobile/           # Expo/React Native mobile app (see mobile/CLAUDE.md)
├── app/              # Next.js web app (App Router)
├── lib/              # Shared web utilities
├── components/       # Shared web components
├── shared/           # Shared preset/style definitions
└── supabase/
    ├── functions/    # Edge Functions (fal.ai integration)
    ├── migrations/   # Database migrations
    └── schema.sql    # Base schema
```

## Technology Stack

| Layer | Mobile | Web | Backend |
|-------|--------|-----|---------|
| Framework | Expo/React Native | Next.js (App Router) | Supabase |
| Auth | Supabase Auth | Supabase Auth | - |
| Payments | RevenueCat | - | - |
| AI Generation | - | - | fal.ai via Edge Functions |
| Database | - | - | PostgreSQL (Supabase) |
| Storage | - | - | Supabase Storage |

## Supabase Edge Functions

All AI generation happens server-side via Edge Functions:

| Function | Flow | Purpose |
|----------|------|---------|
| `reserve-credit` | Mobile parallel | Reserve credit, create session |
| `generate-single` | Mobile parallel | Generate one image (called 4x) |
| `generate` | Web serial | Generate all 4 images sequentially |
| `preview` | Both | Anonymous rate-limited preview |

Shared code in `_shared/`: `auth.ts`, `credits.ts`, `presets.ts`, `cors.ts`

You have access to supabase cli and mcp please use it when need to push function or migrations

## Database Schema

Core tables (see `supabase/schema.sql` + migrations):
- `profiles` - User data (auto-created on signup)
- `credits` - Credit balance (free_credits + image_credits)
- `generations` - Generation history (single source of truth)
- `generation_sessions` - Temporary parallel session tracking
- `images` - Individual image records with storage paths
- `purchases` - RevenueCat purchase records
- `preview_requests` - Rate limiting for anonymous users

## Development Commands

### Mobile (in `/mobile`)
```bash
npm start              # Expo dev server
npm run ios            # iOS simulator
npm run android        # Android emulator
```

### Web (root)
```bash
pnpm dev               # Next.js dev server
pnpm build             # Production build
```

### Supabase
```bash
supabase start         # Local Supabase
supabase db push       # Apply migrations
supabase functions serve  # Local Edge Functions
supabase functions deploy <name>  # Deploy function
```

## Environment Variables

### Mobile (`mobile/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=
```

### Web (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Edge Functions (Supabase Dashboard)
```
FAL_KEY=               # fal.ai API key
```

## Conventions

### Package Managers
- **Web**: Use `pnpm`
- **Mobile**: Use `npm`

### Supabase Imports
- **Next.js Server Components**: Import from `@supabase/ssr` or `supabase/server`
- **Next.js Client Components** (`'use client'`): Import from `supabase/client`
- **Mobile**: Always use `lib/supabase.ts`

### Component Documentation
Add JSDoc comment at top of new components describing purpose and capabilities.

### File Creation Policy
- Prefer editing existing files over creating new ones
- Never proactively create documentation files unless explicitly requested

## Credit System Architecture

Both mobile and web use the same credit system:
1. **Free credits**: 1 per new user (decremented first)
2. **Paid credits**: Purchased via RevenueCat (mobile) or stored manually
3. **Atomic operations**: Use `decrement_credits` RPC to prevent race conditions
4. **Generation tracking**: All generations recorded in `generations` table
