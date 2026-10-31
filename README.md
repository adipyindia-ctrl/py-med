# 🏥 MediVoice AI

AI-powered WhatsApp medical consultation platform built with Next.js 16.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | SQLite via Prisma 7 + better-sqlite3 |
| Auth | NextAuth v5 (JWT) |
| AI | OpenAI Whisper (transcription) + GPT-4o-mini |
| Payments | Cashfree Payment Gateway |
| WhatsApp | Meta WhatsApp Business API |
| Charts | Recharts |
| Forms | React Hook Form + Zod |

---

## Patient Flow (7 Steps)

```
1. Patient sends WhatsApp voice note → Chatbot creates record
2. AI transcribes audio → extracts symptoms → asks follow-up questions
3. Safety screening → Emergency? → Alert doctor. Routine? → Continue
4. Chatbot sends Cashfree payment link → Patient pays
5. Payment webhook verified → Consultation added to doctor queue
6. Doctor reviews on dashboard → writes prescription
7. PDF prescription auto-sent to patient via WhatsApp
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Run database migrations
```bash
npm run db:migrate
```

### 4. Seed initial doctor account
```bash
npm run db:seed
```

Default credentials:
- Email: `doctor@medivoice.ai`
- Password: `doctor123`

### 5. Start development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite file path e.g. `file:./dev.db` |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `NEXTAUTH_URL` | App base URL |
| `WHATSAPP_VERIFY_TOKEN` | Token for webhook verification |
| `WHATSAPP_ACCESS_TOKEN` | Meta app access token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID |
| `OPENAI_API_KEY` | OpenAI API key for Whisper + GPT |
| `CASHFREE_APP_ID` | Cashfree app ID |
| `CASHFREE_SECRET_KEY` | Cashfree secret key |
| `CASHFREE_ENV` | `sandbox` or `production` |
| `CONSULTATION_FEE` | Fee amount in INR (default: 300) |

---

## API Routes

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/webhook/whatsapp` | WhatsApp webhook |
| POST | `/api/payment/webhook` | Cashfree payment webhook |
| GET | `/api/consultation` | List consultations |
| GET/PATCH | `/api/consultation/[id]` | Get/update consultation |
| POST | `/api/prescription` | Create prescription |
| GET | `/api/prescription/[id]/pdf` | View prescription HTML |
| GET | `/api/patients` | List patients |
| GET | `/api/patients/[id]` | Patient detail |
| GET | `/api/admin/stats` | Dashboard statistics |

---

## Dashboard Pages

| Route | Description |
|---|---|
| `/dashboard` | Home with stats + recent consultations |
| `/dashboard/consultations` | All consultations with status filter |
| `/dashboard/consultations/[id]` | Detail view + prescription form |
| `/dashboard/patients` | Patient registry with search |
| `/dashboard/patients/[id]` | Patient profile + history |
| `/dashboard/prescriptions` | All prescriptions |
| `/dashboard/analytics` | Revenue charts + status distribution |

---

## Production Checklist

- [ ] Set `NEXTAUTH_SECRET` to a strong random value (`openssl rand -base64 32`)
- [ ] Set `CASHFREE_ENV=production`
- [ ] Update `NEXT_PUBLIC_APP_URL` to your domain
- [ ] Configure WhatsApp Business webhook to point to `/api/webhook/whatsapp`
- [ ] Configure Cashfree webhook to point to `/api/payment/webhook`
- [ ] Use PostgreSQL or MySQL instead of SQLite for production (update adapter)
