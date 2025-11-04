# Instagram Recipe Extraction

The Project should focus around a Next.Js App where a User can paste a Instagram Post Link and the App automatically extracts the data like Comments, videoUrl or imageUrl and caption and feeds that to the Gemini API which should analyse the multimodal content and returns the recipe plus optional steps on how to create it. Also it should display this information plus how long it would take + a difficulty rating. Also a chatbot should provide help for the specific recipe.

## Role

You are an expert Full Stack Web Developer specialized in Next.JS with Shadcn UI and Firestore serverless applications.

## Development Setup

```bash
# Installation
npm install  # oder yarn/pnpm

# Development
npm run dev

# Build
npm run build

# Tests
npm test
```

## Tech Stack

- **Framework**: Next.Js v16.\* (https://nextjs.org/docs)
- **Language**: Typescript
- **Styling**: shadcn@latest (https://ui.shadcn.com/docs/installation)
- **Database**: Cloud Firestore (Before DB implementation use Local JSON Files)
- **AI Layer**: Google Gen AI SDK (https://googleapis.github.io/js-genai/release_docs/index.html)

## Project Structure

```
src/
├── app/          # Next.js App Router
├── components/   # Reusable UI components
├── lib/          # Utilities and services
├── hooks/        # Custom React hooks
└── types/        # TypeScript type definitions
```

## Design Standards

- Do not overload the User with functionality - keep it clean and simple.
- **Color Palette**
  | Role | Color | Notes |
  | ---------------- | --------- | ------------------- |
  | Background | `#FDFDFB` | creamy neutral |
  | Surface | `#FFFFFF` | white cards |
  | Primary Accent | `#D6E2C3` | light olive/sage |
  | Secondary Accent | `#F3C6A5` | soft coral/peach |
  | Text | `#333333` | readable gray-black |
  | Border | `#EAEAEA` | light neutral line |

## Code Standards

### General Rules

- Prefer TypeScript over JavaScript
- Use functional components with hooks
- Follow ESLint configuration
- Write tests for new features

### Naming Conventions

- Components: PascalCase (UserProfile.tsx)
- Utilities: camelCase (formatDate.ts)
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase with suffix (UserType)

### File Organization

- Colocate tests with source files
- Group related components in folders
- Use index.ts for clean imports

## Important Patterns

### API Calls

Always use the API client from lib/api:

```typescript
import { apiClient } from "@/lib/api";
const data = await apiClient.get("/endpoint");
```

### State Management

- Use React Context for global state
- Prefer local state when possible
- Consider Zustand for complex state

## Testing Guidelines

- Write tests alongside implementation
- Focus on user behavior, not implementation
- Maintain &gt; 80% coverage for critical paths
- Use data-testid for reliable selection

## Common Pitfalls to Avoid

- DON'T: Create new files unless necessary
- DON'T: Use console.log in production code
- DON'T: Ignore TypeScript errors
- DON'T: Skip tests for "simple" features
- DO: Check existing components before creating new ones
- DO: Follow established patterns in the codebase
- DO: Keep functions small and focused

## Performance Considerations

- Lazy load heavy components
- Use React.memo for expensive renders
- Optimize images with next/image
- Monitor bundle size

## Deployment

- Main branch deploys to production
- PR previews on Vercel
- Environment variables in .env.local
- Secrets managed via Vercel dashboard

## Additional Resources

- for testing use the json files under data: there is the instagram post data and recipe data. they are connected via id and ref_id.
- later we will use a scraper for getting the data: https://apify.com/apify/instagram-post-scraper please keep this change in mind
