/**
 * Spike Test Scenario
 *
 * This script simulates sudden traffic spikes to evaluate system behavior
 * during rapid load increases. Tests auto-scaling and recovery capabilities.
 *
 * Duration: ~5 minutes
 * Pattern: Baseline → Sudden spike → Recovery
 *
 * Run: k6 run tests/load/spike-test.js
 * With custom API: k6 run tests/load/spike-test.js -e API_URL=http://localhost:3001
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const spikeErrors = new Rate('spike_errors');
const baselineErrors = new Rate('baseline_errors');
const recoveryErrors = new Rate('recovery_errors');
const healthDuration = new Trend('health_duration');
const generateDuration = new Trend('generate_duration');

// Spike test configuration
export const options = {
  stages: [
    // Establish baseline
    { duration: '1m', target: 5 },      // Normal traffic baseline
    { duration: '30s', target: 5 },     // Sustained baseline

    // Sudden spike
    { duration: '10s', target: 50 },    // Rapid spike to 50 users
    { duration: '1m', target: 50 },     // Sustain spike
    { duration: '10s', target: 5 },     // Quick drop

    // Recovery period
    { duration: '1m', target: 5 },      // Monitor recovery

    // Second smaller spike
    { duration: '15s', target: 30 },    // Secondary spike
    { duration: '30s', target: 30 },    // Brief sustain
    { duration: '15s', target: 5 },     // Drop back

    // Final recovery
    { duration: '30s', target: 5 },     // Final baseline
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    // Allow degradation during spike but expect recovery
    http_req_duration: ['p(95)<3000'],
    'http_req_duration{endpoint:health}': ['p(95)<800'],
    'http_req_duration{endpoint:generate}': ['p(95)<6000'],

    // Higher error tolerance during spike
    http_req_failed: ['rate<0.15'],              // Allow 15% failure during spike
    errors: ['rate<0.15'],

    // Baseline periods should perform well
    baseline_errors: ['rate<0.05'],              // Baseline should be under 5%
    recovery_errors: ['rate<0.08'],              // Recovery should improve

    'checks{endpoint:health}': ['rate>0.80'],
    'checks{endpoint:generate}': ['rate>0.70'],
  },
};

const API_URL = __ENV.API_URL || 'https://api.lmvcruz.work';

// Test data
const noiseTypes = ['perlin', 'simplex', 'fbm'];
const sizes = [128, 256, 512];
const scales = [50, 100, 150];
const octaves = [4, 6, 8];

// Track which phase we're in
function getCurrentPhase() {
  const elapsed = __ITER * 3; // Rough approximation
  if (elapsed < 90) return 'baseline';
  if (elapsed < 160) return 'spike';
  if (elapsed < 220) return 'recovery';
  if (elapsed < 265) return 'spike2';
  return 'recovery';
}

export default function () {
  const phase = getCurrentPhase();
  const currentVus = __VU;

  // Health check
  const healthRes = http.get(`${API_URL}/health`, {
    tags: {
      endpoint: 'health',
      phase: phase,
    },
  });

  const healthCheck = check(
    healthRes,
    {
      'health: status is 200': (r) => r.status === 200,
      'health: has valid response': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined;
        } catch (e) {
          return false;
        }
      },
    },
    { endpoint: 'health', phase: phase }
  );

  healthDuration.add(healthRes.timings.duration, { phase: phase });

  // Track errors by phase
  const healthError = !healthCheck;
  errorRate.add(healthError);
  if (phase === 'baseline') baselineErrors.add(healthError);
  if (phase === 'spike' || phase === 'spike2') spikeErrors.add(healthError);
  if (phase === 'recovery') recoveryErrors.add(healthError);

  sleep(randomIntBetween(1, 2));

  // Terrain generation
  const generatePayload = {
    noiseType: randomItem(noiseTypes),
    size: randomItem(sizes),
    scale: randomItem(scales),
    octaves: randomItem(octaves),
    persistence: 0.5,
    lacunarity: 2.0,
    seed: randomIntBetween(1, 50000),
  };

  const generateRes = http.post(
    `${API_URL}/generate`,
    JSON.stringify(generatePayload),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: {
        endpoint: 'generate',
        phase: phase,
      },
      timeout: '20s',
    }
  );

  const generateCheck = check(
    generateRes,
    {
      'generate: successful status': (r) => r.status === 200 || r.status === 202,
      'generate: no server crash': (r) => r.status !== 500 && r.status !== 502 && r.status !== 503,
      'generate: has response': (r) => r.body !== null && r.body !== undefined,
    },
    { endpoint: 'generate', phase: phase }
  );

  generateDuration.add(generateRes.timings.duration, { phase: phase });

  const generateError = !generateCheck;
  errorRate.add(generateError);
  if (phase === 'baseline') baselineErrors.add(generateError);
  if (phase === 'spike' || phase === 'spike2') spikeErrors.add(generateError);
  if (phase === 'recovery') recoveryErrors.add(generateError);

  // Adjust sleep based on load
  const sleepTime = currentVus > 40 ? randomIntBetween(1, 2) : randomIntBetween(2, 4);
  sleep(sleepTime);
}

export function handleSummary(data) {
  console.log('\n=== Spike Test Summary ===');

  // Overall metrics
  const totalReqs = data.metrics.http_reqs.values.count;
  const overallErrorRate = data.metrics.http_req_failed.values.rate * 100;
  const avgRps = data.metrics.http_reqs.values.rate;
  const p95Latency = data.metrics.http_req_duration.values['p(95)'];

  console.log(`\nOverall Performance:`);
  console.log(`  Total Requests: ${totalReqs}`);
  console.log(`  Average RPS: ${avgRps.toFixed(2)}`);
  console.log(`  P95 Latency: ${p95Latency.toFixed(2)}ms`);
  console.log(`  Overall Error Rate: ${overallErrorRate.toFixed(2)}%`);

  // Phase-specific analysis
  console.log(`\nPhase Analysis:`);
  const baselineErrorRate = (data.metrics.baseline_errors?.values.rate || 0) * 100;
  const spikeErrorRate = (data.metrics.spike_errors?.values.rate || 0) * 100;
  const recoveryErrorRate = (data.metrics.recovery_errors?.values.rate || 0) * 100;

  console.log(`  Baseline Error Rate: ${baselineErrorRate.toFixed(2)}%`);
  console.log(`  Spike Error Rate: ${spikeErrorRate.toFixed(2)}%`);
  console.log(`  Recovery Error Rate: ${recoveryErrorRate.toFixed(2)}%`);

  // Evaluation
  console.log(`\n=== Spike Resilience Evaluation ===`);

  if (baselineErrorRate < 5) {
    console.log('✅ Baseline performance was stable');
  } else {
    console.log('⚠️  Baseline showed unexpected errors');
  }

  if (spikeErrorRate < 15) {
    console.log('✅ System handled spike reasonably well');
  } else if (spikeErrorRate < 25) {
    console.log('⚠️  System struggled during spike but remained operational');
  } else {
    console.log('❌ System severely degraded during spike');
  }

  if (recoveryErrorRate < baselineErrorRate + 3) {
    console.log('✅ System recovered to near-baseline performance');
  } else if (recoveryErrorRate < baselineErrorRate + 8) {
    console.log('⚠️  System partially recovered (some lingering issues)');
  } else {
    console.log('❌ System failed to recover properly');
  }

  // Auto-scaling evaluation
  const recoveryTime = recoveryErrorRate < baselineErrorRate + 5 ? 'Fast (<30s)' : 'Slow (>30s)';
  console.log(`\nRecovery Time: ${recoveryTime}`);

  if (overallErrorRate < 10) {
    console.log('\n✅ PASS: System demonstrated good spike resilience');
  } else if (overallErrorRate < 15) {
    console.log('\n⚠️  PARTIAL: System survived spike but needs optimization');
  } else {
    console.log('\n❌ FAIL: System needs significant improvements for spike handling');
  }

  return {
    'stdout': textSummary(data),
    'spike-test-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  return `
Spike Test Results
==================
Duration: ${(data.state.testRunDurationMs / 1000).toFixed(0)}s
Max Virtual Users: ${data.metrics.vus_max.values.value}

Request Summary:
  Total Requests: ${data.metrics.http_reqs.values.count}
  Average RPS: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s
  Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%

Latency Analysis:
  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
  Median: ${data.metrics.http_req_duration.values.med.toFixed(2)}ms
  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms

Phase-Specific Error Rates:
  Baseline: ${((data.metrics.baseline_errors?.values.rate || 0) * 100).toFixed(2)}%
  Spike: ${((data.metrics.spike_errors?.values.rate || 0) * 100).toFixed(2)}%
  Recovery: ${((data.metrics.recovery_errors?.values.rate || 0) * 100).toFixed(2)}%

Endpoint Performance:
  Health (P95): ${(data.metrics['http_req_duration{endpoint:health}']?.values['p(95)'] || 0).toFixed(2)}ms
  Generate (P95): ${(data.metrics['http_req_duration{endpoint:generate}']?.values['p(95)'] || 0).toFixed(2)}ms
`;
}
