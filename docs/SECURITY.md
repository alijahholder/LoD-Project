# Security & HIPAA risk assessment — Gridiron LOD

This document captures the v1 security posture, the HIPAA-aligned risk
assessment, and the controls inventory that gates a production launch.

The application handles **electronic Protected Health Information (ePHI)**
about retired NFL players. As a non-covered-entity service offered directly
to the player, we still hold ourselves to HIPAA-grade controls because (a)
players reasonably expect medical-record privacy, and (b) any third-party
integration (Plan portal, treating provider, payer) will require a
Business Associate Agreement (BAA).

## 1. Scope

Systems in scope:

- The Next.js web app (player + admin)
- Postgres database (player profile, claims, findings, audit log)
- Object storage (uploaded medical records, generated PDFs)
- LLM extraction pipeline (OCR + structured extraction)
- Transactional email + SMS providers
- E-signature provider

Out of scope (v1):

- Direct integration with the NFL Player Benefits Office portal (none exists)
- Player identity verification beyond email + MFA
- Tenant isolation for multiple admins (single-tenant in v1)

## 2. Threat model (STRIDE summary)

| Threat | Asset | Mitigation |
|---|---|---|
| **S**poofing — attacker logs in as a player | Auth | Bcrypt-hashed passwords (cost 12), TOTP MFA, 15-minute idle timeout |
| **T**ampering — attacker edits a finding or audit row | Database | Append-only `AuditLog` with hash-chain (`hash` + `prevHash`); ERISA `Submission` snapshots are immutable JSON manifests with `manifestHash`; integrity verifier endpoint exposed to admins |
| **R**epudiation — player denies submitting | Submissions | Signed envelope via DocuSign + immutable `Submission` snapshot; every state transition recorded in `TimelineEvent` w/ `payloadHash` |
| **I**nformation disclosure — PHI leaks via logs / error messages / non-prod | All | PHI columns envelope-encrypted (AES-256-GCM, KMS-managed key); structured logs scrub email/SSN/DOB; non-prod environments use synthetic data; CSP forbids cross-origin requests |
| **D**enial of service — attacker exhausts auth or upload | API | Per-IP rate limit on sign-up + sign-in; presigned uploads enforce S3-side max size; Vercel platform DDoS controls |
| **E**levation of privilege — player accesses admin | Auth | Server-side role check on `/admin/*` and admin API routes; middleware gates `/admin` |

## 3. Controls inventory (HIPAA Security Rule mapping)

### Administrative safeguards (164.308)

- 164.308(a)(1) Risk analysis: this document. Reviewed quarterly + on
  material change.
- 164.308(a)(3) Workforce clearance: only the platform owner has
  production-database credentials in v1; admins are scoped to rubric/template
  edits, not raw PHI export.
- 164.308(a)(5) Security awareness: README + onboarding checklist covers
  phishing, password reuse, MFA enrollment.
- 164.308(a)(6) Incident response: see "Incident response" below.
- 164.308(a)(7) Contingency plan: nightly Postgres logical backups; S3
  versioning + lifecycle to Glacier; tested restore on a cadence.
- 164.308(b) BAAs: tracked in [BAA_TRACKER.md](./BAA_TRACKER.md).

### Physical safeguards (164.310)

- Cloud-hosted in `us-east-1` data centers covered by AWS / Vercel SOC 2
  reports. No on-prem footprint.

### Technical safeguards (164.312)

- 164.312(a)(1) Access control: NextAuth session, server-side RBAC,
  per-row authorization (`profile.userId` check).
- 164.312(a)(2)(iii) Automatic logoff: `IdleTimeout` client + server
  session expiry (default 15 minutes).
- 164.312(b) Audit controls: `AuditLog` append-only, hash-chained,
  verifiable via `GET /api/admin/audit/verify`.
- 164.312(c) Integrity: `AuditLog`, `Submission.manifestHash`,
  `Document.sha256`, `TimelineEvent.payloadHash`.
- 164.312(d) Person/entity authentication: email + bcrypt password +
  mandatory TOTP MFA after enrollment.
- 164.312(e) Transmission security: TLS 1.3 enforced via HSTS preload;
  CSP locks down third-party connections.

### Encryption

- **At rest**: PHI columns (`ssnLast4`, `phone`, `address`, `totpSecret`)
  envelope-encrypted with AES-256-GCM (`src/lib/crypto.ts`). The data
  encryption key is wrapped by an AWS KMS CMK in production. Postgres
  storage volume encrypted by the cloud provider. S3 bucket uses
  SSE-KMS.
- **In transit**: TLS 1.3, HSTS `max-age=63072000; includeSubDomains; preload`.

### Logging

- Application logs: structured JSON, PHI scrubbed.
- Audit log: every PHI access write → `AuditLog`. Reads of high-sensitivity
  surfaces (`document.read`, `phi.export`) explicitly call `audit()`.
- Retention: 7 years for audit log, aligned with ERISA / HIPAA expectations.

## 4. Data classification

| Class | Examples | Handling |
|---|---|---|
| Public | Marketing copy, plan-document references | Anywhere |
| Internal | Aggregated, de-identified analytics | App + warehouse |
| Confidential | User account info | Encrypted at rest, masked in logs |
| **PHI / ePHI** | Diagnoses, medical records, ROM, imaging, names + DOB | Envelope-encrypted columns or KMS-encrypted blobs; never sent to non-BAA vendors; never to staging/dev |

## 5. Vendor management

See [BAA_TRACKER.md](./BAA_TRACKER.md). No production traffic flows to a
vendor without a fully executed BAA on file.

## 6. Vulnerability management

- `npm audit` + Dependabot on all PRs.
- Quarterly third-party penetration test (see [PENTEST.md](./PENTEST.md)).
- CVE response SLA: critical 48h, high 7d, medium 30d.

## 7. Incident response

- Single on-call rotation; PagerDuty (or equivalent) wired to alerts:
  - p95 latency > 1.5s for 10m
  - Audit-chain verifier returns `ok: false`
  - Failed-login rate > 5x baseline
  - DB CPU > 85% sustained 5m
- Playbook: detect → contain (revoke tokens, rotate KMS DEK,
  freeze affected user) → eradicate → recover → notify (within
  60 days for breach > 500 individuals; HHS portal + affected players).

## 8. Open risks for v1 launch

- [ ] BAAs not yet executed for AWS, OpenAI/Anthropic, DocuSign, Postmark,
      Twilio. **Launch gate.**
- [ ] Third-party pen test not yet scheduled.
- [ ] WCAG 2.1 AA audit not yet completed end-to-end.
- [ ] In-process rate limiter must be replaced with Redis-backed limiter
      before multi-instance deploy.
- [ ] CSP currently allows `'unsafe-inline'` for hydration; tighten to
      nonces before launch.
- [ ] Identity verification: KBA / ID.me-style verification not yet wired.
