# Instagram → Gemini Recipe Extraction Flow (Next.js + Firestore)

## Overview

User uploads an Instagram **post or reel link** → content is scraped via **Apify**, media is downloaded locally → uploaded to **Gemini** for vision-based recipe extraction → result validated and stored in **Firestore**.

---

## Environment

`.env` contains:

- `APIFY_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json`

---

## Flow

1. **Upload Link**

   - User submits Instagram URL.
   - Create Firestore doc in `imports/{id}`: `{ inputUrl, status: "queued" }`.

2. **Scrape Content (Apify)**

   - Use [Instagram Post Scraper](https://apify.com/apify/instagram-post-scraper/api/javascript) or [Reel Scraper](https://apify.com/apify/instagram-reel-scraper/api/javascript)` depending on URL type.
   - Extract caption, media URLs, metadata.
   - Save raw result and update status → `scraping_done`.

3. **Download Media**

   - Download the image or video locally (`/tmp/...`).
   - Store reference in Firestore under `media/{id}`.
   - Status → `media_downloaded`.

4. **Upload to Gemini**

   - Use Gemini API to upload the local media file.
   - Store `geminiFileId` in Firestore.
   - Status → `media_uploaded`.

5. **Extract Recipe (Gemini LLM)**

   - Prompt Gemini with:

     - Caption text
     - Media reference(s)
     - Target schema: `RecipeData` (as provided)

   - Expect strict JSON output; validate against schema.
   - Status → `extracting`.

6. **Persist Result**

   - Save valid recipe to `recipes/{id}` in Firestore.
   - Link it to the import record; set status → `ready`.

7. **Frontend Update**

   - UI listens to Firestore; once `status=ready`, the card renders and actions (open, copy, export, etc.) become active.

8. **Failure Handling**

   - On any error, set `status="failed"` and record `{ stage, message }`.
   - Allow manual or automatic retry per stage.

---

## Deliverables for Generation

- Next.js API routes for `/api/recipes/import`, `/api/recipes`, `/api/recipes/[id]`.
- Firestore integration using `serviceAccountKey.json`.
- Job handlers for Apify scrape, media download, Gemini upload, extraction, and persistence.
- JSON validation for `RecipeData`.
- Simple state transitions (`queued → scraping → media_downloaded → media_uploaded → extracting → ready|failed`).

## Important

- Use existing components like `Navbar`, `RecipeCard`, `FilterBar`, and `AddLinkModal` for frontend.
- Follow existing code patterns.
- Install needed dependencies if missing.
- Focus on backend flow; frontend changes are minimal (just ensure new imports work).
- Respect the existing tech stack and code architecture.
- Ensure robust error handling in respect to external api quotas and failures.
- Ensure compatibility with a per user flow which will be added at a later date.
