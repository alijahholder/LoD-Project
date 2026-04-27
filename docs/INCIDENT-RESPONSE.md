# Incident Response Runbook

## Severity matrix

| Severity | Examples | Response time | Notification |
|---|---|---|---|
| SEV-1 | Confirmed PHI breach, prod outage > 15 min, audit log tampering detected | 15 min | All hands; HHS notification clock starts |
| SEV-2 | Suspected breach, partial outage, MFA bypass discovered, data integrity issue | 1 hr | On-call + security officer + leadership |
| SEV-3 | Performance degradation, single-tenant data error | 4 hr | On-call + security officer |
| SEV-4 | Cosmetic, low-risk | next business day | Triaged in regular standup |

## Response steps

1. **Detect & triage.** Page on-call. Confirm scope. Open SEV channel + ticket.
2. **Contain.** Rotate any exposed secrets. Disable affected feature flag. Lock affected accounts. Block IPs if abuse pattern.
3. **Eradicate.** Patch root cause. Re-deploy. Run audit chain verification. Spot-check S3 ACLs and RDS access.
4. **Recover.** Restore service. Restore data from immutable manifests / RDS PITR if needed.
5. **Notify.**
   - HIPAA Breach Notification Rule (45 CFR § 164.400 et seq.):
     - Affected individuals notified within 60 days of discovery.
     - HHS notified — immediately if ≥ 500 individuals; annually for < 500.
     - Media notified if ≥ 500 in a state.
   - State breach laws (vary; CA, MA, NY most aggressive).
   - Plan administrator (NFL Player Benefits Office) per BAA terms.
6. **Document.** Post-incident review within 5 business days. Track corrective actions in security backlog.

## Forensic preservation

- Snapshot RDS immediately.
- Export `AuditLog` table and `Submission.manifestJson` rows.
- Pull S3 access logs and CloudTrail for the incident window.
- Don't restart impacted services until forensic snapshot is captured.

## Communication templates

- Player-facing: see `docs/templates/breach-notice-letter.md` (TODO).
- Regulator-facing: see `docs/templates/hhs-notification-form.md` (TODO).

## Drills

- Tabletop exercise twice a year, scenarios drawn from real-world health-tech incidents.
- Live failover exercise once a year.

## Contacts

- Security officer: ___
- Privacy officer: ___
- AWS support: ___
- Legal counsel: ___
- HHS OCR portal: https://ocrportal.hhs.gov/ocr/breach/breach_form.jsf
