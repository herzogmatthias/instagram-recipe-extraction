# Tasks: Details Page PRD Implementation

**Source PRD:** `details_prd.md`  
**Tech Stack:** Next.js 16, TypeScript, shadcn/ui, tailwindcss, Firestore, Apify, Gemini LLM

## Relevant Files

- `src/app/recipes/[id]/page.tsx` - Recipe detail route that composes the two-column layout, fetches data, and wires global state.
- `src/app/recipes/[id]/cook-mode/page.tsx` - Full-screen cook mode surface for large typography and step navigation.
- `src/components/recipe-detail` - Folder for header, media, ingredient list, steps, sticky controls, macros card, variant switcher, and auxiliary cards.
- `src/components/chat/RecipeChatbot.tsx` / `RecipeChatbot.test.tsx` - Dockable chatbot UI that triggers Gemini calls and renders diffs.
- `src/lib/state/recipeDetailStore.ts` / `recipeDetailStore.test.ts` - Client-side store for servings, unit system, checked ingredients, cook mode state, and active variant.
- `src/lib/server/services/firestore.ts` / `gemini.ts` - Data + AI service layers expanded to read/write variants and message history.
- `data/recipes.json` & `data/instagram-posts.json` - Local fixtures acting as Firestore stand-ins during development and testing.

### Notes

- Keep UI + state logic colocated (component + hook + test) to simplify maintenance.
- Favor server actions/Route Handlers for mutation flows (e.g., saving variants) to preserve typing and reuse Firestore helpers.
- Use Jest + Testing Library for client components; supplement with integration tests in `src/app/__tests__`.
- Mock Gemini + Firestore layers in tests via the existing service interfaces.

## Tasks

- [x] 1.0 Build the recipe detail route, loader, and base layout structure.

  - [x] 1.1 Create `src/app/recipes/[id]/page.tsx` that fetches recipe + Instagram metadata from Firestore and passes typed props to the UI.
  - [x] 1.2 Implement the responsive two-column shell (left content, right sidebar) honoring the color palette, sticky behavior, and mobile collapse rules.
  - [x] 1.3 Add the header bar with title/author/badges/actions plus the media card (video player, poster image, engagement stats).
  - [x] 1.4 Render the recipe meta strip (servings input, prep/cook/total, difficulty, cuisine, tags) with accessible controls and derived duration formatting utilities.

- [x] 2.0 Implement interactive ingredient + step experiences with serving and unit scaling.

  - [x] 2.1 Build a shared state store/hook for `servings`, `unitSystem`, `checkedIngredients`, `activeStep`, `cookMode`, and highlight mapping between steps and ingredients.
  - [x] 2.2 Create the ingredient panel grouped by section, supporting metric/US toggles, serving scaling, copy-to-clipboard, and local “Add to shopping list”.
  - [x] 2.3 Develop the steps panel with ingredient chips, hover/highlight syncing, chef’s note callouts, and inline timers where available.
  - [x] 2.4 Implement cook mode (separate route or modal) with large typography, step navigation, timers, and sticky bottom controls mirroring the main page actions.

- [ ] 3.0 Create the sidebar insights (macros, variants, quick actions, quality, source).

  - [ ] 3.1 Add macros card showing per-serving stats plus recalculated totals when servings change; reuse state store selectors.
  - [ ] 3.2 Build the variant switcher card with list, rename/delete (guard original), and persistence via Firestore collections (no fallback).
  - [ ] 3.3 Implement quick actions that prefill chatbot prompts (spicier, vegan, gluten-free, budget) and surface CTA buttons.
  - [ ] 3.4 Render source + quality cards with confidence badge, assumptions accordion, timestamps, music info, and external links.

- [ ] 4.0 Integrate chatbot workflow for Q&A and recipe variant generation with Firestore storage.

  - [ ] 4.1 Create the dockable chatbot UI with starter prompt chips, history threading (global + variant scoped), and context injection (caption + active variant).
  - [ ] 4.2 Wire the chatbot to Google Gemini via `src/lib/server/services/gemini.ts`, handling multimodal payloads (video/image URLs + caption text).
  - [ ] 4.3 Implement the `createVariant` function call handler that validates `RecipeData`, shows a diff preview (ingredients, steps, macros), and saves via Firestore.
  - [ ] 4.4 Update variant state + Firestore documents when a new variant is accepted, ensuring the switcher and macros immediately reflect the active variant.

- [ ] 5.0 Add supporting infrastructure, accessibility, and test coverage.
  - [ ] 5.1 Extend Firestore service to support variants, message history, and hybrid thread retrieval APIs.
  - [ ] 5.2 Write unit tests for state store, ingredient scaling utilities, cook mode navigation, and chatbot reducer logic.
  - [ ] 5.3 Add integration tests covering the route loader, variant creation flow, and chatbot function-call lifecycle.
  - [ ] 5.4 Perform accessibility sweeps (focus order, ARIA labels, keyboard navigation) and document manual QA + analytics hooks for sticky controls.
