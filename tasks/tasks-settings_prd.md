# Tasks: Settings Page Implementation

## Relevant Files

**Firestore & Data Model:**

- `src/models/UserPreferences.ts` - TypeScript types for userpreferences document schema
- `src/lib/server/services/firestore/userpreferences.ts` - Firestore operations for user preferences (CRUD)
- `src/lib/server/services/firestore/userpreferences.test.ts` - Unit tests for userpreferences operations

**Encryption & Security:**

- `src/lib/server/services/encryption/crypto.ts` - AES-256-GCM encryption/decryption with DEK wrapping
- `src/lib/server/services/encryption/crypto.test.ts` - Unit tests for encryption utilities
- `src/lib/server/services/encryption/types.ts` - Types for encrypted data structures

**API Routes:**

- `src/app/api/setup/testClientConfig/route.ts` - POST endpoint to validate Firebase client config
- `src/app/api/setup/testClientConfig/route.test.ts` - Unit tests for client config validation
- `src/app/api/secrets/testAndSave/route.ts` - POST endpoint to validate and encrypt backend secrets
- `src/app/api/secrets/testAndSave/route.test.ts` - Unit tests for secrets management
- `src/app/api/secrets/rotate/route.ts` - POST endpoint to rewrap DEK
- `src/app/api/secrets/rotate/route.test.ts` - Unit tests for key rotation
- `src/app/api/secrets/[service]/route.ts` - DELETE endpoint to remove individual secret
- `src/app/api/secrets/[service]/route.test.ts` - Unit tests for secret deletion
- `src/app/api/settings/model/route.ts` - POST endpoint to validate and save Gemini model preference
- `src/app/api/settings/model/route.test.ts` - Unit tests for model preference

**Settings Page UI:**

- `src/app/settings/page.tsx` - Main settings page with layout (2/3 content, 1/3 sidebar)
- `src/components/settings/FirebaseClientCard.tsx` - Firebase Client SDK configuration card
- `src/components/settings/FirebaseClientCard.test.tsx` - Unit tests for Firebase client card
- `src/components/settings/BackendSecretsCard.tsx` - Backend secrets configuration card with drag-drop
- `src/components/settings/BackendSecretsCard.test.tsx` - Unit tests for backend secrets card
- `src/components/settings/ModelPreferenceCard.tsx` - Gemini model selection card
- `src/components/settings/ModelPreferenceCard.test.tsx` - Unit tests for model preference card
- `src/components/settings/SecurityInfoCard.tsx` - Security explanation sidebar card
- `src/components/settings/RotationCard.tsx` - Key rotation sidebar card
- `src/components/settings/BackupCard.tsx` - Export/import encrypted config bundle card
- `src/components/settings/SourceCard.tsx` - App version info card
- `src/components/settings/settings.types.ts` - Shared types for settings components
- `src/components/settings/settings.utils.ts` - Utility functions for settings operations
- `src/components/settings/settings.utils.test.ts` - Unit tests for settings utilities

**Gating & Readiness:**

- `src/lib/client/hooks/useSetupStatus.ts` - React hook to check configuration readiness flags
- `src/lib/client/hooks/useSetupStatus.test.ts` - Unit tests for setup status hook
- `src/components/setup-banner/SetupBanner.tsx` - Global banner component for incomplete setup
- `src/components/setup-banner/SetupBanner.test.tsx` - Unit tests for setup banner
- `src/lib/shared/utils/readinessFlags.ts` - Utility to derive readiness flags (uiReady, writeReady, extractionReady)
- `src/lib/shared/utils/readinessFlags.test.ts` - Unit tests for readiness flags

**Firestore Rules:**

- `firestore.rules` - Update rules to restrict `userpreferences/{uid}.secrets` to server SDK only

**Configuration:**

