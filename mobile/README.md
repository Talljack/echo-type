# EchoType Mobile App

React Native mobile application for EchoType - an English learning platform with Listen, Speak, Read, and Write modules.

## Tech Stack

- **Framework**: Expo (SDK 54) + React Native
- **Navigation**: Expo Router
- **Local Persistence**: Zustand + AsyncStorage
- **Secure Storage**: Expo SecureStore
- **Backend**: Optional Supabase authentication
- **UI Library**: React Native Paper

## Current MVP Scope

- Manual text import is supported.
- Practice data is stored locally on the device.
- Listen, Speak, Read, Write routes are available for saved content.
- Review works locally with demo-card support.
- Chat is a local tutor demo unless a real provider is added later.

## Project Structure

```
mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/            # Main app tabs
│   │   ├── index.tsx      # Dashboard
│   │   ├── listen.tsx     # Listen module
│   │   ├── speak.tsx      # Speak module
│   │   ├── library.tsx    # Content library
│   │   └── settings.tsx   # Settings
│   └── _layout.tsx        # Root layout
├── src/
│   ├── components/        # Reusable components
│   │   ├── ui/           # UI components (Button, Card)
│   │   └── layout/       # Layout components (Screen)
│   ├── stores/           # Zustand stores
│   ├── services/         # External services (Supabase)
│   ├── types/            # TypeScript types
│   └── constants/        # Constants (theme, etc.)
└── assets/               # Images, fonts, etc.
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- iOS Simulator (macOS) or Android Emulator
- Expo CLI

### Installation

```bash
cd mobile
npm install
```

### Environment Setup

Create a `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

### Code Quality

```bash
# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check
```

## Features Implemented (MVP)

### ✅ Core Infrastructure
- Expo project setup with TypeScript
- File-based routing with Expo Router
- AsyncStorage for local persistence (MVP)
- Zustand state management
- Material Design 3 UI system
- Development tools (Biome, TypeScript, EAS)

### ✅ Authentication
- Local-only authentication (MVP)
- Session management with AsyncStorage
- Secure token storage with SecureStore

### ✅ Navigation
- Tab navigation (Dashboard, Listen, Speak, Library, Settings)
- Authentication flow
- Protected routes

### ✅ Local Storage (MVP)
- Content library with AsyncStorage
- Practice progress tracking
- User preferences and settings
- Local-only data (no cloud sync in MVP)

### ✅ State Management
- Auth store (user session)
- Content store (learning materials)
- Settings store (user preferences)
- Listen/Speak/Read/Write stores (module states)
- Library store (content organization)
- Review store (spaced repetition)

## Next Steps (Post-MVP)

- Implement cloud sync with Supabase
- Add AI chat functionality
- Implement spaced repetition review system
- Add URL/YouTube/PDF import capabilities
- Implement Speak module with speech recognition
- Implement Read module with text highlighting
- Implement Write module with typing practice
- Add content management (CRUD operations)
- Implement spaced repetition algorithm (FSRS)
- Add offline support
- Implement push notifications
- Add analytics and error tracking

## Testing

The app has been tested on:
- ✅ iOS Simulator (iPhone 16 Pro)
- ⏳ Android Emulator (pending)
- ⏳ Physical devices (pending)

## Build & Deploy

```bash
# Create development build
npm run prebuild

# Build with EAS
eas build --platform ios
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## License

Proprietary - All rights reserved
