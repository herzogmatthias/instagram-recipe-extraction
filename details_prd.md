# Page layout (2-column, responsive)

- **Left (content, 2/3 width desktop / full on mobile)**

  - **Header bar:** Title, author (@foodinfivemins), confidence badge (0.95), “Save”, “Share”, “Open IG”.
  - **Media card:** Reel player (poster from `displayUrl`, source from `videoUrl`), duration, view/like counters.
  - **Recipe meta strip:** Servings (editable), Prep/Cook/Total time, Difficulty, Cuisine, Tags chips.
  - **Ingredients panel (checkbox list):**

    - Group by `section` (“Beef”, “Pak Choi”, “To Serve”).
    - Each row: qty + unit + name + prep + “optional” tag.
    - Controls: **Metric/US toggle**, **Scale servings** (binds to state), **Copy list**, **Add to shopping list** (manual client-side).

  - **Steps panel (stepper):**

    - Numbered steps with “used_ingredients” chips. Hover chip → highlight matching ingredient rows.
    - Inline “Chef’s note” callouts where present.
    - **Cook mode** CTA (sticky): launches distraction-free stepper with large text, timers, and “Next/Back”.

- **Right (sidebar, 1/3 width / collapses below on mobile)**

  - **Macros card:** kcal / P / C / F per serving, with per-recipe totals when servings scale.
  - **Variant switcher card (new):** Tabs/dropdown for **Original** + saved variants; rename/delete (except Original).
  - **Quick actions card:** “Make it spicier”, “Make it vegan”, “Gluten-free swap”, “Budget version” → opens chatbot prefilled (bot will return a **full adjusted recipe** via `createVariant`).
  - **Source card:** Original URL, timestamp, productType, music info (optional).
  - **Quality card:** Extraction confidence, assumptions (collapsible).

# Interaction & state

- **Global state:** `servings`, `unitSystem`, `checkedIngredients`, `activeStep`, `cookMode`, `activeVariantId` (Original or variant), `variants[]` (stored).
- **Derived quantities:** Recompute ingredient amounts on `servings` + `unitSystem` (UI overlay; stored recipes stay immutable).
- **Linking:** Clicking an ingredient highlights steps using it (and vice versa).
- **Sticky controls:** bottom bar with “Cook mode • Scale • Copy • Chat”.

# Chatbot (dockable bottom sheet / right drawer)

- **Context:** Auto-inject active variant’s `recipe_data` + caption so users can **ask questions** about the recipe (Q&A) or request a **new version**.

- **Starter prompts:** Chips (“Swap to chicken”, “Low-carb”, “Meal-prep plan”, “Shopping list tips”).

- **Function calling (single):**

  - `createVariant({ variant: RecipeData, sourceVariantId?: string, rationale?: string }) -> { id: string, savedAt: string }`

    - The **bot constructs a complete adjusted `RecipeData`** (e.g., vegan/low-carb) and calls this once.
    - UI shows a **diff preview**, then **saves as a new variant** and activates it. **Original is always preserved.**

- **UI affordances:**

  - After the function call: preview diff (ingredient deltas, step edits, macros delta) → **Save as new variant** (appears in Variant switcher).
  - Variations are browsable via the **Variant switcher**; macros update per active variant.

# Data mapping notes

- Use `recipe_data.ingredients[].section` for grouping.
- “Macros per serving” = `macros_per_serving`; compute totals = per-serving × `servings.value`.
- Confidence + `assumptions[]` → **Quality card**.
- Caption + hashtags → SEO/meta and chatbot context.
- **Storage:** Recipes, variants, and **message history** live in **Firestore**. Use a **hybrid history**: one **global thread per recipe** + **scoped subthreads per variant** (inherit global summary; keep variant-specific tool calls).

# Micro-UX

- **Accessibility:** Large text in cook mode, 44px hit targets, ARIA labels for stepper and checkboxes.
- **Empty states:** If `alt` missing, generate from title + first step.

# Why this works

- Clear hierarchy (watch → understand → cook → adapt).
- Manual tools (scale, convert, list) are instant and local.
- Chatbot is purposeful: it **answers questions** and **creates full new variants** via one function, with transparent diffs and safe, reversible storage.
