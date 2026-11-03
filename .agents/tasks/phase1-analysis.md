# MediVoice AI — Phase 1 Analysis Report

> Written by the Phase 1 Read-Only Audit Agent.
> **No code changes have been made.** All findings are from reading source files.

---

## 1. Project Structure

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 16.4.3 (App Router, React 19) |
| Language | TypeScript 5 |
| Auth | next-auth v5 beta (`^5.0.0-beta.32`), Credentials provider, JWT session |
| ORM | Prisma 7.10.1 with `@prisma/adapter-pg` (NeonDB / PostgreSQL) |
| Database | NeonDB PostgreSQL (serverless) |
| Payment | Cashfree Payment Links API (sandbox default) |
| AI | OpenAI Whisper (STT), GPT-4o-mini (triage/extraction), TTS-1 (speech) |
| Messaging | Meta WhatsApp Business Cloud API v18.0 |
| Email | **NOT IMPLEMENTED** — no SMTP, no email sending code found anywhere |
| UI | Radix UI primitives, TailwindCSS v4, Lucide icons, Recharts |
| PDF | HTML-rendered prescription page (not an actual PDF — see bugs below) |

### Pages
| Route | Type | Auth Required |
|---|---|---|
| `/` | Server — redirects to `/dashboard` | No |
| `/auth/login` | Client page | No |
| `/dashboard` | Server page | Yes (via `auth()`) |
| `/dashboard/consultations` | Server page | Yes |
| `/dashboard/consultations/[id]` | Server page | Yes |
| `/dashboard/patients` | Server page | Yes |
| `/dashboard/patients/[id]` | (no page.tsx found — only API route) | — |
| `/dashboard/prescriptions` | Server page | Yes |
| `/dashboard/analytics` | Server page | Yes |
| `/dashboard/settings` | Client page | Yes (layout-level) |
| `/payment/success` | Client page (Suspense wrapper) | No |

### API Routes
| Route | Methods | Auth | Description |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | N/A | NextAuth handler |
| `/api/admin/stats` | GET | Yes | Dashboard summary stats |
| `/api/consultation` | GET | Yes | List consultations (paginated, filterable by status) |
| `/api/consultation/[id]` | GET, PATCH, DELETE | Yes | Single consultation CRUD |
| `/api/patients` | GET | Yes | List patients (search + paginated) |
| `/api/patients/[id]` | GET, PATCH, DELETE | Yes | Single patient CRUD with cascade delete |
| `/api/payment/confirm` | POST | No | Confirms payment after success redirect; calls Cashfree to verify |
| `/api/payment/webhook` | POST | No (sig verify) | Cashfree webhook receiver |
| `/api/prescription` | POST | Yes | Create prescription + trigger WhatsApp |
| `/api/prescription/[id]/pdf` | GET | No | Returns HTML prescription (named "pdf" but is HTML) |
| `/api/settings` | GET, POST | No | Read/write `settings.json` |
| `/api/settings/test-whatsapp` | POST | No | Test WhatsApp send |
| `/api/webhook/whatsapp` | GET, POST | No (token verify) | WhatsApp webhook — message intake |
| `/api/debug-env` | (empty folder) | — | **Empty folder — no route file** |

### Components
- `components/layout/` — `dashboard-layout.tsx`, `sidebar.tsx`, `topbar.tsx`
- `components/consultation/` — `consultation-table.tsx`, `consultation-actions-menu.tsx`
- `components/patient/` — `patient-actions-menu.tsx`
- `components/prescription/` — `prescription-form.tsx`
- `components/ui/` — `badge.tsx`, `button.tsx`, `card.tsx`, `input.tsx`, `loading.tsx`, `stat-card.tsx`

### Libs
- `lib/ai/` — `language.ts`, `safety-screening.ts`, `transcription.ts`, `tts.ts`
- `lib/auth/` — `config.ts`
- `lib/payment/` — `cashfree.ts`
- `lib/pdf/` — `prescription-generator.ts`
- `lib/prisma/` — `client.ts`
- `lib/whatsapp/` — `client.ts`, `conversation-engine.ts`
- `lib/constants.ts`, `lib/settings.ts`, `lib/utils.ts`

---

## 2. Dependencies Audit

