# PhotoApp Mobile

AI-powered profile photo generation app built with Expo and React Native. Transform selfies into professional, themed profile images using Google Gemini AI.

---

## What This App Does

PhotoApp lets users take a selfie or select a photo, choose a Canadian-themed preset (Toronto, Vancouver, Banff, etc.) and art style, then generates 4 unique AI variations of their photo using Google Gemini 2.5 Flash Image.

### Key Features

- **AI Photo Generation**: Upload a photo → Select preset + style → Get 4 AI-generated variations
- **Canadian Presets**: Toronto, Vancouver, Banff, Montreal, Northern Lights, Cottage Life, and more
- **Art Styles**: Photorealistic, Cartoon, Cinematic, Vintage 50s, Oil Painting, Watercolor
- **Social Feed**: Browse and share photos publicly with other users
- **Gallery**: Save and manage your generated images
- **Credit System**: Free trial generations + in-app purchases via RevenueCat

---

## User Flows

### Anonymous User Flow (Free Trial)

```
App Opens → Splash Screen (first visit) → Instructions Overlay → Camera View
                                                                    ↓
                                         [2 free generations available]
                                                                    ↓
                                         Take photo → Generate → Watermarked preview
                                                                    ↓
                                         After 2 tries → Login Modal
                                                                    ↓
                                         Sign in (Google/Apple/Email/OTP)
                                                                    ↓
                                         Redirect to Tab Navigation
```

### Signed-In User Flow

```
App Opens → Tab Navigation
                  │
    ┌─────────────┼─────────────┐
    │             │             │
  Home         Generate      Gallery
(public feed)  (camera)    (my images)
```

---

## Authentication Methods

| Method | Description |
|--------|-------------|
| **Google OAuth** | Sign in with Google account |
| **Apple Sign-In** | Sign in with Apple ID (iOS) |
| **Email/Password** | Traditional email + password |
| **Magic Link (OTP)** | Passwordless sign-in via email link |

---

## Tab Navigation

| Tab | Icon | Description |
|-----|------|-------------|
| Home | 🏠 | Browse publicly shared photos from all users |
| Generate | ➕ | Camera view for taking/selecting photos |
| Gallery | 📷 | View and manage your generated images |

---

## Presets Available

| Preset | Emoji | Description |
|--------|-------|-------------|
| Maple Autumn | 🍁 | Fall colors with maple leaves |
| Winter Wonderland | ❄️ | Snowy winter scenes |
| Northern Lights | 🌌 | Aurora borealis backdrop |
| Cottage Life | 🏕️ | Lakeside cottage vibes |
| Urban Canada | 🏙️ | City skylines (Toronto, Vancouver) |
| Wilderness Explorer | 🏔️ | Mountain and nature settings |
| Editorial | 📸 | Professional magazine style |
| Wildlife Party | 🦫 | Fun Canadian wildlife theme |
| Eh Edition | 🍁 | Classic Canadian aesthetic |
| With Us | 👥 | Multi-person compositions |

---

## Art Styles

| Style | Emoji | Description |
|-------|-------|-------------|
| Photorealistic | 📷 | Natural, realistic look |
| Cartoon | 🎨 | Animated cartoon style |
| Vintage 50s | 📺 | Retro 1950s aesthetic |
| Cinematic | 🎬 | Movie poster quality |
| Oil Painting | 🖼️ | Classical art style |
| Watercolor | 💧 | Soft watercolor effect |

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Expo SDK 54 + React Native 0.81 |
| **Routing** | Expo Router v6 (file-based) |
| **Styling** | NativeWind v4 (Tailwind CSS) |
| **Backend** | Supabase (Auth, Database, Storage) |
| **AI Generation** | Google Gemini 2.5 Flash Image |
| **Payments** | RevenueCat (iOS & Android) |
| **Animations** | React Native Reanimated |
| **Icons** | Lucide React Native |

---

## Project Structure

```
mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Auth screens (sign-in, sign-up)
│   ├── (tabs)/            # Tab navigation (home, generate, gallery)
│   ├── (app)/             # App screens (results, purchase)
│   ├── index.tsx          # Anonymous landing page
│   └── preview-results.tsx # Preview results for free trial
├── components/            # Reusable components
│   ├── SplashScreen.tsx   # Initial splash screen
│   ├── InstructionOverlay.tsx # How-to guide
│   └── LoginPromptModal.tsx # Multi-auth login modal
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication state
├── hooks/                 # Custom hooks
│   └── useAnonymousCredits.ts # Free trial tracking
├── lib/                   # Utilities
│   └── supabase.ts        # Supabase client
└── assets/                # Images and fonts
```

---

## Environment Variables

Create a `.env` file in the mobile folder:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# API (your web app backend)
EXPO_PUBLIC_API_URL=http://localhost:3000

# RevenueCat
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_key
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Build for iOS device (EAS)
npx eas build --profile development --platform ios

# Build for Android device (EAS)
npx eas build --profile development --platform android
```

---

## Database Schema (Supabase)

### Tables

**profiles**
- User profile information
- Linked to auth.users

**credits**
- `user_id` - User reference
- `image_credits` - Purchased credits
- `free_credits` - Signup bonus credits
- `total_generations` - Lifetime count

**images**
- `id` - Unique image ID
- `user_id` - Owner
- `image_url` - Supabase Storage URL
- `preset_id` - Which preset was used
- `style_id` - Which style was used
- `is_public` - Shared to feed?
- `generation_batch_id` - Groups 4 images together

---

## Credit System

| Action | Credits |
|--------|---------|
| Anonymous free trial | 2 generations (watermarked) |
| Signup bonus | 1 free generation |
| Generate images | -1 credit per batch (4 images) |
| Purchase via RevenueCat | +N credits |

---

## Key Implementation Notes

1. **Anonymous users** get 2 free generations with watermarked results stored in AsyncStorage
2. **OAuth** uses Supabase auth with deep linking (`photoapp://auth/callback`)
3. **Images** are stored in Supabase Storage, URLs saved to database
4. **Free trial** results are not persisted - only shown once
5. **Signed-in users** can save to gallery and share publicly
6. **Tab navigation** only appears for authenticated users

---

## API Endpoints (Web Backend)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | POST | Full generation (authenticated) |
| `/api/preview` | POST | Anonymous preview (watermarked) |
| `/api/feed` | GET | Public images feed |
| `/api/gallery` | GET | User's saved images |
| `/api/images/[id]` | PATCH/DELETE | Update/delete image |
| `/api/credits` | GET | User's credit balance |

---

## Planned Features

- [ ] Push notifications for generation completion
- [ ] Image editing/cropping before generation
- [ ] Favorite images
- [ ] Download all images as ZIP
- [ ] Share to Instagram/TikTok
- [ ] Referral program for free credits
