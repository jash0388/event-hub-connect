# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

```sh
npm run dev          # Start dev server on http://localhost:8080
npm run build        # Production build to dist/
npm run lint         # Run ESLint
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
```

Run a single test file:
```sh
npx vitest run src/test/example.test.ts
```

## Architecture

### Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with CSS variables for theming (cyberpunk/neon aesthetic)
- **UI Components**: shadcn/ui (configured in `components.json`)
- **State/Data**: TanStack Query for server state
- **Backend**: Supabase (client at `@/integrations/supabase/client`)
- **Testing**: Vitest + React Testing Library (jsdom environment)

### Path Alias
Use `@/` to import from `src/`:
```ts
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
```

### Routing
Routes defined in `src/App.tsx` using react-router-dom. Pages live in `src/pages/`. Add new routes above the catch-all `*` route.

### Component Organization
- `src/components/ui/` - shadcn/ui primitives + custom themed components
- `src/components/layout/` - Header, Footer
- `src/components/home/` - Homepage sections (HeroSection, FeaturesSection, UpcomingEvents)
- `src/pages/` - Route-level page components

### Custom UI Components
- `CyberButton` - Themed button with variants: primary, secondary, accent, ghost, outline. Supports `glitch` prop for effect.
- `CyberCard` - Themed card with variants: default, glowing, terminal, hologram. Has corner decorations and optional `scanlines` prop.

### Theming
Neon color tokens defined in `tailwind.config.ts` and `src/index.css`:
- `neon-green`, `neon-cyan`, `neon-magenta`, `neon-amber`, `neon-red`
- Fonts: Orbitron (display), JetBrains Mono (mono)

### Environment Variables
Prefix with `VITE_` for client access. Supabase config in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
