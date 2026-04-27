/* eslint-disable */
/**
 * Baseline load profile for the LOD Servicing App.
 *
 * Run:
 *   k6 run -e BASE_URL=https://staging.example.com scripts/load/k6-baseline.js
 *
 * What it does:
 *   - Hits /api/health on a smooth ramp from 0 -> 50 -> 100 VUs over 6 minutes.
 *   - Hits the public landing page to exercise the edge cache + CSP path.
 *   - Validates p95 latency stays under 500ms for unauthenticated traffic.
 *
 * What it does NOT do:
 *   - Does NOT submit PHI. Authenticated flows must be tested with seeded
 *     non-production data only and a separate scenario.
 */

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    health: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 },
        { duration: "3m", target: 100 },
        { duration: "1m", target: 100 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<1500"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const r1 = http.get(`${BASE}/api/health`);
  check(r1, {
    "health 200": (r) => r.status === 200,
    "health body ok": (r) => {
      try {
        return JSON.parse(r.body).ok === true;
      } catch {
        return false;
      }
    },
  });

  const r2 = http.get(`${BASE}/`);
  check(r2, {
    "landing 200": (r) => r.status === 200,
  });

  sleep(1);
}
