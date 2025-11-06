# Tasks: Backend Implementation for Instagram Recipe Extraction

**Source PRD:** `backend_prd.md`  
**Tech Stack:** Next.js 16, TypeScript, shadcn/ui, tailwindcss, Firestore, Apify, Gemini LLM

## Relevant Files

**Server-side (src/lib/server/):**

- `src/lib/server/services/firestore.ts` - Firestore admin SDK initialization and database connection utilities
- `src/lib/server/services/firestore.test.ts` - Unit tests for Firestore service
- `src/lib/server/services/apify.ts` - Apify scraping service for Instagram posts and reels
- `src/lib/server/services/apify.test.ts` - Unit tests for Apify service
- `src/lib/server/services/media.ts` - Temporary media download utilities for Gemini processing
- `src/lib/server/services/media.test.ts` - Unit tests for media service
- `src/lib/server/services/gemini.ts` - Gemini API integration for file upload and recipe extraction
- `src/lib/server/services/gemini.test.ts` - Unit tests for Gemini service
- `src/lib/server/services/recipeValidator.ts` - JSON schema validation for RecipeData
- `src/lib/server/services/recipeValidator.test.ts` - Unit tests for recipe validator
- `src/lib/server/services/jobOrchestrator.ts` - Job orchestration and state management for recipe import flow
- `src/lib/server/services/jobOrchestrator.test.ts` - Unit tests for job orchestrator

**Client-side (src/lib/client/):**

- `src/lib/client/firebase.ts` - Firebase client SDK initialization for frontend real-time listeners
- `src/lib/client/hooks/useRecipeData.ts` - Update to use Firestore real-time listeners instead of polling

**Shared (src/lib/shared/):**

- `src/lib/shared/utils/recipeHelpers.ts` - Recipe formatting and helper utilities (moved from src/lib/utils/)

**API Routes:**

- `src/app/api/recipes/import/route.ts` - API endpoint to initiate recipe import from Instagram URL
- `src/app/api/recipes/import/route.test.ts` - Unit tests for import endpoint
- `src/app/api/recipes/[id]/route.ts` - API endpoint to get recipe details by ID (update existing)
- `src/app/api/recipes/[id]/route.test.ts` - Unit tests for recipe detail endpoint
- `src/app/api/recipes/route.ts` - Update to integrate Firestore instead of JSON files
- `src/app/api/recipes/route.test.ts` - Unit tests for recipes list endpoint

**Configuration:**

- `firestore.rules` - Firestore security rules to allow public read access to recipes collection
- `serviceAccountKey.json` - Firebase service account credentials (add to .gitignore)
- `.env` - Backend environment variables (APIFY_API_KEY, GEMINI_API_KEY, optional GOOGLE_APPLICATION_CREDENTIALS)
- `.env.local` - Frontend environment variables (NEXT*PUBLIC_FIREBASE*\* vars)
- `.env.example` - Template for environment variables
- `.gitignore` - Update to exclude serviceAccountKey.json, .env, .env.local, and local media files

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `firestore.ts` and `firestore.test.ts` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- **Folder structure:**
  - `src/lib/server/` - SERVER-SIDE code only (Admin SDK, API keys, secrets - never exposed to browser)
  - `src/lib/client/` - CLIENT-SIDE code only (Firebase client SDK, React hooks, browser-safe code)
  - `src/lib/shared/` - SHARED code (utilities, helpers, types that work on both client and server)
