# Settings Page (single-profile, standalone)

- **Left (content, 2/3 width desktop / full on mobile)**

  - **Header bar:** “Setup”, status badge (“Not configured / Ready”), actions **Test all**, **Audit log**.
  - **Firebase Client SDK card (required):** fields `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `measurementId?`.

    - **Validate**: `initializeApp` → `getFirestore` → read `public/health`.
    - On success: lock fields; show `projectId`, “Last tested”.

  - **Backend Secrets card (one-time entry):** `APIFY_API_KEY`, `GEMINI_API_KEY`, **Firestore Service Account JSON** (drag & drop / paste).

    - **Test & Save** (no reveal after save). Show **last 4 chars**, **Last tested**, **Replace**, **Delete**.

  - **Model Preference card (new):** “Gemini model” input (e.g., `gemini-2.0-pro-exp-02-05`), with **Validate** (dry-run ping) and **Set as default**.

- **Right (sidebar, 1/3 width / collapses on mobile)**

  - **Security card:** Plain explanation: encrypted in transit & at rest; never shown again.
  - **Rotation card:** **Rewrap storage key** (no plaintext exposure).
  - **Backup card:** Export/Import **encrypted config bundle** (passphrase).
  - **Source card:** App version, timestamp.

---

# Homepage gating (until configured)

- **Global banner (blocking):** “Finish Setup to start.”
- **Disabled until ready:**

  - **Import Instagram link** (needs Apify + Gemini).
  - **Create/Save variants** and **writing** to Firestore (needs Admin).

- **Readable after Firebase Client OK:** recipe list/detail placeholders may load (public reads).
- **Chatbot:** **no extra guard** here; it lives behind the recipe **details page** (which already requires data).

**Derived readiness flags**

- `uiReady = hasFirebaseClientConfig && firebaseInitialized`
- `writeReady = uiReady && servicesHealth.firestoreAdmin.ok`
- `extractionReady = writeReady && servicesHealth.apify.ok && servicesHealth.gemini.ok`
- Buttons/tooltips explain why disabled; link to **Setup**.

---

# Data model (Firestore) — everything under **`userpreferences`**

- Collection: `userpreferences` (one doc per user; standalone → single user doc).
- **Document ID:** `{uid}` (or `singleton` for kiosk mode).

```json
// userpreferences/{uid}
{
  "clientConfig": {
    "apiKey": "...",
    "authDomain": "...",
    "projectId": "...",
    "storageBucket": "...",
    "messagingSenderId": "...",
    "appId": "...",
    "measurementId": "...",
    "lastValidatedAt": "2025-11-11T09:00:00Z"
  },
  "secrets": {
    "version": 1,
    "dek_wrapped": "base64...",
    "items": {
      "APIFY_API_KEY": {
        "ct": "base64...",
        "iv": "base64...",
        "tag": "base64...",
        "last4": "x3F2",
        "lastValidatedAt": "..."
      },
      "GEMINI_API_KEY": {
        "ct": "...",
        "iv": "...",
        "tag": "...",
        "last4": "Q7m1",
        "lastValidatedAt": "..."
      },
      "FIREBASE_SA_JSON": {
        "ct": "...",
        "iv": "...",
        "tag": "...",
        "lastValidatedAt": "..."
      }
    },
    "createdAt": "...",
    "rotatedAt": "..."
  },
  "modelPreference": {
    "geminiDefaultModel": "gemini-2.0-pro-exp-02-05",
    "lastValidatedAt": "2025-11-11T09:00:00Z"
  }
}
```

**Notes**

- `clientConfig` is **not secret**; required to boot the UI.
- `secrets.items[*]` are encrypted blobs (no reveal).
- `modelPreference.geminiDefaultModel` is plain text; validate by doing a low-cost ping on save.

---

# Settings → Model Preference

- **Input:** free text with suggestions (combobox): recent Gemini models.
- **Validate button:** server calls a 1-token echo/gen to confirm availability and quota.
- **Save:** persists to `userpreferences/{uid}.modelPreference.geminiDefaultModel`.
- **Usage:** extraction/chatbot use this model unless overridden per action.

---

# API (minimal)

- `POST /setup/testClientConfig` → validates Firebase Client config.
- `POST /secrets/testAndSave` → validate providers, encrypt, store under `userpreferences/{uid}.secrets`.
- `POST /secrets/rotate` → rewrap DEK.
- `DELETE /secrets/:service` → remove encrypted item.
- `POST /settings/model` → set & validate `geminiDefaultModel`.

---

# Security & rules (high-level)

- **Rules:** only owner can read/write `userpreferences/{uid}`; **deny** reads of `secrets.*` to clients (server SDK only).
- **Ingress:** client encrypts secrets before sending; server decrypts once, re-encrypts for storage.
- **Audit:** log action, actor, timestamp, outcome (no values).

---

# Micro-UX

- One-way lock copy: “Keys won’t be shown again. Replace or delete only.”
- Disabled actions show tooltip reason (e.g., “Needs Apify + Gemini”).
- Validation gates **Save**; show last 4 chars post-save.
- Accessibility: ARIA help text on every field; 44px targets.

---

# Why this works

- Single profile keeps setup tight; all config centralized in `userpreferences`.
- Clear gating prevents half-configured flows.
- Chatbot naturally sits behind the details page—no extra guard needed.
- Model preference gives users control over Gemini version without code changes.
