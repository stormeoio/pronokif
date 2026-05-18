/**
 * k6 Load Test — Pronokif API
 *
 * Install: brew install k6
 *
 * Usage:
 *   k6 run scripts/load-test.js                          # default (20 VUs, 1min)
 *   k6 run --vus 50 --duration 5m scripts/load-test.js   # stress test
 *   BASE_URL=https://pronokif.stormeo.io k6 run scripts/load-test.js  # prod
 *
 * Thresholds:
 *   - p95 response time < 500ms
 *   - Error rate < 1%
 *   - Health check always < 200ms
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

export const options = {
  stages: [
    { duration: "10s", target: 10 }, // ramp up
    { duration: "40s", target: 20 }, // sustained load
    { duration: "10s", target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],  // 95th percentile < 500ms
    http_req_failed: ["rate<0.01"],    // <1% errors
    health_duration: ["p(95)<200"],    // health check fast
  },
};

// ── Custom metrics ──────────────────────────────────────────────────────────

const healthDuration = new Trend("health_duration");
const errorRate = new Rate("errors");

// ── Scenarios ───────────────────────────────────────────────────────────────

export default function () {
  // 1. Health check (every VU, every iteration)
  group("Health", () => {
    const res = http.get(`${BASE_URL}/api/health`);
    healthDuration.add(res.timings.duration);
    check(res, {
      "health 200": (r) => r.status === 200,
      "health has status": (r) => {
        try { return JSON.parse(r.body).status === "ok"; }
        catch { return false; }
      },
    }) || errorRate.add(1);
  });

  // 2. Readiness check (MongoDB ping)
  group("Readiness", () => {
    const res = http.get(`${BASE_URL}/api/readyz`);
    check(res, {
      "readyz 200": (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  // 3. Public data: races list
  group("Races", () => {
    const res = http.get(`${BASE_URL}/api/races`);
    check(res, {
      "races 200": (r) => r.status === 200,
      "races is array": (r) => {
        try { return Array.isArray(JSON.parse(r.body)); }
        catch { return false; }
      },
    }) || errorRate.add(1);
  });

  // 4. Public data: drivers list
  group("Drivers", () => {
    const res = http.get(`${BASE_URL}/api/drivers`);
    check(res, {
      "drivers 200": (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  // 5. Auth: login attempt (should return 401 with bad creds, not 500)
  group("Auth robustness", () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: "loadtest@example.com", password: "wrong" }),
      { headers: { "Content-Type": "application/json" } }
    );
    check(res, {
      "bad login not 500": (r) => r.status !== 500,
      "bad login returns 4xx": (r) => r.status >= 400 && r.status < 500,
    }) || errorRate.add(1);
  });

  // 6. Leaderboard (requires auth, should return 401 not crash)
  group("Leaderboard (unauth)", () => {
    const res = http.get(`${BASE_URL}/api/leaderboard/global`);
    check(res, {
      "leaderboard not 500": (r) => r.status !== 500,
    }) || errorRate.add(1);
  });

  sleep(1);
}

// ── Summary ─────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.["p(95)"] || 0;
  const errRate = data.metrics.http_req_failed?.values?.rate || 0;
  const total = data.metrics.http_reqs?.values?.count || 0;

  console.log("\n=== PRONOKIF LOAD TEST SUMMARY ===");
  console.log(`Total requests: ${total}`);
  console.log(`p95 latency: ${p95.toFixed(1)}ms`);
  console.log(`Error rate: ${(errRate * 100).toFixed(2)}%`);
  console.log(`Result: ${p95 < 500 && errRate < 0.01 ? "PASS" : "FAIL"}`);
  console.log("==================================\n");

  return {};
}
