# Pre-launch hardening checklist (M9)

Use this as the single launch gate. Every item must be ☑ before flipping
production traffic to the app.

## Compliance

- [ ] HIPAA risk assessment reviewed and signed by the platform owner
      (see [SECURITY.md](./SECURITY.md))
- [ ] All required BAAs executed (see [BAA_TRACKER.md](./BAA_TRACKER.md))
- [ ] PHI data flow diagram up-to-date and matches code

## Application security

- [ ] Production secrets rotated; no shared dev secrets
- [ ] `PHI_ENCRYPTION_KEY` is wrapped by KMS; rotation runbook documented
- [ ] CSP tightened: replace `'unsafe-inline'` with nonces
- [ ] CSRF protection verified for all state-changing routes
- [ ] In-process rate limiter swapped for Redis-backed limiter
- [ ] HSTS preload list submission (after first prod TLS cert)
- [ ] Cookies confirmed `Secure` + `HttpOnly` + `SameSite=Lax`
- [ ] Dependency audit clean (`npm audit` no high/critical)
- [ ] Container / function minimal IAM roles (no `*:*` policies)
- [ ] Pen test report findings remediated and re-tested
      (see [PENTEST.md](./PENTEST.md))

## Authentication

- [ ] Mandatory TOTP MFA enforced after first sign-in
- [ ] Idle timeout default 15 minutes (`SESSION_IDLE_MINUTES=15` in prod)
- [ ] Password policy enforces ≥ 12 chars, breach-list check (HIBP API)
- [ ] Sign-in lockout after N failed attempts within window

## Audit & ERISA

- [ ] `verifyAuditChain()` scheduled hourly; alert on `ok: false`
- [ ] `Submission.manifestHash` integrity check scheduled daily
- [ ] Backup of `AuditLog` immutable for 7+ years (S3 Object Lock)
- [ ] Disaster recovery test passed: restore `Submission` snapshots
      from cold storage

## Operations

- [ ] Logging: PHI scrub filters tested with synthetic events
- [ ] Monitoring: dashboards for p95 latency, error rate, queue depth,
      audit-chain integrity
- [ ] Alerts wired to on-call (paging policy documented)
- [ ] Runbooks: incident response, data subject access request,
      key rotation, audit-chain failure

## Accessibility

- [ ] Lighthouse a11y ≥ 95 on every player flow page
- [ ] axe-core CI step passing
- [ ] External a11y audit complete; findings remediated
      (see [ACCESSIBILITY.md](./ACCESSIBILITY.md))

## Performance

- [ ] k6 baseline meets thresholds in [LOAD_TEST.md](./LOAD_TEST.md)
- [ ] Document upload pipeline drains within target on 25 concurrent users
- [ ] Reminder cron run completes within target on synthetic 1k load

## Legal & user-facing

- [ ] Privacy notice and Notice of Privacy Practices published
- [ ] Terms of Use, including non-legal-advice disclaimer, published
- [ ] Data Subject Access Request (DSAR) process documented
- [ ] Plan-document version pinned for the rubric snapshot per claim
