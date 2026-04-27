# Load test plan

The realistic v1 traffic shape is **low concurrency, bursty PDF-heavy
workloads**: a single retired player typically uploads 10–80 medical
record PDFs over a few sessions, triggering OCR and LLM extraction in
the background. The site should feel snappy for foreground requests
and the queue should drain within minutes.

## Targets

| Metric | Target |
|---|---|
| Player landing page p95 | ≤ 300ms |
| Authenticated dashboard p95 | ≤ 600ms |
| `/api/claim/[id]/upload` p95 (presigned URL handoff) | ≤ 400ms |
| Document OCR + LLM extraction p95 (per page) | ≤ 8s |
| Reminder dispatch cron job | ≤ 60s for 1k pending reminders |
| Error rate (5xx) | < 0.1% |
| Audit-log write throughput | ≥ 50/s sustained |

## Tooling

- **HTTP**: k6 (`scripts/load/k6-baseline.js`)
- **Background queues**: a synthetic seeder that enqueues N OCR jobs
  and measures wall-clock time to drain.
- **Capacity planning**: AWS CloudWatch dashboards on RDS connections,
  S3 PUT latency, Textract throttle counts.

## Run the baseline

Local smoke test:

```bash
npm run dev
# in another terminal
k6 run -e BASE_URL=http://localhost:3000 scripts/load/k6-baseline.js
```

Staging:

```bash
k6 run -e BASE_URL=https://staging.example.com scripts/load/k6-baseline.js
```

## Scenarios beyond the baseline

1. **Authenticated dashboard surge**: 100 VUs with valid session cookies
   GET `/dashboard` for 10 minutes.
2. **Upload pipeline**: 25 concurrent users each uploading 10 PDFs over
   5 minutes. Measure queue drain.
3. **Reminder cron**: pre-load 5,000 due `Reminder` rows; trigger the
   dispatcher; measure end-to-end.
4. **Audit-log stress**: 200 RPS of write actions for 5 minutes;
   verify `verifyAuditChain()` still passes after.

## Open items before launch

- [ ] Wire k6 staging run into CI on a nightly cadence.
- [ ] Add OpenTelemetry tracing on the Inngest functions.
- [ ] Decide horizontal-scale strategy: serverless functions vs.
      long-lived workers, especially for OCR.