- Firestore will be used in production, but tests should mock Firestore calls to avoid external dependencies.
- **Media handling:** Download images/videos temporarily to `/tmp` directory → upload to Gemini → analyze → delete temp files. Do NOT store media in Firestore (exceeds 1 MB doc limit). Store only Instagram media URLs as references.
- **Environment variables:** Backend API keys (APIFY, GEMINI, Firebase Admin) go in `.env` (server-side only). Frontend Firebase config goes in `.env.local` with `NEXT_PUBLIC_FIREBASE_*` prefix for client SDK initialization.
- Environment variables must include: `APIFY_API_KEY`, `GEMINI_API_KEY`, and optionally `GOOGLE_APPLICATION_CREDENTIALS` (path to serviceAccountKey.json) OR directly import the JSON file.
- Frontend needs public Firebase config (apiKey, projectId, etc.) - these are safe to expose and controlled by Firestore security rules.
- - Follow shadcn/ui component patterns for consistent styling - if components are missing, search shadcn docs and install as needed; else create custom components following design standards

## Tasks

- [ ] 1.0 Set up Firestore integration and database infrastructure

  - [ ] 1.1 Create `src/lib/server/services/firestore.ts` with Firebase Admin SDK initialization - either use `GOOGLE_APPLICATION_CREDENTIALS` env var (path to serviceAccountKey.json) OR directly import and pass the service account JSON to `admin.credential.cert()`
  - [ ] 1.2 Implement Firestore connection utilities: `getFirestore()`, `getImportsCollection()`, `getRecipesCollection()`
  - [ ] 1.3 Add helper functions for CRUD operations: `createImport()`, `updateImport()`, `getImport()`, `createRecipe()`, `getRecipe()`, `listRecipes()` - store media URLs not files
  - [ ] 1.4 Add `serviceAccountKey.json`, `.env`, and `.env.local` to `.gitignore` and create `.env.example` with required backend environment variables (APIFY_API_KEY, GEMINI_API_KEY, GOOGLE_APPLICATION_CREDENTIALS)
  - [ ] 1.5 Create `firestore.rules` with security rules: allow public read access to recipes collection, deny all writes (backend-only via Admin SDK)
  - [ ] 1.6 Write unit tests for Firestore service with mocked Firebase Admin SDK
  - [ ] 1.7 Document Firestore schema in code comments (imports and recipes collections - no separate media collection needed, URLs stored in recipe docs)

- [ ] 2.0 Implement Apify Instagram scraping service

  - [ ] 2.1 Create `src/lib/server/services/apify.ts` with ApifyClient initialization using `APIFY_API_KEY`
  - [ ] 2.2 Implement `detectPostType(url)` to determine if URL is post, reel, or TV
  - [ ] 2.3 Implement `scrapeInstagramPost(url)` using appropriate Apify actor (instagram-post-scraper or instagram-reel-scraper)
  - [ ] 2.4 Add error handling for rate limits, invalid URLs, private posts, and API quota exhaustion
  - [ ] 2.5 Transform Apify response to match `InstagramRecipePost` schema (map fields appropriately)
  - [ ] 2.6 Write unit tests with mocked ApifyClient responses for posts, reels, and error cases
  - [ ] 2.7 Add retry logic with exponential backoff for transient failures

- [ ] 3.0 Implement media download and Gemini upload handlers

  - [ ] 3.1 Create `src/lib/server/services/media.ts` with `downloadMedia(url, filename)` function to save both images AND videos to `/tmp` directory temporarily
  - [ ] 3.2 Implement `getMediaType(url)` to detect image vs. video based on URL or content-type headers
  - [ ] 3.3 Add `cleanupMedia(filepath)` to delete temporary files after Gemini processing completes
  - [ ] 3.4 Implement error handling for network failures, large files (>20MB limit for Gemini), and unsupported formats
  - [ ] 3.5 Create `uploadToGemini(filepath, mimeType)` in `src/lib/server/services/gemini.ts` using Google GenAI File API
  - [ ] 3.6 Wait for Gemini file to be processed (poll file state until ACTIVE) and store file URI for analysis
  - [ ] 3.7 Write unit tests with mocked file system operations and Gemini API calls
  - [ ] 3.8 Add timeout handling for long uploads and file processing (fail after 2 minutes)