### Production Dependencies (from package.json)
| Package | Version | Notes |
|---|---|---|
| `next` | 16.4.3 | Current — App Router with React 19 |
| `react` / `react-dom` | 19.3.0 | |
| `next-auth` | ^5.0.0-beta.32 | v5 beta — APIs differ from v4 |
| `@prisma/client` | ^7.10.1 | Prisma 7 with driver adapters |
| `@prisma/adapter-pg` | ^7.10.1 | Used in production |
| `@prisma/adapter-neon` | ^7.10.1 | **Installed but NOT used** — code uses `adapter-pg` |
| `@prisma/adapter-better-sqlite3` | ^7.10.1 | **Installed but NOT used** — leftover, risky |
| `better-sqlite3` | ^12.11.1 | **Installed but NOT used in source** — leftover |
| `openai` | ^6.49.0 | |
| `axios` | ^1.21.0 | |
| `pg` | ^8.23.1 | Used for pool |
| `@neondatabase/serverless` | ^1.2.0 | **Installed but NOT used in src/** — leftover |
| `ws` | ^8.22.1 | Appears to be for neon websocket (neon serverless) — not used in src |
| `bcryptjs` | ^3.0.3 | Used for password hashing |
| `zod` | ^4.6.7 | Used for validation |
| `react-hook-form` | ^7.91.0 | Used in login and prescription forms |
| `@hookform/resolvers` | ^6.0.2 | Used with zod |
| `recharts` | ^3.10.1 | Used for analytics charts |
| `date-fns` | ^4.4.0 | Used for date calcs |
| `form-data` | ^4.0.6 | Used for TTS media upload |
| `lucide-react` | ^1.65.0 | UI icons |
| `react-hot-toast` | ^2.6.1 | Toast notifications |
| `@react-pdf/renderer` | ^4.9.0 | **Installed but NOT used** — PDFs are generated as HTML, not via this lib |
| `jspdf` | ^4.2.1 | **Installed but NOT used** |
| `html2canvas` | ^1.4.1 | **Installed but NOT used** |
| `uuid` | ^14.0.3 | Not found in source (uses custom `generateOrderId` instead) |
| `18` | ^0.0.0 | **Bogus dependency** — `"18": "^0.0.0"` — likely a copy-paste error in package.json |

### Dev Dependencies
| Package | Notes |
|---|---|
| `dotenv` | ^18.0.9 — used in seed.ts and settings.ts |
| `tsx` | ^4.23.15 — used for seed script runner |
| `@types/better-sqlite3` | Types for unused package |
| `@types/pg` | Types for pg pool |
| `@types/ws` | Types for unused ws |

### Flagged Issues
- **CRITICAL**: `"18": "^0.0.0"` in dependencies — nonsense package name, should be removed.
- **HIGH**: `better-sqlite3` and `@prisma/adapter-better-sqlite3` in production dependencies. Not used in source, but having it alongside pg can cause build confusion. A `dev.db` SQLite file exists in the project root — likely a leftover from initial development.
- **MEDIUM**: `@react-pdf/renderer`, `jspdf`, `html2canvas` are all installed but the prescription "PDF" is plain HTML. These add bundle weight.
- **MEDIUM**: `@prisma/adapter-neon`, `@neondatabase/serverless`, `ws` are installed but not used.

---

## 3. API Routes Inventory

| Route File | Methods | Auth | What It Does |
|---|---|---|---|
| `api/auth/[...nextauth]/route.ts` | GET, POST | — | Exports NextAuth handlers directly |
| `api/admin/stats/route.ts` | GET | JWT | Returns dashboard KPIs: total consultations, pending, completed today, emergency count, total revenue, 7-day revenue chart |
| `api/consultation/route.ts` | GET | JWT | Lists consultations with patient/payment/prescription joined; pagination + status filter |
| `api/consultation/[id]/route.ts` | GET, PATCH, DELETE | JWT | Single consultation: fetch, update status/aiSummary, cascade-delete |
| `api/patients/route.ts` | GET | JWT | Lists patients with search, consultation count, last visit |
| `api/patients/[id]/route.ts` | GET, PATCH, DELETE | JWT | Single patient CRUD; DELETE cascades prescriptions → payments → consultations → patient |
| `api/payment/confirm/route.ts` | POST | **None** | Success-page trigger: verifies link with Cashfree, marks PAID, generates AI summary, sends WhatsApp |
| `api/payment/webhook/route.ts` | POST | Sig verify | Cashfree webhook: verifies HMAC signature, updates payment/consultation, sends WhatsApp |
| `api/prescription/route.ts` | POST | JWT | Creates prescription, updates consultation to COMPLETED, sends WhatsApp notification |
| `api/prescription/[id]/pdf/route.ts` | GET | **None** | Returns HTML prescription (publicly accessible by URL — no auth check) |
| `api/settings/route.ts` | GET, POST | **None** | Reads/writes settings.json + syncs to .env — **CRITICAL: no auth required** |
| `api/settings/test-whatsapp/route.ts` | POST | **None** | Sends test WhatsApp message — **no auth, exposes token** |
| `api/webhook/whatsapp/route.ts` | GET, POST | Token verify (GET), none (POST body) | WhatsApp webhook: verification + message intake |

---

## 4. Environment Variables Inventory

### Variables Present in `.env` (names only — no values)
```
AUTH_SECRET
AUTH_URL
CASHFREE_API_URL
CASHFREE_APP_ID
CASHFREE_ENV
CASHFREE_SECRET_KEY
CONSULTATION_FEE
DATABASE_URL
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_APP_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
OPENAI_API_KEY
SEED_DOCTOR_EMAIL
SEED_DOCTOR_PASSWORD
WHATSAPP_ACCESS_TOKEN
WHATSAPP_BUSINESS_ACCOUNT_ID
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_TEST_RECIPIENT
WHATSAPP_VERIFY_TOKEN
```

### Variables Referenced in Code
```
DATABASE_URL              — prisma/client.ts, seed.ts, prisma7.config.ts
NODE_ENV                  — prisma/client.ts
NEXTAUTH_SECRET           — src/proxy.ts (uses NEXTAUTH_SECRET)
OPENAI_API_KEY            — transcription.ts, safety-screening.ts, tts.ts
WHATSAPP_ACCESS_TOKEN     — settings.ts, client.ts, test-whatsapp/route.ts
WHATSAPP_PHONE_NUMBER_ID  — settings.ts, client.ts, test-whatsapp/route.ts
WHATSAPP_BUSINESS_ACCOUNT_ID — settings.ts
WHATSAPP_VERIFY_TOKEN     — settings.ts, webhook/whatsapp/route.ts
WHATSAPP_TEST_RECIPIENT   — settings.ts, test-whatsapp/route.ts
CASHFREE_APP_ID           — cashfree.ts
CASHFREE_SECRET_KEY       — cashfree.ts
CASHFREE_API_URL          — cashfree.ts (optional, defaults to sandbox URL)
CASHFREE_ENV              — settings.ts
CONSULTATION_FEE          — constants.ts, settings.ts
NEXT_PUBLIC_APP_URL       — prescription/route.ts, cashfree.ts
SEED_DOCTOR_EMAIL         — seed.ts
SEED_DOCTOR_PASSWORD      — seed.ts
```

### Gap Analysis
| Var | In .env | In Code | Issue |
|---|---|---|---|
| `AUTH_SECRET` | ✅ | ❌ Not used | next-auth v5 reads `AUTH_SECRET` automatically — but `src/proxy.ts` reads `NEXTAUTH_SECRET` instead. **Mismatch.** |
| `AUTH_URL` | ✅ | ❌ Not directly read | next-auth v5 reads `AUTH_URL` automatically — probably fine |
| `NEXTAUTH_SECRET` | ✅ | ✅ in proxy.ts | **But next-auth v5 expects `AUTH_SECRET` not `NEXTAUTH_SECRET`** — proxy.ts may fail to validate tokens |
| `NEXTAUTH_URL` | ✅ | ❌ Not read | Leftover from v4 convention |
| `NEXT_PUBLIC_APP_NAME` | ✅ | ❌ Not used | `APP_NAME` is hardcoded in `constants.ts` |
| `CASHFREE_ENV` | ✅ | ✅ Only in settings.ts | Note: `cashfree.ts` does NOT read `CASHFREE_ENV`; it reads `CASHFREE_API_URL` directly. The env/sandbox toggle is managed only via the Settings UI. |
| `CASHFREE_API_URL` | ✅ | ✅ | |

---

## 5. Prisma / Database Analysis

### Client Setup (`src/lib/prisma/client.ts`)
- Uses `pg.Pool` + `PrismaPg` adapter — **correct** for NeonDB direct connections.
- SSL: `{ rejectUnauthorized: false }` — appropriate for NeonDB.
- Pool: max=5, idle=10s, connect timeout=15s — reasonable.
- Global singleton pattern with `globalForPrisma` — correct for Next.js dev hot-reload.
- Imports `'server-only'` — correctly prevents client bundle inclusion.
- **Issue**: `createPool()` is called at module-level via `createPrismaClient()` when the singleton doesn't exist. If `DATABASE_URL` is undefined at startup, throws immediately — this is correct behavior (fail fast).

### Schema (`prisma/schema.prisma`)
- Datasource block has **no `url` field** — correct for Prisma 7 config-based setup.
- Generator: `provider = "prisma-client-js"` — standard.
- Models: `Doctor`, `Patient`, `Consultation`, `Payment`, `Prescription`, `KnowledgeBase`.
- Relationships: all correctly defined with foreign keys.
- JSON fields stored as `String` (symptoms, medicines, conversationHistory, etc.) — this is by design since Prisma 7 doesn't have a native JSON type for pg in this setup.
- **No migration drift** — 2 migrations found: `init` + `add_language_field`.

### `prisma7.config.ts`
- Imports `dotenv/config` at the top — **correct**, ensures env is loaded before config reads it.
- Reads `DATABASE_URL` from `process.env` — correct.
- Specifies `schema` and `migrations.path` — correct.

### `seed.ts`
- Loads `dotenv` before any imports that read env — **correct** (uses static `import` but `config()` call is at the top of the module).
- Creates its own `pg.Pool` + `PrismaPg` — correct, doesn't reuse singleton.
- Seeds 1 doctor + 3 KnowledgeBase entries.
- Idempotent — checks for existing doctor by email before creating.

### SQLite / better-sqlite3 leftovers
- `dev.db` SQLite file exists in the project root.
- `better-sqlite3` and `@prisma/adapter-better-sqlite3` are in `package.json`.
- **No source code references** — these are orphaned artifacts from an earlier SQLite phase.
- The `dev.db` file should be deleted; the packages should be removed.

---

## 6. Authentication Analysis

### next-auth v5 Beta Setup
- `config.ts` uses `NextAuth()` with Credentials provider — correct.
- Session strategy: `JWT` — correct.
- Password hashing: bcryptjs with 12 rounds — good, secure.
- JWT callbacks correctly embed `id` and `role` into token.
- Session callback correctly reads `id` and `role` from token.

### Critical Auth Issue — `proxy.ts` vs middleware
- **`src/proxy.ts` exists but there is NO `middleware.ts` file in the project.**
- Without a `middleware.ts`, the `proxy()` function and its `matcher` config are **never executed** by Next.js.
- This means **dashboard routes are completely unprotected at the middleware level**.
- Each server page calls `await auth()` directly (dashboard page, consultations, patients, etc.) — this is a valid defense-in-depth pattern, but without middleware, there's no redirect; `auth()` just returns `null` and the page would need to handle it.
- Actually, looking at the pages: they call `auth()` but **do NOT redirect unauthenticated users** — they just get `session = null` and the page renders without a session check or guard. The `DashboardLayout` wraps pages but has no auth check.
- **CRITICAL: Dashboard pages are accessible to unauthenticated users because (a) no middleware exists, and (b) the server pages don't redirect when `auth()` returns null.**

### NEXTAUTH_SECRET vs AUTH_SECRET mismatch
- next-auth v5 reads the secret from `AUTH_SECRET` env var automatically.
- `proxy.ts` explicitly reads `process.env.NEXTAUTH_SECRET` to pass to `getToken()`.
- If `AUTH_SECRET` and `NEXTAUTH_SECRET` have different values (or only one is set), JWT validation will fail silently.

### API Route Auth
- Most API routes check `auth()` and return 401 — correct.
- `/api/settings` (GET+POST), `/api/settings/test-whatsapp`, `/api/payment/confirm`, `/api/prescription/[id]/pdf` — **no auth check**.
- The settings API exposes all credentials (WhatsApp tokens, API keys, Cashfree secrets) to anyone who can reach the server.

---

## 7. WhatsApp Configuration Analysis

### API Version & Endpoint
- **Hardcoded in `client.ts`**: `const API_VERSION = 'v18.0';`
- **Also defined in `constants.ts`**: `export const WHATSAPP_API_VERSION = 'v18.0';`
- The constant in `constants.ts` is **never imported by `client.ts`** — the version is hardcoded separately in two places. Not a bug but a maintenance risk.
- Endpoint: `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`

### Environment Variables Read
- `WHATSAPP_PHONE_NUMBER_ID` → used as `phoneNumberId` in API calls
- `WHATSAPP_ACCESS_TOKEN` → used as Bearer token
- `WHATSAPP_BUSINESS_ACCOUNT_ID` → stored in settings but **never used in actual API calls** (not used in `client.ts` or any API route that sends messages)
- `WHATSAPP_VERIFY_TOKEN` → used for webhook GET verification
- `WHATSAPP_TEST_RECIPIENT` → used as default recipient for test message

### WhatsApp ID Configuration Mismatch Analysis

The user reported these values:

**Meta Developer Portal (Test environment):**
- Test Phone Number ID: `1445394208655254`
- Test WhatsApp Number: `+1 555 151 4877`
- Messaging Account ID: `28257808300560013`

**App .env (current values by name only):**
- `WHATSAPP_PHONE_NUMBER_ID` = (set — but reading the variable name `116655001319676` was mentioned in the original request)
- `WHATSAPP_BUSINESS_ACCOUNT_ID` = (set — `1045535468955334` per original request)

**Assessment**: The phone number IDs `116655001319676` (in .env) vs `1445394208655254` (Meta portal test number) are different IDs. In Meta WhatsApp Business API, you can have multiple phone numbers associated with one business account. The IDs would match if you're looking at the same phone number. The discrepancy suggests one of:
1. The `.env` has credentials from a **production/live WhatsApp Business account** while the portal shows the **test account sandbox number** — these are intentionally different.
2. The `.env` credentials are from an older phone number setup that has since changed.

**The Business Account IDs are also different**: `1045535468955334` (.env) vs `28257808300560013` (portal). This is a stronger signal of a mismatch — these should be the same if they belong to the same WhatsApp Business Account.

**Conclusion**: The `.env` phone number ID and Business Account ID do NOT appear to match the currently active test account shown in the Meta Developer Portal. The test messages sent using the `.env` credentials will likely fail with an authentication error (token invalid for that phone number ID), or succeed if the access token is a permanent production token from a different app.

**Do NOT replace credentials** — this needs the user to manually verify which phone number ID corresponds to the access token stored in `.env`.

### WhatsApp Webhook Signature
- The webhook route (`/api/webhook/whatsapp`) does **NOT verify the signature** of incoming POST requests. `verifyWebhookSignature` exists in `client.ts` but is never called in the webhook POST handler.
- This means any HTTP client can POST fake messages to the webhook endpoint.

### Critical Webhook Bug: Function Signature Mismatch
```typescript
// webhook/whatsapp/route.ts calls:
handleIncomingMessage(from, message).catch(...)
// ^^ Passes the raw message OBJECT as second argument

// But conversation-engine.ts defines:
export async function handleIncomingMessage(
  from: string,
  messageType: 'text' | 'audio' | 'image' | 'document',
  textBody?: string,
  audioMediaId?: string,
): Promise<void>
// ^^ Expects messageType (string) as second argument
```
The webhook passes the entire message object where `messageType` string is expected. TypeScript would catch this — but since the webhook file uses `.catch()` (async fire-and-forget), the error is silently swallowed. **The entire WhatsApp conversation engine is broken — no messages will be processed.**

---

## 8. Payment Integration Analysis

### Gateway
- Cashfree Payment Links API (not Orders API).
- Default URL: `https://sandbox.cashfree.com/pg` — sandbox mode.
- Production URL requires setting `CASHFREE_API_URL` to `https://api.cashfree.com/pg`.
- API version: `2026-01-01` (from `CASHFREE_API_VERSION` constant).

### Payment Flow
1. Patient completes symptom collection via WhatsApp.
2. Cashfree Payment Link created via `createCashfreePaymentLink()` → returns `link_id` + `link_url`.
3. Link stored in `Payment` table as `cashfreeOrderId = link_id`.
4. Link sent to patient via WhatsApp CTA button.
5. Patient completes payment at Cashfree hosted page.
6. Two paths for confirmation:
   - **Webhook**: Cashfree POSTs to `/api/payment/webhook` → verifies HMAC sig → updates payment + consultation.
   - **Success page**: Patient redirected to `/payment/success?link_id=...` → page calls `/api/payment/confirm` → server verifies link status with Cashfree.
7. Both paths check `payment.status === 'SUCCESS'` before processing to prevent duplicates.

### Duplicate Payment Prevention
- Both `/api/payment/confirm` and `/api/payment/webhook` check `if (payment.status === 'SUCCESS') return 'already_processed'` — **correctly implemented**.

### Webhook Signature Verification
- `verifyCashfreeWebhook()` correctly uses HMAC-SHA256 of `timestamp + rawBody` compared to the `x-webhook-signature` header.
- `SECRET_KEY` is read at module level (`const SECRET_KEY = process.env.CASHFREE_SECRET_KEY!`) — if env var is missing at startup, this will be `undefined`, causing all signatures to fail.

### Environment Configuration Bug
- `cashfree.ts` reads `CASHFREE_API_URL` from env to toggle sandbox/production.
- The Settings page has a `cashfreeEnv` field ("sandbox" vs "production") but `settings.ts` saves it and updates `process.env.CASHFREE_ENV` — however **`cashfree.ts` reads `CASHFREE_API_URL` not `CASHFREE_ENV`**.
- Changing "Environment" in the Settings UI will NOT switch from sandbox to production — the URL will remain sandbox unless `CASHFREE_API_URL` is explicitly changed.

### Env Vars Required
- `CASHFREE_APP_ID`
- `CASHFREE_SECRET_KEY`
- `CASHFREE_API_URL` (optional, defaults to sandbox)
- `NEXT_PUBLIC_APP_URL` (for return URL in payment links)

---

## 9. AI Integration Analysis

### Services Used
| Service | Function | Called From |
|---|---|---|
| OpenAI Whisper (`whisper-1`) | Audio transcription from WhatsApp voice notes | `transcription.ts` |
| OpenAI GPT-4o-mini | Symptom extraction, field extraction (name/age/gender), AI clinical summary, safety screening | `transcription.ts`, `safety-screening.ts` |
| OpenAI TTS-1 | Text-to-speech for voice replies | `tts.ts` |

### OpenAI Client Initialization — Issue
```typescript
// transcription.ts (module level):
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
// safety-screening.ts (module level):
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
```
These are created at module import time. If the key is updated via the Settings UI, the `process.env.OPENAI_API_KEY` is updated in memory (`settings.ts` does this) but the already-instantiated `openai` objects will still use the old key. **Settings UI changes to OpenAI key require server restart to take effect for transcription and safety-screening modules.**

The `tts.ts` correctly creates a new `OpenAI` instance each call reading from settings — this is fine.

### Error Handling
- `transcribeAudioFromWhatsApp` — throws on failure; caller in `resolveInput` catches it.
- `extractSymptomsFromText` — catches JSON parse errors, falls back to raw text.
- `extractFieldFromVoice` — no try/catch; throws to caller.
- `runSafetyScreening` — catches AI call errors; falls back to rule-based screening.
- `generateAISummaryForDoctor` — no try/catch; caller wraps in try/catch.
- TTS failures — returns `null`, caller checks for null.
- **AI failures do NOT crash the app** — most paths have fallbacks.

### Temp File Issue
- `transcribeAudioFromWhatsApp` writes to `/tmp/audio_*.ogg` — uses `/tmp` which does not exist on Windows. Will fail in local Windows development.
- `textToSpeechHindi` writes to `/tmp/tts_*.mp3` — same issue.
- This is only a local dev issue; production on Linux/Vercel works fine.

---

## 10. Email Integration Analysis

**No email integration exists in this codebase.**

- No SMTP library (`nodemailer`, `@sendgrid/mail`, `resend`, etc.) installed.
- No email sending function anywhere in `src/`.
- No email-related environment variables in `.env` or referenced in code.
- The requirement states: "After a patient successfully completes payment: Send an email to the doctor including patient details, consultation details, payment amount and transaction ID."

**This feature is entirely missing.** It needs to be built from scratch.

---

## 11. Preliminary Bug List

### CRITICAL Bugs

**BUG-001: WhatsApp Conversation Engine Completely Broken**
- File: `src/app/api/webhook/whatsapp/route.ts` line 48
- Description: `handleIncomingMessage(from, message)` passes the raw WhatsApp message object as the second argument, but the function signature expects `messageType: 'text' | 'audio' | 'image' | 'document'` as a string. The object is not a valid string. TypeScript would flag this, but the call is fire-and-forget so errors are silently swallowed.
- Impact: **No WhatsApp messages from patients are ever processed.** The entire patient-facing conversation flow is broken.
- Fix needed: Parse `message.type`, `message.text?.body`, `message.audio?.id` from the message object before calling `handleIncomingMessage`.

**BUG-002: Dashboard Routes Have No Auth Protection**
- File: `src/proxy.ts` exists but no `middleware.ts` file exists in `/` or `/src/`
- Description: `proxy.ts` contains auth-redirecting logic and an `export const config` with matchers, but Next.js only runs middleware from a file literally named `middleware.ts`. The function is never invoked. Dashboard server pages call `auth()` but don't redirect when it returns null.
- Impact: Unauthenticated users can view all patient data, consultations, and prescriptions.
- Fix needed: Rename `proxy.ts` to `middleware.ts` (or create a `middleware.ts` that imports from `proxy.ts`).

**BUG-003: Settings API Has No Authentication**
- File: `src/app/api/settings/route.ts`, `src/app/api/settings/test-whatsapp/route.ts`
- Description: Anyone can GET/POST to `/api/settings` to read or overwrite all API keys, tokens, and credentials without any session check.
- Impact: Complete credential exposure / overwrite attack.
- Fix needed: Add `auth()` check to both settings routes.

**BUG-004: `better-sqlite3` in Production Dependencies**
- File: `package.json`
- Description: `better-sqlite3` requires native Node.js compilation. Vercel's serverless build may fail if it cannot compile native addons for the Lambda runtime. `@prisma/adapter-better-sqlite3` is also listed.
- Impact: Potential build failure on Vercel / serverless deployment.
- Fix needed: Remove `better-sqlite3`, `@prisma/adapter-better-sqlite3`, `@types/better-sqlite3` from dependencies.

**BUG-005: `"18": "^0.0.0"` Bogus Dependency**
- File: `package.json`
- Description: A dependency with key `"18"` and version `"^0.0.0"` exists. This is almost certainly a copy-paste error. Package `18` from npm is a dummy/empty package.
- Impact: Installs a useless package; could be a supply-chain risk if the package is ever poisoned.
- Fix needed: Remove from `package.json`.

**BUG-006: WhatsApp Webhook Signature Not Verified**
- File: `src/app/api/webhook/whatsapp/route.ts`
- Description: The POST handler does not verify the `X-Hub-Signature-256` header that Meta sends with every webhook delivery. `verifyWebhookSignature()` exists in `client.ts` but is never called in the webhook POST handler.
- Impact: Any actor can POST fake patient messages to the system.
- Fix needed: Read `X-Hub-Signature-256` header and call `verifyWebhookSignature()` before processing.

### HIGH Bugs

**BUG-007: AUTH_SECRET vs NEXTAUTH_SECRET Mismatch**
- File: `src/proxy.ts` line 11, `.env`
- Description: `proxy.ts` reads `process.env.NEXTAUTH_SECRET` to pass to `getToken()`. next-auth v5 uses `AUTH_SECRET` as its canonical env var. If both are set to different values, middleware JWT validation will break. If only `AUTH_SECRET` is set, `proxy.ts` will have an `undefined` secret, making `getToken()` fail.
- Fix needed: Update `proxy.ts` to use `process.env.AUTH_SECRET` (matching next-auth v5 convention), and ensure `middleware.ts` exists (see BUG-002).

**BUG-008: Cashfree Environment Toggle Broken**
- File: `src/lib/settings.ts`, `src/lib/payment/cashfree.ts`
- Description: Settings page saves `cashfreeEnv: 'sandbox' | 'production'` and updates `process.env.CASHFREE_ENV`. However, `cashfree.ts` reads `process.env.CASHFREE_API_URL` (not `CASHFREE_ENV`) to select the base URL. Setting "production" in the UI does not change the API URL.
- Fix needed: In `cashfree.ts`, derive the API URL from `CASHFREE_ENV` when `CASHFREE_API_URL` is not explicitly set, or update `settings.ts` to set `CASHFREE_API_URL` when env changes.

**BUG-009: Module-Level OpenAI Client Won't Reflect Settings UI Changes**
- File: `src/lib/ai/transcription.ts` line 6, `src/lib/ai/safety-screening.ts` line 5
- Description: `new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })` is called at module import time. When a user updates the OpenAI key via the Settings UI, `process.env.OPENAI_API_KEY` is updated in memory — but these already-created `openai` instances still hold the old key.
- Fix needed: Move OpenAI instantiation inside each function (like `tts.ts` does) so each call picks up the current key.

**BUG-010: `/api/prescription/[id]/pdf` Has No Auth**
- File: `src/app/api/prescription/[id]/pdf/route.ts`
- Description: The prescription PDF endpoint is publicly accessible with just the prescription ID. Anyone with a valid ID can view patient medical records.
- Impact: Patient privacy / HIPAA concern.
- Fix needed: Add auth check, or at minimum ensure the URL uses an unguessable token.

**BUG-011: `settings.ts` Imports `dotenv/config` — Problematic in Next.js Server Context**
- File: `src/lib/settings.ts` line 1
- Description: `import 'dotenv/config'` in a Next.js server module causes dotenv to try to load `.env` at import time, potentially overwriting `process.env` values that Next.js has already set from `.env.local`. This is unexpected behavior in a Next.js app (Next.js handles env loading natively). It may also run on every request since `settings.ts` is not a singleton.
- Fix needed: Remove `import 'dotenv/config'` from `settings.ts`. Next.js loads env files automatically.

**BUG-012: `/tmp` Directory Doesn't Exist on Windows**
- Files: `src/lib/ai/transcription.ts`, `src/lib/ai/tts.ts`
- Description: Both files use `path.join('/tmp', ...)` for temp audio files. On Windows (local dev), `/tmp` doesn't exist and `fs.writeFileSync` will throw.
- Fix needed: Use `os.tmpdir()` instead of hardcoded `/tmp`.

**BUG-013: Email Feature Not Implemented**
- Description: The original requirement specifies sending email to the doctor after payment. No email code, library, or env vars exist.
- Fix needed: Implement email sending (e.g., Nodemailer with SMTP or Resend API) triggered from `/api/payment/confirm` and/or `/api/payment/webhook` after successful payment.

### MEDIUM Bugs

**BUG-014: `dev.db` SQLite File in Project Root**
- File: `dev.db`
- Description: A SQLite database file from initial development is committed to the project root. This is not used by the app (which uses NeonDB) but adds clutter and potential confusion.
- Fix needed: Add `dev.db` to `.gitignore` and delete the file.

**BUG-015: `NEXT_PUBLIC_APP_NAME` Not Used**
- File: `.env` contains `NEXT_PUBLIC_APP_NAME`; `constants.ts` hardcodes `APP_NAME = 'MediVoice AI'`
- Description: The env var is set but the code uses the hardcoded constant.
- Impact: Low — cosmetic inconsistency.

**BUG-016: Prescription "PDF" Is Actually HTML**
- File: `src/app/api/prescription/[id]/pdf/route.ts`, `src/lib/pdf/prescription-generator.ts`
- Description: The endpoint is named `/pdf` and returns HTML with `Content-Type: text/html`. The installed packages `@react-pdf/renderer`, `jspdf`, `html2canvas` are not used.
- Impact: When patients receive the link on WhatsApp and try to open it, they get an HTML page (which renders fine in a browser) — but it cannot be saved as a PDF without browser print-to-PDF. Not technically broken, but misnamed and unusable as a file attachment.

**BUG-017: CSS Syntax Error in `prescription-generator.ts`**
- File: `src/lib/pdf/prescription-generator.ts`
- Description: In the `.header` CSS class: `border-bottom: 3px solid #2563eb; pb-4 margin-bottom: 24px;` — `pb-4` is a Tailwind class mixed into inline CSS. It will be ignored by the browser CSS parser.
- Impact: Minor styling issue in the prescription header.
- Fix needed: Remove `pb-4` or replace with `padding-bottom: 16px`.

**BUG-018: `WHATSAPP_BUSINESS_ACCOUNT_ID` Never Used in API Calls**
- File: `src/lib/settings.ts`, `src/lib/whatsapp/client.ts`
- Description: The Business Account ID is stored in settings and env but no API call in `client.ts` uses it. Meta's send-message endpoint only requires the Phone Number ID.
- Impact: Low — not a functional bug, just dead configuration.

**BUG-019: `patients/[id]` Page Not Found**
- Description: The API route `src/app/api/patients/[id]/route.ts` exists but there is no page at `src/app/dashboard/patients/[id]/page.tsx`. The `PatientActionsMenu` component likely navigates to this route.
- Impact: Clicking "View Patient" will 404.
- Fix needed: Create `src/app/dashboard/patients/[id]/page.tsx`.

**BUG-020: Unused Packages Add Build Weight**
- `@react-pdf/renderer`, `jspdf`, `html2canvas`, `uuid`, `@neondatabase/serverless`, `ws` — installed but unused.
- Fix needed: Remove from `package.json`.

### LOW Bugs

**BUG-021: `CASHFREE_API_VERSION` Constant Defined but May Be Stale**
- File: `src/lib/constants.ts` exports `CASHFREE_API_VERSION = '2026-01-01'`
- Description: This is a future-looking API version. Cashfree may or may not support it. Should be verified against Cashfree docs.

**BUG-022: `WHATSAPP_API_VERSION` Defined in Two Places**
- `src/lib/constants.ts` exports `WHATSAPP_API_VERSION = 'v18.0'`
- `src/lib/whatsapp/client.ts` hardcodes `const API_VERSION = 'v18.0'`
- The constant is never imported by `client.ts`. Risk of divergence.

**BUG-023: `instant = false` Export on Multiple Pages**
- Files: `dashboard/page.tsx`, `analytics/page.tsx`, `consultations/page.tsx`, `patients/page.tsx`, `prescriptions/page.tsx`, `consultations/[id]/page.tsx`
- Description: `export const instant = false;` — this is not a standard Next.js export. It appears to be a leftover or experimental flag. Could cause TypeScript warnings.

**BUG-024: `session` Is Fetched in Server Pages But Never Used**
- Files: `dashboard/consultations/page.tsx`, `dashboard/patients/page.tsx`, `dashboard/prescriptions/page.tsx`, `dashboard/analytics/page.tsx`
- Description: `const session = await auth();` is called but `session` is never referenced in the component body. Wasted DB/network call.

---

## 12. WhatsApp Configuration — Detailed Assessment

### ID Comparison Table
| Field | In .env | Meta Portal (Test) | Match? |
|---|---|---|---|
| Phone Number ID | `116655001319676` | `1445394208655254` | ❌ No |
| Business Account ID | `1045535468955334` | `28257808300560013` | ❌ No |
| Test Recipient | `917355177189` | N/A | — |

### Interpretation
Both IDs differ from the portal's test credentials. Possible explanations:
1. **Most likely**: The `.env` has credentials from a **live/production WhatsApp Business number** while the portal currently shows the sandbox test number. These are intentionally separate.
2. **Possible**: The credentials in `.env` are from a different Meta App entirely (e.g., a personal test app that was set up earlier).

### What This Means Practically
- If the access token in `.env` is a valid permanent token for Phone Number ID `116655001319676`, messages will work fine regardless of what the portal shows as the "test number."
- If the access token belongs to the test app (`1445394208655254`), then calls using `116655001319676` as the phone number ID will return a Meta API error like `#100: Invalid phone number id`.
- **To test**: Send a test message from the Settings UI. If it succeeds, the .env credentials are correct for each other. If it fails with a Meta API error, the Phone Number ID and Access Token are from different apps.

---

## 13. Summary: Bugs by Priority

### Must Fix Before Production
1. **BUG-001** — WhatsApp webhook function signature mismatch (entire conversation flow broken)
2. **BUG-002** — No `middleware.ts` (dashboard unprotected)
3. **BUG-003** — Settings API unauthenticated (credential exposure)
4. **BUG-004** — `better-sqlite3` will fail Vercel build
5. **BUG-006** — WhatsApp webhook POST not signature-verified (fake messages accepted)
6. **BUG-013** — Email feature not implemented (user requirement)

### Should Fix Before Production
7. **BUG-007** — AUTH_SECRET vs NEXTAUTH_SECRET mismatch
8. **BUG-008** — Cashfree environment toggle broken
9. **BUG-009** — Module-level OpenAI clients don't update on settings change
10. **BUG-010** — Prescription PDF route unauthenticated
11. **BUG-011** — `dotenv/config` import in Next.js server module
12. **BUG-012** — `/tmp` directory issue on Windows
13. **BUG-019** — Missing `patients/[id]` page

### Nice to Have
14. BUG-005, BUG-014 through BUG-024 — cleanup, cosmetic, and minor issues

---

## 14. Environment Variables — Final Assessment

| Variable | Status | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ Set | Required for Prisma/NeonDB |
| `AUTH_SECRET` | ✅ Set | next-auth v5 canonical var |
| `NEXTAUTH_SECRET` | ✅ Set | Used by proxy.ts — should be same value as AUTH_SECRET |
| `OPENAI_API_KEY` | ✅ Set | Required for AI features |
| `WHATSAPP_ACCESS_TOKEN` | ✅ Set | Needs verification against phone number ID |
| `WHATSAPP_PHONE_NUMBER_ID` | ✅ Set | Verify matches access token's app |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | ✅ Set | Not actually used in API calls |
| `WHATSAPP_VERIFY_TOKEN` | ✅ Set (PYINDIA) | Must match Meta portal webhook config |
| `WHATSAPP_TEST_RECIPIENT` | ✅ Set | Format: `917355177189` (no +) |
| `CASHFREE_APP_ID` | ✅ Set | |
| `CASHFREE_SECRET_KEY` | ✅ Set | |
| `CASHFREE_ENV` | ✅ Set | But cashfree.ts doesn't read this! |
| `CASHFREE_API_URL` | ✅ Set | This is what cashfree.ts actually reads |
| `NEXT_PUBLIC_APP_URL` | ✅ Set | Critical for Cashfree return_url and prescription URL |
| `CONSULTATION_FEE` | ✅ Set | Default 300 if not set |
| `SMTP_*` / Email vars | ❌ Missing | Email feature not implemented |

---

*Phase 1 analysis complete. All findings documented above. No code changes were made.*
