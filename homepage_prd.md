# Homepage UI/UX Spec (Instagram → LLM Recipe)

## Purpose

Show a visual library of posts/recipes from a **single-record JSON** per item. Communicate progress from **link → scrape → save video → LLM → ready**. No detail view here.

**Test Data** can be found in `data/` as JSON files representing Instagram posts with recipe extraction results.

**Models** are defined in `src/models/InstagramRecipePost.ts`.

---

## Data (per card)

Single object with:

- **Core (from scrape):** `id`, `inputUrl`, `shortCode`, `type`, `caption`, `hashtags[]`, `displayUrl` (cover), `videoUrl`, `dimensionsHeight/Width`, `timestamp`, `ownerUsername`, …
- **Processing/runtime:** `status` = `queued | scraping | downloading_media | uploading_media | extracting | ready | failed`, `media_local_path | cdn_url`, `llm_upload_id`, `error`, `updated_at`
- **Result:** `recipe_data` (present when `ready`): `title`, `total_time_min`, `difficulty`, `cuisine`, `tags[]`, `macros_per_serving`, `confidence`, `ingredients[]`, `steps[]`, `assumptions[]`

---

## Layout

- **Navbar (fixed, ~64px):** Logo, **Library**, **Processing**, **Settings**, global **Search**, theme toggle.
- **Content:** Responsive **card grid**

  - Grid: `minmax(280px, 1fr)`; 3–4 columns desktop, 1–2 mobile.
  - **Add Link**: FAB or primary button → URL modal with validation.

- **Filters/Search (optional row above grid):** Status (Queued/Processing/Ready/Failed), tags, free-text (title/caption).

---

## Card Design (portrait cover only)

- **Container:** rounded 2xl, thin border, subtle shadow; hover lift; entire card clickable (opens detail later).
- **Media (top):**

  - Source: `displayUrl`
  - Ratio: portrait **4:5**; `object-cover`; blurred shimmer placeholder while loading.
  - **Overlays:**

    - **Top-left:** **Status chip** (`status`)
    - **Bottom:** dark gradient + **Title** (2-line clamp) = `recipe_data.title` → fallback `caption` first sentence

- **Body (middle):** **Meta pills** (show only if present):

  - `total_time_min`, `difficulty`, `cuisine`, `macros_per_serving` (compact: `kcal • P/F/C`)
  - **Tags:** up to 3 chips; then `+N`

- **Footer (right-aligned icons + primary):**

  - **Open** (disabled until `ready`)
  - Copy Ingredients, Export JSON
  - Kebab: **Retry** (on `failed`), View Post, Delete

---

## Visual States

- **Queued:** placeholder cover (domain/favicon), URL as title
- **Scraping / Downloading / Uploading / Extracting:** real/placeholder cover; thin indeterminate bar; **Open disabled**
- **Ready:** accent hover, all meta pills visible
- **Failed:** warning border + inline “Retry”

---

## State & Polling

- **Transitions:** `queued → scraping → downloading_media → uploading_media → extracting → ready | failed`
- **Polling:** While non-terminal, poll the same record; once `ready`, card updates inline (toast “Recipe extracted”).

---

## Interactions

- **Add Link:** paste URL → create record with `status=queued` (optimistic) → card appears at top.
- **Retry:** resumes pipeline from first missing step (e.g., if media not saved, restart at `downloading_media`).
- **Export JSON / Copy Ingredients:** use `recipe_data` when present; hide actions if not available.
- **Search & Filter:** instant filtering; preserve scroll position.

---

## Accessibility

- Card = `role="button"` with **focus-visible** ring.
- Overlays maintain 4.5:1 contrast; icons have `aria-label`.
- Status chip includes readable state text (not color-only).

---

## Empty & Edge States

- **Empty Library:** friendly prompt + prominent “Add link”.
- **Partial data:** show what exists (title/meta pills only if available); never show zero/placeholder macros.
- **Errors:** keep last good cover/title; show tooltip/badge with error; offer **Retry**.

---

## Visual Guidelines

- **Spacing:** 12px inner; 16px between sections
- **Radius:** 16–20px; **Border:** 1px neutral; **Shadow:** sm → md on hover
- **Typography:** Title small/semibold; Meta/Tags xs
- **Motion:** subtle hover lift; media scale +5%; skeleton shimmer during loading
- **Consistency:** Portrait cover everywhere; no video playback on cards

---

## Success Criteria

- Cards are **never empty** (always show a cover or placeholder).
- Status and progress are **immediately visible**.
- Meta is **concise** (time, difficulty, cuisine, macros) and **robust to missing fields**.
- Adding a link feels **instant**; readiness is **toast-confirmed**.
