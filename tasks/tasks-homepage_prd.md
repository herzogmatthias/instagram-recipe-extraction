# Tasks: Homepage UI/UX Implementation

**Source PRD:** `homepage_prd.md`  
**Tech Stack:** Next.js 16, TypeScript, shadcn/ui, tailwindcss
**Initial Data:** JSON files in `data/` directory

---

## Relevant Files

- `src/app/page.tsx` - Main homepage component with card grid layout
- `src/components/RecipeCard.tsx` - Individual recipe card component with status display
- `src/components/RecipeCard.test.tsx` - Unit tests for RecipeCard component
- `src/components/Navbar.tsx` - Fixed navigation bar with search and theme toggle
- `src/components/Navbar.test.tsx` - Unit tests for Navbar component
- `src/components/AddLinkModal.tsx` - Modal dialog for adding Instagram URLs
- `src/components/AddLinkModal.test.tsx` - Unit tests for AddLinkModal component
- `src/components/StatusChip.tsx` - Status indicator chip component
- `src/components/StatusChip.test.tsx` - Unit tests for StatusChip component
- `src/components/FilterBar.tsx` - Filter and search controls above grid
- `src/components/FilterBar.test.tsx` - Unit tests for FilterBar component
- `src/lib/utils/recipeHelpers.ts` - Utility functions for recipe data formatting
- `src/lib/utils/recipeHelpers.test.ts` - Unit tests for recipe helpers
- `src/lib/hooks/useRecipeData.ts` - Custom hook for loading and managing recipe data
- `src/lib/hooks/useRecipePolling.ts` - Custom hook for polling non-terminal status recipes
- `src/types/index.ts` - Additional type definitions (complementing InstagramRecipePost.ts)
- `src/app/globals.css` - Global styles including color palette variables

### Notes

- Unit tests should be placed alongside the code files they are testing
- Use `npm test` to run all tests
- Initial implementation uses JSON files from `data/` directory; Firestore integration deferred
- Follow shadcn/ui component patterns for consistent styling

---

## Tasks