- `.env.example` - Update with placeholder for ENCRYPTION_MASTER_KEY

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `crypto.ts` and `crypto.test.ts` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- **Encryption:** Use Node.js `crypto` module with AES-256-GCM. Generate a random DEK per user, encrypt it with the master key (from env), and store the wrapped DEK in Firestore.
- **Single-profile mode:** Document ID is `singleton` or the first authenticated user's UID. For now, assume `singleton`.
- **Security:** Secrets are encrypted client-side before sending to API (use Web Crypto API), then re-encrypted server-side for storage. API endpoints must validate before saving.
- Follow existing patterns in `src/lib/server/services/firestore/` for Firestore operations (client.ts, operations.ts, utils.ts structure).
- Follow shadcn/ui component patterns for consistent styling. Use existing components (Card, Input, Button, Badge, Dialog) where possible.
- **Accessibility:** Ensure ARIA labels, 44px touch targets, and keyboard navigation for all interactive elements.

## Tasks

- [x] 1.0 Create Firestore `userpreferences` collection schema and server-side API routes

  - [x] 1.1 Create `src/models/UserPreferences.ts` with TypeScript types for `clientConfig`, `secrets`, and `modelPreference` (match PRD schema exactly)
  - [x] 1.2 Create `src/lib/server/services/firestore/userpreferences.ts` with CRUD operations: `getUserPreferences()`, `setClientConfig()`, `setSecrets()`, `setModelPreference()`, `deleteSecret()`
  - [x] 1.3 Add unit tests in `src/lib/server/services/firestore/userpreferences.test.ts` with mocked Firestore (follow existing patterns from firestore.test.ts)
  - [x] 1.4 Update `firestore.rules` to allow owner read/write on `userpreferences/{uid}` but deny client reads of `secrets.*` fields (server SDK only)
  - [x] 1.5 Export userpreferences operations from `src/lib/server/services/firestore/index.ts` barrel file

- [x] 2.0 Build encryption/decryption utilities for secrets management with DEK wrapping

  - [x] 2.1 Create `src/lib/server/services/encryption/types.ts` with types for `EncryptedItem`, `EncryptedSecrets`, `SecretItem`
  - [x] 2.2 Create `src/lib/server/services/encryption/crypto.ts` with functions: `generateDEK()`, `wrapDEK(dek, masterKey)`, `unwrapDEK(wrappedDEK, masterKey)`, `encryptSecret(plaintext, dek)`, `decryptSecret(encrypted, dek)`
  - [x] 2.3 Use Node.js `crypto` module with AES-256-GCM; store IV, tag, and ciphertext separately; return base64-encoded values
  - [x] 2.4 Add function `getLast4Chars(plaintext)` to extract last 4 characters for display (e.g., API key previews)
  - [x] 2.5 Add unit tests in `src/lib/server/services/encryption/crypto.test.ts` to verify encryption/decryption round-trip, DEK wrapping, and error handling
  - [x] 2.6 Update `.env.example` with `ENCRYPTION_MASTER_KEY` placeholder and instructions to generate 32-byte hex string

- [x] 3.0 Implement Settings UI page with Firebase Client SDK, Backend Secrets, and Model Preference cards

  - [x] 3.1 Create `src/app/settings/page.tsx` with responsive layout: 2/3 width content area (left), 1/3 width sidebar (right), full-width on mobile
  - [x] 3.2 Add header bar with "Setup" title, status badge (Not configured / Ready), and action buttons (Test all, Audit log - disabled for now)
  - [x] 3.3 Create `src/components/settings/FirebaseClientCard.tsx` with input fields for all 7 Firebase config values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId optional)
  - [x] 3.4 Add "Validate" button to FirebaseClientCard that calls `POST /api/setup/testClientConfig` → on success, lock fields and show projectId + "Last tested" timestamp
  - [x] 3.5 Create `src/components/settings/BackendSecretsCard.tsx` with inputs for APIFY_API_KEY, GEMINI_API_KEY, and file upload/paste for Firestore Service Account JSON
  - [x] 3.6 Add "Test & Save" button to BackendSecretsCard that validates each secret, encrypts, and calls `POST /api/secrets/testAndSave` → on success, show last 4 chars, last tested timestamp, and Replace/Delete buttons (Important to separate Server Side Encryption from Client Side Encryption)
  - [x] 3.7 Create `src/components/settings/ModelPreferenceCard.tsx` with combobox input for Gemini model (e.g., `gemini-2.0-pro-exp-02-05`), Validate button, and "Set as default" action
  - [x] 3.8 Create `src/components/settings/SecurityInfoCard.tsx` (sidebar) with plain-text explanation: encrypted in transit & at rest, never shown again
  - [x] 3.9 Create `src/components/settings/RotationCard.tsx` (sidebar) with "Rewrap storage key" button that calls `POST /api/secrets/rotate`
  - [x] 3.10 Create `src/components/settings/BackupCard.tsx` (sidebar) with Export/Import buttons for encrypted config bundle (passphrase-protected) - stub UI only for now
  - [x] 3.11 Create `src/components/settings/SourceCard.tsx` (sidebar) showing app version and build timestamp (read from package.json or env)
  - [x] 3.12 Add unit tests for all settings components: FirebaseClientCard.test.tsx, BackendSecretsCard.test.tsx, ModelPreferenceCard.test.tsx (mock API calls, test validation, form state)
  - [x] 3.13 Create `src/components/settings/settings.types.ts` with shared types (ConfigStatus, SecretMetadata, ValidationResult) and `src/components/settings/settings.utils.ts` with helper functions

