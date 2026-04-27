# Load Test Plan

## Targets

| Metric | Target |
|---|---|
| p95 page latency (authenticated) | ≤ 600 ms |
| p99 page latency | ≤ 1500 ms |
| OCR job throughput | ≥ 30 docs/min sustained, 90 docs/min burst |
| LLM extraction p95 | ≤ 12 s per document |
| Submission packet generation | ≤ 8 s p95 |
| 5xx rate at peak | < 0.1% |
| Concurrent active sessions | 500 (initial), 5000 (mature) |

## Workload model

- 70% browse / read — dashboard, claim view, timeline, records.
- 15% upload — PDF 1–25 MB, mostly 2–8 MB.
- 5% finding review (approve/edit/reject).
- 5% record-request follow-ups.
- 3% packet generation + e-sign.
- 2% admin (rubric edit, audit verify).

## Tooling

- **k6** for HTTP load (scripted in `loadtests/`).
- **Artillery** for queue/jobs simulation.
- **Locust** acceptable alternative if team prefers Python.
- **AWS Distributed Load Testing** for very large bursts.

## Environments

- Staging mirrors production sizing: same RDS instance class, same S3 bucket type, same Vercel plan.
- Synthetic PHI only — never use real PHI in load tests.

## Test scenarios

1. **Baseline ramp** — 0 → 500 VUs over 10 min, hold 30 min, ramp down.
2. **Peak burst** — 0 → 2000 VUs over 1 min, hold 5 min.
3. **Soak** — 200 VUs for 4 hours; watch for memory/connection leaks.
4. **Background pipeline saturation** — push 500 docs into the OCR queue at once; assert no DB deadlocks.
5. **Failure injection** — kill a worker, throttle S3, inject 500ms of latency on RDS reads.

## Acceptance criteria

- All metrics in the Targets table met.
- No PHI leaked in error responses.
- Audit chain verifies clean post-test.
- RDS CPU < 70%, connection pool < 80%, S3 throttling = 0.

## Sign-off

- Engineering lead: ____ Date: ____
- DevOps: ____ Date: ____