- [ ] 4.0 Implement Gemini recipe extraction with schema validation

  - [ ] 4.1 Create `src/lib/server/services/gemini.ts` with `initializeGemini()` using `GEMINI_API_KEY`
  - [ ] 4.2 Build prompt template for recipe extraction including caption, media reference, and desired JSON schema
  - [ ] 4.3 Implement `extractRecipe(geminiFileUri, caption, metadata)` to call Gemini with vision model
  - [ ] 4.4 Configure Gemini model for JSON output mode with strict schema enforcement
  - [ ] 4.5 Create `src/lib/server/services/recipeValidator.ts` with JSON schema validation against `RecipeData` interface
  - [ ] 4.6 Implement fallback parsing if Gemini returns invalid JSON (extract from markdown code blocks)
  - [ ] 4.7 Add confidence scoring based on completeness of extracted data
  - [ ] 4.8 Write unit tests with mocked Gemini responses (valid JSON, invalid JSON, partial data)
  - [ ] 4.9 Handle edge cases: no recipe found, ambiguous content, multiple recipes in one post

- [ ] 5.0 Build job orchestration and state management system

  - [ ] 5.1 Create `src/lib/server/services/jobOrchestrator.ts` with `processRecipeImport(importId)` main function
  - [ ] 5.2 Implement state transition functions: `setQueued()`, `setScraping()`, `setDownloadingMedia()`, `setUploadingMedia()`, `setExtracting()`, `setReady()`, `setFailed(stage, error)`
  - [ ] 5.3 Build job pipeline: scrape → download → upload → extract → validate → persist
  - [ ] 5.4 Add progress tracking (0-100) at each stage and update Firestore document
  - [ ] 5.5 Implement error recovery: retry logic per stage with max attempts, save failure state with stage and error message
  - [ ] 5.6 Add cleanup on success (delete temp media files) and failure (partial cleanup, preserve debug info)
  - [ ] 5.7 Implement idempotency checks to prevent duplicate processing of same import
  - [ ] 5.8 Write unit tests for full pipeline, individual stages, error scenarios, and retry logic
  - [ ] 5.9 Add logging at each stage for debugging and monitoring

- [ ] 6.0 Update API routes and integrate with frontend

  - [ ] 6.1 Create `src/app/api/recipes/import/route.ts` with POST handler to accept Instagram URL
  - [ ] 6.2 Validate URL format and extract shortcode in import endpoint
  - [ ] 6.3 Create Firestore import document with `status: "queued"` and return import ID immediately
  - [ ] 6.4 Trigger async job orchestration (non-blocking) - consider using background job or serverless function
  - [ ] 6.5 Update `src/app/api/recipes/route.ts` GET handler to fetch from Firestore instead of JSON files (keep for initial load/SSR)
  - [ ] 6.6 Add query parameters for filtering by status, pagination, and sorting
  - [ ] 6.7 Update `src/app/api/recipes/[id]/route.ts` GET handler to fetch single recipe from Firestore
  - [ ] 6.8 Create `src/lib/client/firebase.ts` with Firebase client SDK initialization using public config from `.env.local` (NEXT_PUBLIC_FIREBASE_API_KEY, etc.)
  - [ ] 6.9 Update `src/lib/client/hooks/useRecipeData.ts` (move from src/lib/hooks/) to use Firestore `onSnapshot()` listeners for real-time updates instead of polling
  - [ ] 6.10 Implement collection listener for recipes list and document listener for individual recipe status updates
  - [ ] 6.11 Move existing utilities to `src/lib/shared/utils/` for code that works on both client and server (e.g., recipeHelpers.ts)
  - [ ] 6.12 Add error responses with proper HTTP status codes (400 for validation, 404 for not found, 500 for server errors)
  - [ ] 6.13 Write integration tests for all API endpoints with mocked Firestore
  - [ ] 6.14 Update frontend to handle new recipe states (queued, scraping, downloading, uploading, extracting, ready, failed) with real-time progress updates
  - [ ] 6.15 Test end-to-end flow: submit URL → real-time progress updates → display final recipe
