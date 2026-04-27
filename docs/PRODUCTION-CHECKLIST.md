# Production Cut-Over Checklist

## Compliance gates

- [ ] HIPAA risk assessment signed (`docs/HIPAA-RISK-ASSESSMENT.md`).
- [ ] All BAAs executed (`docs/BAA-TRACKER.md`).
- [ ] External penetration test passed with no open Critical/High (`docs/PEN-TEST-PLAN.md`).
- [ ] WCAG 2.1 AA audit passed (`docs/WCAG-AUDIT.md`).
- [ ] Load test targets met (`docs/LOAD-TEST-PLAN.md`).
- [ ] Incident response runbook rehearsed in the last 6 months (`docs/INCIDENT-RESPONSE.md`).
- [ ] Privacy policy + Terms of Service published, citing subprocessors.
- [ ] Cookie banner / consent flows reviewed by counsel.

## Infrastructure gates

- [ ] AWS account hardened: org-level SCP, CloudTrail to dedicated logging account, GuardDuty + Security Hub on, AWS Config rules.
- [ ] RDS Postgres: HIPAA-eligible class, encrypted storage (KMS CMK), automated backups + 35 day retention, manual snapshot before launch.
- [ ] S3 PHI bucket: SSE-KMS w/ CMK, BPA on, versioning + MFA delete, lifecycle to Glacier ≥ 90 days, no cross-region replication unless target is also HIPAA.
- [ ] KMS CMKs rotated annually; key policies reviewed; alarms on disable/delete.
- [ ] Secrets in AWS Secrets Manager (or Vercel encrypted env vars) — never in repo.
- [ ] Vercel project: production env variables verified, preview deployments DO NOT receive production DB / S3.
- [ ] Sub-domain restrictions, custom domain w/ TLS 1.3, HSTS preload submitted.
- [ ] Email DKIM/DMARC/SPF set for transactional sending domain.

## Application gates

- [ ] `npm run build` clean, no TypeScript errors.
- [ ] `npm run lint` clean.
- [ ] Migrations run against prod DB and rollback tested.
- [ ] Seed data: at least one rubric version published with **official Appendix A v2 point values** (not the v1 placeholders).
- [ ] HIPAA release templates approved by counsel.
- [ ] Auth: MFA enforced for all admins (TODO add policy); password length >= 12; bcrypt cost 12.
- [ ] Audit chain verifies (`/api/health` returns `auditChain: true`).
- [ ] Rate limits enabled on sign-up, sign-in, MFA, upload.
- [ ] CSP headers in place; verified with `curl -I`.
- [ ] Session idle timeout = 30 minutes (HIPAA "automatic logoff").
- [ ] Email/SMS reminder dispatcher cron wired up (`/api/reminders/dispatch`).
- [ ] Error monitoring (Sentry) configured, PII scrubbing on.
- [ ] Logging pipeline scrubs PHI; manual spot-check of a synthetic PHI request.

## Operations gates

- [ ] On-call rotation set; PagerDuty integration tested.
- [ ] Backup restoration drill run in the last 90 days.
- [ ] Disaster recovery runbook tested in staging.
- [ ] Customer support training on PHI handling complete.
- [ ] Monitoring dashboards published; SLOs documented.

## Sign-off

- Engineering lead: ____ Date: ____
- Security officer: ____ Date: ____
- Privacy officer: ____ Date: ____
- Legal counsel: ____ Date: ____
- Executive sponsor: ____ Date: ____
