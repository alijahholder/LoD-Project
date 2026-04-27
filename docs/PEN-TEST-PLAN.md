# Penetration Test Plan

## Objective

Validate the application's HIPAA-aligned security controls before production cut-over and at least annually thereafter.

## Scope

- Web application (player + admin) at `https://app.example.com` (production).
- API surface (authenticated and unauthenticated).
- AuthN/AuthZ (NextAuth credentials + TOTP MFA).
- File upload pipeline (S3 presigned, OCR, LLM extraction).
- Admin rubric / template editor.
- Generated artifacts (claim packets, appeal briefs).

Out of scope:

- AWS account-level configuration (covered in cloud security review).
- Vendor third-party services (covered by their SOC 2 / HITRUST).

## Methodology

Aligned with **OWASP Web Security Testing Guide v4.2** and **OWASP API Security Top 10 (2023)**. Engagement type: grey-box (tester is given a player + admin account, no source code).

### Key abuse cases

1. Session takeover after MFA — token replay, cookie theft, CSRF on sensitive POSTs.
2. IDOR — does player A see/edit player B's records? (claim, document, appeal, offset, payment, MRR, neutral exam).
3. Mass assignment — extra fields in PATCH bodies that escalate (e.g., role, claim status, finding points).
4. Storage path traversal in download endpoints (`/api/claim/[id]/packet/download/[docId]`).
5. SSRF via uploaded URLs / DocuSign callback.
6. PHI exposure in error messages, logs, or 4xx responses.
7. SQLi / Prisma raw query abuse — verify all string inputs are parameterized.
8. XSS via uploaded filename / OCR text / template body / brief Markdown.
9. CSRF on credential routes — sign-up, MFA enroll, password change.
10. Rate-limit bypass on sign-in/sign-up.
11. Audit log tampering (chain verification still passes after manual DB edit?).
12. ERISA submission integrity — does manifest hash detect a swapped exhibit?
13. AI prompt injection — can a malicious uploaded PDF cause the LLM to mis-map findings or exfiltrate?

## Reporting

Findings classified per CVSS v3.1. Critical/High require remediation before sign-off. Medium/Low tracked in security backlog with target dates.

## Cadence

- **Pre-launch**: full external test, ~2 weeks.
- **Annual**: full test.
- **Major-feature**: focused test (e.g. when adding new benefit type, new vendor, etc.).
- **After material incident**: re-test affected components.

## Vendors (suggested)

- NCC Group, Bishop Fox, Praetorian, Trail of Bits.

## Sign-off

- Engineering lead: ____ Date: ____
- Security officer: ____ Date: ____
- Tester / firm: ____ Report ID: ____