- [x] 4.0 Add homepage gating logic to block features until configuration is complete

  - [x] 4.1 Create `src/lib/shared/utils/readinessFlags.ts` with function `deriveReadinessFlags(preferences)` that returns `{ uiReady, writeReady, extractionReady }` based on PRD logic
  - [x] 4.2 Create `src/lib/client/hooks/useSetupStatus.ts` React hook that fetches user preferences and derives readiness flags
  - [x] 4.3 Create `src/components/setup-banner/SetupBanner.tsx` global banner component that shows "Finish Setup to start" with link to /settings when not ready
  - [x] 4.4 Update `src/app/layout.tsx` to include SetupBanner at the top of the page (mount conditionally based on useSetupStatus)
  - [x] 4.5 Update `src/components/add-link-modal/AddLinkModal.tsx` to disable "Import Instagram link" button when `!extractionReady`, show tooltip explaining why
  - [x] 4.6 Update recipe creation/variant save actions to check `writeReady` flag before allowing writes to Firestore
  - [x] 4.7 Add unit tests for readinessFlags.test.ts and useSetupStatus.test.ts to verify flag derivation logic
  - [x] 4.8 Add unit test for SetupBanner.test.tsx to ensure correct rendering based on setup status

- [ ] 5.0 Implement validation, testing, and audit logging for all configuration items
  - [ ] 5.1 Create `src/app/api/setup/testClientConfig/route.ts` POST endpoint that validates Firebase config by attempting `initializeApp()` → `getFirestore()` → read `public/health` doc
  - [ ] 5.2 Create `src/app/api/secrets/testAndSave/route.ts` POST endpoint that validates Apify (test API call), Gemini (1-token ping), Firestore Admin (read health doc), encrypts with DEK, and saves to userpreferences
  - [ ] 5.3 Create `src/app/api/secrets/rotate/route.ts` POST endpoint that generates new DEK, re-encrypts all secrets, and updates wrapped DEK in Firestore
  - [ ] 5.4 Create `src/app/api/secrets/[service]/route.ts` DELETE endpoint to remove individual secret from userpreferences (e.g., DELETE /api/secrets/APIFY_API_KEY)
  - [ ] 5.5 Create `src/app/api/settings/model/route.ts` POST endpoint to validate Gemini model by doing a low-cost generation call, then save to userpreferences.modelPreference
  - [ ] 5.6 Add comprehensive unit tests for all API routes: testClientConfig.test.ts, testAndSave.test.ts, rotate.test.ts, [service].test.ts, model.test.ts (mock Firestore, encryption, external APIs)
  - [ ] 5.7 Add audit logging structure (log action, actor, timestamp, outcome) in each API route - for now, use console.log with structured format; plan for future Firestore audit collection
  - [ ] 5.8 Update `src/lib/server/services/gemini/client.ts` to read model from userpreferences.modelPreference.geminiDefaultModel if available, otherwise fall back to env var DEFAULT_RECIPE_MODEL
  - [ ] 5.9 Add integration test flow: POST testClientConfig → POST testAndSave → POST model → verify userpreferences doc structure matches PRD schema
