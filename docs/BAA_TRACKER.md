# Business Associate Agreement (BAA) tracker

No production traffic flows to a vendor before its BAA is fully executed
and on file with the platform owner. Each row below is a launch gate.

| Vendor | Service | PHI exposure | BAA status | Effective date | Owner | Notes |
|---|---|---|---|---|---|---|
| **AWS** | S3 (PHI bucket, SSE-KMS), KMS, RDS Postgres, Textract, CloudWatch | Yes (uploaded medical records, OCR text, encrypted columns, request logs) | ☐ Not started · ☐ In legal · ☐ Executed | | | Standard AWS BAA via Artifact. Confirm `us-east-1` HIPAA-eligible service list covers everything we use. |
| **OpenAI Enterprise** _or_ **Anthropic** | LLM extraction (clinical findings JSON) | Yes (OCR text → LLM input, structured findings → LLM output) | ☐ Not started · ☐ In legal · ☐ Executed | | | Pick one. Both offer BAAs; require Zero Data Retention. |
| **DocuSign** | Embedded e-sign for HIPAA releases + claim packet | Yes (HIPAA release authorization, signed claim packet) | ☐ Not started · ☐ In legal · ☐ Executed | | | Use DocuSign for Healthcare BAA SKU. |
| **Postmark** | Transactional email (deadline reminders, follow-up nudges) | Limited (subject lines + first names; never embed PHI in body) | ☐ Not started · ☐ In legal · ☐ Executed | | | Available via ActiveCampaign / Wildbit BAA. |
| **Twilio** | SMS reminders | Limited (deadline reminders only; never PHI) | ☐ Not started · ☐ In legal · ☐ Executed | | | Twilio offers a BAA for SMS API customers. |
| **Inngest** _or_ **Upstash Redis (BullMQ)** | Background jobs | Yes (job payloads contain `claimId`, `documentId`) | ☐ Not started · ☐ In legal · ☐ Executed | | | Inngest does not currently sign BAAs (re-check); fallback to BullMQ on Upstash Redis (BAA available). |
| **Vercel** | App hosting | Indirect (request bodies traverse the platform) | ☐ Not started · ☐ In legal · ☐ Executed | | | Requires Enterprise BAA. Otherwise self-host on AWS App Runner / ECS. |
| **Sentry** _or_ chosen APM | Error tracking | Indirect (stack traces; we scrub PHI but cannot guarantee) | ☐ Not started · ☐ In legal · ☐ Executed | | | Sentry offers a BAA on Business plan. |

## Process

1. Submit BAA request through vendor's standard channel (most are self-serve).
2. Track in this file with date submitted.
3. Counter-sign and store the executed BAA in the GRC document store.
4. Update this row with the effective date.
5. Re-validate annually.

## What "indirect" exposure means

Some vendors don't see the PHI body but their infrastructure handles
requests that contain it (Vercel, Sentry). HHS guidance is to BAA those
relationships anyway because the vendor has access to the data in motion
even if it's not the data of record.