- [x] **1.0 Project Setup & Global Styling**

  - [x] 1.1 Install and configure shadcn/ui components needed (Button, Card, Badge, Input, Dialog, etc.)
  - [x] 1.2 Define color palette variables in `globals.css` based on design spec (#FDFDFB background, #D6E2C3 primary, #F3C6A5 secondary, etc.)
  - [x] 1.3 Set up base typography styles (small/semibold for titles, xs for meta/tags; for headings use Fraunces, for body use Inter, fallback "Fraunces", Georgia, serif and "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)
  - [x] 1.4 Configure responsive grid system with `minmax(280px, 1fr)` pattern (using Tailwind utilities: grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4)
  - [x] 1.5 Create utility classes for common spacing (12px inner, 16px between sections) (using Tailwind utilities: p-3, space-y-4)
  - [x] 1.6 Set up border radius (16-20px) and shadow (sm/md) utilities (using Tailwind utilities: rounded-lg shadow-md)

- [x] **2.0 Data Layer & Type Integration**

  - [x] 2.1 Create `useRecipeData` hook to load JSON files from `data/` directory
  - [x] 2.2 Implement data parsing to match `InstagramRecipePost` interface
  - [x] 2.3 Add error handling for missing or malformed JSON data
  - [x] 2.4 Create helper function to extract title (recipe_data.title → caption fallback)
  - [x] 2.5 Create helper function to format meta pills (total_time_min, difficulty, cuisine, macros)
  - [x] 2.6 Write unit tests for `recipeHelpers.ts` covering edge cases (missing fields, null values)
  - [x] 2.7 Create mock data factory for testing components

- [ ] **3.0 Core UI Components**

  - [ ] 3.1 Build `StatusChip` component with color coding for all statuses (queued, scraping, downloading_media, uploading_media, extracting, ready, failed)
  - [ ] 3.2 Add accessibility labels to `StatusChip` (readable text, not color-only)
  - [ ] 3.3 Build `RecipeCard` component with portrait 4:5 aspect ratio container
  - [ ] 3.4 Implement media section with `displayUrl`, object-cover, and blurred shimmer placeholder
  - [ ] 3.5 Add overlay elements: status chip (top-left) and title with gradient (bottom)
  - [ ] 3.6 Implement body section with meta pills (time, difficulty, cuisine, macros as kcal • P/F/C)
  - [ ] 3.7 Add tag display (up to 3 chips, then +N indicator)
  - [ ] 3.8 Create footer with action icons (Open, Copy Ingredients, Export JSON, kebab menu)
  - [ ] 3.9 Add hover states (lift effect, media scale +5%, shadow transition)
  - [ ] 3.10 Implement card states (queued with placeholder, processing with progress bar, ready, failed with warning border)
  - [ ] 3.11 Make entire card clickable with role="button" and focus-visible ring
  - [ ] 3.12 Ensure 4.5:1 contrast ratio for all text overlays
  - [ ] 3.13 Write unit tests for `RecipeCard` covering all visual states and interactions

- [ ] **4.0 Navigation & Layout**

  - [ ] 4.1 Build `Navbar` component with fixed positioning (~64px height)
  - [ ] 4.2 Add logo, navigation items (Library, Processing, Settings)
  - [ ] 4.3 Implement global search input with debouncing
  - [ ] 4.4 Add theme toggle button (light/dark mode)
  - [ ] 4.5 Ensure navbar stays accessible with proper z-index and spacing
  - [ ] 4.6 Write unit tests for `Navbar` interactions (search input, navigation)
  - [ ] 4.7 Build `FilterBar` component with status filter dropdown
  - [ ] 4.8 Add tag filter multi-select
  - [ ] 4.9 Implement free-text filter for title/caption search
  - [ ] 4.10 Add clear filters button
  - [ ] 4.11 Write unit tests for `FilterBar` covering filter combinations

- [ ] **5.0 Homepage Integration & Grid Layout**

  - [ ] 5.1 Update `src/app/page.tsx` to use `useRecipeData` hook
  - [ ] 5.2 Implement responsive card grid (3-4 columns desktop, 1-2 mobile)
  - [ ] 5.3 Add FAB or primary button for "Add Link" action
  - [ ] 5.4 Integrate `FilterBar` above grid
  - [ ] 5.5 Connect filter state to card display logic
  - [ ] 5.6 Implement scroll position preservation during filtering
  - [ ] 5.7 Add empty state with friendly prompt and "Add link" CTA
  - [ ] 5.8 Ensure cards never appear empty (always show cover or placeholder)
  - [ ] 5.9 Test grid responsiveness across breakpoints
  - [ ] 5.10 Write integration tests for homepage with multiple recipes

- [ ] **6.0 Add Link Functionality**

  - [ ] 6.1 Build `AddLinkModal` component using shadcn Dialog
  - [ ] 6.2 Add URL input field with Instagram URL validation
  - [ ] 6.3 Show validation errors inline (invalid URL format, non-Instagram URL)
  - [ ] 6.4 Implement optimistic UI update (create record with status=queued)
  - [ ] 6.5 Add new card to top of grid on submission
  - [ ] 6.6 Close modal after successful submission
  - [ ] 6.7 Handle submission errors gracefully
  - [ ] 6.8 Write unit tests for `AddLinkModal` covering validation and submission

- [ ] **7.0 Status Polling & Live Updates**

  - [ ] 7.1 Create `useRecipePolling` hook for non-terminal status recipes
  - [ ] 7.2 Implement polling logic with exponential backoff
  - [ ] 7.3 Update card inline when status transitions occur
  - [ ] 7.4 Show toast notification when recipe reaches "ready" status
  - [ ] 7.5 Stop polling when recipe reaches terminal state (ready/failed)
  - [ ] 7.6 Add visual progress indicator during processing states
  - [ ] 7.7 Handle polling errors and connection issues
  - [ ] 7.8 Write unit tests for `useRecipePolling` hook

- [ ] **8.0 Card Actions & Interactions**

  - [ ] 8.1 Implement "Open" button (disabled until status=ready)
  - [ ] 8.2 Add "Copy Ingredients" action using clipboard API
  - [ ] 8.3 Show success feedback after copying ingredients
  - [ ] 8.4 Implement "Export JSON" action to download recipe_data
  - [ ] 8.5 Build kebab menu with Retry, View Post, Delete actions
  - [ ] 8.6 Implement "Retry" action for failed recipes (resume from appropriate step)
  - [ ] 8.7 Add "View Post" action to open Instagram URL in new tab
  - [ ] 8.8 Implement "Delete" action with confirmation dialog
  - [ ] 8.9 Ensure all actions are only visible/enabled when appropriate (based on recipe_data presence)
  - [ ] 8.10 Add aria-labels to all action icons
  - [ ] 8.11 Write unit tests for all card actions

- [ ] **9.0 Error Handling & Edge Cases**

  - [ ] 9.1 Handle partial recipe data gracefully (show only available fields)
  - [ ] 9.2 Never display zero or placeholder macros (hide if not available)
  - [ ] 9.3 Keep last good cover/title when errors occur
  - [ ] 9.4 Show error tooltip/badge with descriptive message
  - [ ] 9.5 Implement graceful degradation for missing displayUrl
  - [ ] 9.6 Handle long titles with proper text clamping (2-line max)
  - [ ] 9.7 Handle missing or invalid timestamps
  - [ ] 9.8 Test all edge cases with various incomplete data scenarios

- [ ] **10.0 Accessibility & Polish**
  - [ ] 10.1 Verify all interactive elements have keyboard navigation
  - [ ] 10.2 Test screen reader compatibility for all components
  - [ ] 10.3 Ensure focus management in modals and dialogs
  - [ ] 10.4 Add loading skeletons with proper aria-busy attributes
  - [ ] 10.5 Implement smooth transitions for all state changes
  - [ ] 10.6 Add subtle animation to card hover (lift + shadow + scale)
  - [ ] 10.7 Verify 4.5:1 contrast ratio across all text elements
  - [ ] 10.8 Test with keyboard-only navigation
  - [ ] 10.9 Run accessibility audit with axe or similar tool
  - [ ] 10.10 Fix any accessibility issues found during audit

---

## Implementation Notes

### Phase 1: Foundation (Tasks 1-2)

Start with global styling and data layer to establish the foundation. This ensures consistent styling and reliable data access for all components.

### Phase 2: Core Components (Tasks 3-4)

Build the individual UI components (cards, navigation, filters) independently. These can be developed in parallel with mock data.

### Phase 3: Integration (Tasks 5-6)

Assemble components into the full homepage layout and add the ability to create new entries.

### Phase 4: Dynamic Features (Tasks 7-8)

Add polling, live updates, and interactive actions once the static UI is stable.

### Phase 5: Refinement (Tasks 9-10)

Handle edge cases, improve accessibility, and polish the user experience.

### Testing Strategy

- Write unit tests alongside component development
- Use mock data factories for consistent test scenarios
- Test visual states and interactions separately from data logic
- Validate accessibility with automated tools and manual testing

### Future Considerations

- Firestore integration will replace JSON file loading (update `useRecipeData` hook)
- Instagram scraper integration via Apify will replace manual data entry
- Detail view page for individual recipes (not in this PRD)
- Recipe chatbot feature (separate implementation)
