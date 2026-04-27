# HIPAA Risk Assessment — Gridiron LOD

> Living document. Re-review at every release that touches PHI handling, auth, storage, or third-party integrations. Owner: Security Officer.

## 1. Scope

The application is a self-service web platform that helps retired NFL players file Line of Duty (LOD) disability claims. PHI handled includes:

- Demographics: name, DOB, SSN last 4 (envelope-encrypted), address, phone.
- Career history (not PHI but adjacent identity data).
- Medical records uploaded by the player or received from NFL Club / third-party providers (PDF, images, structured fields).
- AI-derived clinical findings (diagnoses, ROM measurements, imaging interpretations) with citations back to source pages.

Roles:

- **Player** (covered individual / data subject)
- **Admin / support** (workforce member)
- **Security officer / privacy officer** (designated)

## 2. Threat catalogue (highest impact first)

| # | Threat | Likelihood | Impact | Current control | Residual risk | Mitigation owner |
|---|---|---|---|---|---|---|
| 1 | Database PHI exfiltration | Low | High | RDS in private subnet, KMS at-rest, restricted IAM, audit log | Medium | DevOps |
| 2 | S3 PHI bucket misconfiguration / public ACL | Low | High | Block-public-access on, SSE-KMS, presigned URLs only, versioning, MFA delete | Low | DevOps |
| 3 | Account takeover via password reuse / phishing | Medium | High | Bcrypt + min length, MFA via TOTP, idle timeout 30m, rate-limited sign-up/sign-in | Medium | App eng |
| 4 | Insider abuse / unauthorized PHI access | Low | High | Append-only hash-chained `AuditLog`, role checks server-side, least-privilege IAM | Low | Security |
| 5 | Supply-chain (npm package compromise) | Medium | High | Lockfile committed, dependabot, signed releases for prod, SBOM in CI | Medium | App eng |
| 6 | LLM/PII leakage to third party w/o BAA | Low | High | LLM driver requires BAA-eligible vendor (OpenAI Enterprise / Anthropic), prompt scrubbing, content stays in tenant | Low | App eng |
| 7 | OCR provider PHI exposure | Low | High | AWS Textract under existing AWS BAA, S3 SSE-KMS, no cross-region replication | Low | DevOps |
| 8 | E-sign provider compromise | Low | High | DocuSign BAA, embedded signing only, signed PDF rehydrated and stored locally | Low | App eng |
| 9 | Backup tampering | Low | High | RDS automated backups + manual snapshots, immutable submission manifests with sha256 chain, AuditLog hash chain | Low | DevOps |
| 10 | DoS / abuse of upload endpoint | Medium | Medium | Rate limit, body size limit (25MB), MIME allow-list, virus scan stub, S3 throttling | Medium | App eng |
| 11 | XSS via uploaded HTML / SVG | Low | High | CSP headers, `X-Content-Type-Options nosniff`, `Content-Disposition: attachment` on downloads | Low | App eng |
| 12 | Session fixation / CSRF | Low | High | NextAuth secure cookies (`SameSite=Lax`), CSRF tokens for OAuth, no GET mutations | Low | App eng |

## 3. Administrative safeguards (45 CFR § 164.308)

- [x] Designated security officer (TODO: name in production)
- [x] Workforce sanction policy (TODO: HR doc)
- [x] Information access management — role-based, least-privilege
- [x] Security awareness training (annual, log retained)
- [x] Incident response plan — see `docs/INCIDENT-RESPONSE.md`
- [x] Contingency plan — backups, DR runbook, BCP exercise once a year
- [x] Periodic risk re-assessment (this doc)

## 4. Physical safeguards (§ 164.310)

- All PHI storage in AWS data centers (BAA in place).
- Workforce devices: full-disk encryption, MDM-enrolled, screen lock <= 5 min.
- Workforce removable media disallowed.

## 5. Technical safeguards (§ 164.312)

| Requirement | Implementation |
|---|---|
| Access control | NextAuth credentials + TOTP MFA; row-level scoping by `playerId`; admin role gated |
| Audit controls | `AuditLog` model: append-only, sha256 hash chain (`prevHash` -> `hash`); verified by `/api/health` and admin console |
| Integrity | Document `sha256` on upload; immutable `Submission` manifest with hash; ERISA snapshot before any destructive action |
| Person/entity authentication | Email + bcrypt + TOTP MFA; session cookies `HttpOnly`, `Secure`, `SameSite=Lax`; 30m idle timeout |
| Transmission security | TLS 1.3 enforced via HSTS header; no plain-HTTP listeners; KMS in transit between AWS services |

## 6. Encryption

- **At rest**: AES-256 via KMS (S3 SSE-KMS, RDS storage encryption, EBS for any worker fleet). Application-level envelope encryption for `ssnLast4`, `phone`, `address`, `totpSecret` with `PHI_ENC_KEY` (32-byte) using AES-256-GCM.
- **In transit**: TLS 1.3 enforced; HSTS preload; `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.

## 7. Logging & monitoring

- App: structured logs, no PHI in logs (assert in CI w/ regex linter).
- AWS: CloudTrail, S3 access logs, RDS audit logs.
- Alerting: PagerDuty for failed audit chain verification, 4xx/5xx spikes, login anomalies (>5 failures / 5 min / IP).

## 8. BAAs required (launch gate)

See `docs/BAA-TRACKER.md`.

## 9. Outstanding risks / known gaps

- [ ] Penetration test scheduled (see `docs/PEN-TEST-PLAN.md`).
- [ ] WCAG 2.1 AA conformance audit pending (see `docs/WCAG-AUDIT.md`).
- [ ] Disaster recovery exercise pending.
- [ ] Subprocessor list to be published in privacy policy.

## 10. Sign-off

- Security officer: ____________ Date: ____
- Privacy officer: ____________ Date: ____
- Engineering lead: ____________ Date: ____
