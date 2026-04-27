# Business Associate Agreement Tracker

> Launch gate: every vendor that touches PHI must have an executed BAA, named subprocessors, and a documented data flow before production cut-over.

| Vendor | Service used | PHI exposure | BAA status | Executed by | Renewal | Notes |
|---|---|---|---|---|---|---|
| AWS | S3, RDS Postgres, Textract, KMS, CloudTrail, SES (optional) | Storage, OCR, transit | Required | Security officer | 1 yr | HIPAA-eligible services only; enable AWS BAA addendum |
| OpenAI | LLM extraction (gpt-4 / 4o) — Enterprise tier | Findings extraction | Required | Security officer | 1 yr | Zero data retention; no training on inputs |
| Anthropic | LLM extraction (Claude) — Enterprise tier | Findings extraction (alternative) | Optional | Security officer | 1 yr | Pick one of OpenAI/Anthropic for v1 |
| DocuSign | Embedded e-signature | Player signatures, signed PDFs | Required | Security officer | 1 yr | Use eSignature for HIPAA |
| Postmark | Transactional email | Subject/body may reference PHI | Required | Security officer | 1 yr | Or use AWS SES under existing AWS BAA |
| Twilio | SMS reminders | Reminder text only (no PHI in body) | Required | Security officer | 1 yr | Keep SMS bodies generic ("you have a follow-up due") |
| Vercel | App hosting | Application traffic only; PHI in S3/RDS, not Vercel | Required | Security officer | 1 yr | Vercel offers BAA on Enterprise tier |
| Inngest / queue | Job orchestration | Job payloads reference IDs only | Required if payloads can include PHI | Security officer | 1 yr | Strip PHI from queue payloads as defense-in-depth |
| Datadog / log vendor | Logs/metrics | App logs only — must scrub PHI | Required | Security officer | 1 yr | Enforce PHI scrubbing in shipping pipeline |
| Sentry | Errors | Stack traces — no PHI in error messages | Required | Security officer | 1 yr | Disable PII capture, scrub breadcrumbs |

## Sign-off checklist before production launch

- [ ] All "Required" rows marked executed with copies on file (legal vault).
- [ ] Subprocessor list reviewed and added to privacy policy.
- [ ] Data Processing Addendum executed where state law (e.g., California, Massachusetts) requires.
- [ ] Vendor security questionnaire (CAIQ / SIG Lite) filed for each.
- [ ] Termination + data return / destruction procedure documented.

## Contract review cadence

- Annual: re-validate executed status, audit reports (SOC 2 Type II / HITRUST).
- On any vendor incident: review BAA and incident notification clauses.
