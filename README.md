# Gridiron LOD — Self-service NFL Line of Duty disability servicing app

A Next.js 15 + Postgres web app that empowers retired NFL players to file Line of Duty (LOD) disability claims without an appointed representative. The platform combines guided intake, AI-driven medical-record analysis (OCR → LLM extraction → mapping to a versioned LOD rubric), medical-records request tracking, claim packet generation with e-signature, immutable ERISA submission snapshots, and IPB/MAB appeal & hearing prep.

> **Scope (v1):** Line of Duty only. Schema is ready for additional benefit tracks (T&P, Neurocognitive, 88 Plan) but they're out-of-scope for v1.

## Tech stack

- **Frontend / API:** Next.js 15 (App Router, TypeScript, Server Actions), Tailwind CSS, custom shadcn-style UI, react-hook-form + zod, SWR.
- **DB / ORM:** Postgres (SQLite in dev) via Prisma. Multi-tenant by `playerId`.
- **Auth:** NextAuth.js v5 + bcrypt + TOTP MFA (otplib).
- **Storage:** AWS S3 SSE-KMS in prod; local mock in dev.
- **OCR:** AWS Textract in prod; mock in dev.
- **LLM:** OpenAI Enterprise or Anthropic in prod; mock heuristic in dev.
- **E-sign:** DocuSign embedded; mock in dev.
- **Email/SMS:** Postmark / Twilio; console in dev.
- **PDF:** `pdf-lib`.
- **Compliance:** HIPAA + ERISA posture (audit chain, immutable submissions, BAAs gated at launch).

## Quick start

```bash
npm install
cp .env.example .env
# fill PHI_ENCRYPTION_KEY and NEXTAUTH_SECRET with `openssl rand -base64 32`
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Demo accounts (after seed):

- **player:** `player@example.com` / `Player!12345`
- **admin:**  `admin@example.com`  / `Admin!12345`

Open http://localhost:3000.

## What's in the app

| Area | Path | Purpose |
|---|---|---|
| Onboarding | `/onboarding` | Player profile + credited seasons; computes the LOD filing deadline (max of 48 months / credited-seasons years from last active player date). |
| Eligibility prescreen | `/claim/new` | Branching screener for the four LOD pathways. |
| Claim workspace | `/claim/[id]` | Documents, AI-suggested findings, gap analysis. |
| Document viewer | `/claim/[id]/documents/[docId]` | OCR text with extracted clinical findings highlighted. |
| Medical records | `/records` | Two queues (NFL Club + third-party), HIPAA release generation, follow-up engine, ERISA-grade call/email log. |
| Neutral physician | `/exams` | Scheduling, prep checklist, post-exam notes, supplemental letter draft for inadequate exams. |
| Claim builder | `/claim/[id]/builder` | Auto-populated LOD packet, e-sign, immutable submission snapshot. |
| Timeline | `/claim/[id]/timeline` | State machine + 45-day completeness clock + activity log. |
| Appeals | `/appeals` | 180-day clock, denial-letter intake, exhibit builder, brief generator, IPB/MAB hearing prep. |
| Offsets &amp; payments | `/payments` | SSDI / WC offsets, projected net monthly, payment ledger w/ overdue alerts. |
| Settings &amp; MFA | `/settings` | TOTP enrollment. |
| Admin console | `/admin` | Rubric versioning, templates, audit log, compliance dashboard. |

## Compliance documentation

All living documents live in `docs/` and are surfaced in the admin compliance page (`/admin/compliance`):

- `HIPAA-RISK-ASSESSMENT.md`
- `BAA-TRACKER.md`
- `PEN-TEST-PLAN.md`
- `WCAG-AUDIT.md`
- `LOAD-TEST-PLAN.md`
- `INCIDENT-RESPONSE.md`
- `PRODUCTION-CHECKLIST.md`

Production cut-over is gated on every checklist item in `PRODUCTION-CHECKLIST.md`.

## Cron / background jobs

- `POST /api/reminders/dispatch` — dispatches email + SMS reminders for medical-record follow-ups and approaching filing/appeal deadlines. Wire to Vercel Cron, EventBridge, or Inngest.

## Health

- `GET /api/health` — DB connectivity, audit chain integrity, build SHA.

## Folder map

```
src/
  app/                       # Next.js App Router (player + admin + auth + api)
  components/                # shared UI
  lib/
    ai/                      # ocr, extract, mapToRubric (mocks today; swap for prod drivers)
    erisa/                   # snapshotSubmission
    lod/                     # deadlines, eligibility, offsets
    audit.ts                 # append-only hash-chained AuditLog
    crypto.ts                # PHI envelope encryption
    storage.ts               # blob store interface (local + future S3)
    pdf.ts                   # text-PDF generator
    rateLimit.ts             # in-process limiter (swap for Redis in prod)
prisma/
  schema.prisma              # canonical data model
  seed.ts                    # rubric skeleton + templates + demo accounts
docs/                        # compliance / hardening docs
```

## What's mocked vs. what's real

| Surface | Dev mock | Prod target |
|---|---|---|
| Storage | local filesystem (`./.uploads`) | AWS S3 SSE-KMS |
| OCR | text echo + heuristic blocks | AWS Textract |
| LLM extraction | regex / keyword heuristic | OpenAI Enterprise / Anthropic w/ JSON-schema |
| E-sign | mock stamps a "signed" PDF | DocuSign embedded signing |
| Email | console.log | Postmark |
| SMS | console.log | Twilio |
| Queue | inline | Inngest / BullMQ |

Swap drivers by setting the matching env var (`STORAGE_DRIVER`, `AI_DRIVER`, `EMAIL_DRIVER`, `SMS_DRIVER`, `ESIGN_DRIVER`).

## Outstanding before production

See `docs/PRODUCTION-CHECKLIST.md`. Highlights:

- Codify Appendix A v2 point values into the active `RubricVersion` (the seeded rubric uses placeholders).
- Execute every BAA in `docs/BAA-TRACKER.md`.
- Pen test, WCAG 2.1 AA audit, load test sign-off.
- Counsel review of HIPAA release templates and player-facing disclaimers.
