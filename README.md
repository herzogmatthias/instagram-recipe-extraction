<div align="center">

# Instagram Recipe Extraction

Import any Instagram post, extract every cooking detail with Gemini, and manage recipes, shopping lists, and AI assistance from one clean Next.js dashboard.

</div>

## Features

- **Instagram ingestion pipeline** – Uses Apify’s Instagram Post Scraper plus a worker/orchestrator to download media, upload it to Gemini, and extract structured recipe data.
- **Real-time processing queue** – A live popover shows every import’s stage, progress, retry status, and allows cancelling/removing jobs.
- **Library & detail pages** – UI cards present captions, media, macros, ingredients, and chef notes with unit conversions and cook mode.
- **Shopping list workspace** – Each recipe can push ingredients into a Firestore-backed shopping list where you can edit, delete, or clear items.
- **Recipe chatbot** – A Gemini-powered assistant answers context-aware questions, can generate full recipe variants, and can call update-ingredient functions to swap specific items inside Firestore automatically.
- **Secure settings surface** – Configure Firebase client keys, backend secrets (Apify, Gemini, service accounts), and preferred Gemini models with built-in encryption and key rotation guidance.
- **Testing & tooling** – Jest, Testing Library, ESLint, TailwindCSS, Shadcn, and TypeScript across the stack.

## Prerequisites

| Tool                                                                   | Why it’s needed                                                  |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Node.js 18.18+** and **npm**                                         | Required for Next.js 16 and the dev tooling.                     |
| **Firebase project** with Firestore                                    | Stores recipes, imports, shopping lists, and chat threads.       |
| **Firebase Admin service account** (`firebase/serviceAccountKey.json`) | Lets the backend workers access Firestore securely.              |
| **Google Gemini API key**                                              | Powers recipe extraction and the chatbot (`GEMINI_API_KEY`).     |
| **Apify API key**                                                      | Drives the Instagram Post Scraper integration (`APIFY_API_KEY`). |
| **OpenSSL (or similar)**                                               | Generate `ENCRYPTION_MASTER_KEY` used to protect stored secrets. |

> Tip: you can manage most credentials through the in-app **Settings** page once the basics are configured.

## Quickstart

1. **Clone & install**

   ```bash
   git clone https://github.com/<your-org>/instagram-recipe-extraction.git
   cd instagram-recipe-extraction
   npm install
   ```

2. **Add credentials via Settings UI** _(only `ENCRYPTION_MASTER_KEY` must live in `.env` or your deployment secrets; everything else can be entered in-app)_

   - Run `npm run dev` and open [http://localhost:3000/settings](http://localhost:3000/settings).
   - In **Firebase Client**, paste the frontend config (API key, project ID, etc.).
   - In **Backend Secrets**, provide your `APIFY_API_KEY`, `GEMINI_API_KEY`, and upload/paste the Firebase Admin service account JSON.
   - Generate and enter an `ENCRYPTION_MASTER_KEY`, then pick your preferred Gemini model under **Model Preference**. This master key must be provided via `.env` (or your hosting provider’s secret manager); it is not editable from the UI for safety.
   - Everything else is stored securely in Firestore via the Settings UI, so you can skip managing additional `.env` values once the master key is set.

3. **Run Firebase Emulator/Rules (optional but recommended)**

   ```bash
   # update rules
   firebase deploy --only firestore:rules
   ```

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   The app is available at http://localhost:3000 with hot reload.

5. **Build & test (optional)**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

## Project Structure

```
src/
├── app/               # Next.js App Router (API routes & pages)
├── components/        # Shadcn UI components (chatbot, shopping list, etc.)
├── lib/               # Client + server services (Firebase, Gemini, Apify)
├── models/            # Shared data contracts
├── data/              # Sample JSON data for local testing
```

## Additional Notes

- Firestore security rules (`firestore.rules`) are tailored for this project—deploy them before shipping.
- Secrets (Apify/Gemini/etc.) are encrypted using a master key and managed through dedicated API routes.
- The orchestrator in `src/lib/server/services/orchestration` handles long-running Instagram imports—you can monitor logs in the terminal to trace each stage.

Have fun cooking with AI! 🍳🥗
