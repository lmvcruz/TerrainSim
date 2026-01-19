/**
 * CI-Optimized Load Test Scenario
 *
 * This script is designed for continuous integration environments with shorter
 * test durations but comprehensive coverage of all critical endpoints.
 *
 * Duration: ~3 minutes total
 * Max concurrent users: 5 (lighter load for CI)
 *
 * Run: k6 run tests/load/ci-scenario.js
 * With custom API: k6 run tests/load/ci-scenario.js -e API_URL=http://localhost:3001
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics for tracking
const errorRate = new Rate('errors');
const healthDuration = new Trend('health_duration');
const generateDuration = new Trend('generate_duration');

// CI-optimized test configuration
export const options = {
  stages: [
    { duration: '30s', target: 3 },   // Ramp up to 3 concurrent users
    { duration: '1m30s', target: 5 }, // Increase to 5 users
    { duration: '30s', target: 3 },   // Scale back down
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    // Health endpoint should be very fast
    http_req_duration: ['p(95)<1000'],           // 95% of all requests < 1s
    'http_req_duration{endpoint:health}': ['p(95)<200'], // Health < 200ms
    'http_req_duration{endpoint:generate}': ['p(95)<2000'], // Generate < 2s

    // Error rates
    http_req_failed: ['rate<0.05'],              // Less than 5% failure rate
    errors: ['rate<0.05'],                       // Less than 5% error rate

    // Success rates per endpoint
    'checks{endpoint:health}': ['rate>0.95'],    // 95% success on health
    'checks{endpoint:generate}': ['rate>0.90'],  // 90% success on generate
  },
};

// API URL can be overridden via environment variable
const API_URL = __ENV.API_URL || 'https://api.lmvcruz.work';

// Terrain generation test data variations
const noiseTypes = ['perlin', 'simplex', 'fbm'];
const sizes = [256, 512];
const scales = [50, 100, 150];
const octaves = [4, 6, 8];

export default function () {
  // Test 1: Health Check (lightweight, should always work)
  const healthRes = http.get(`${API_URL}/health`, {
    tags: { endpoint: 'health' },
  });

  const healthCheck = check(
    healthRes,
    {
      'health: status is 200': (r) => r.status === 200,
      'health: has status field': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined;
        } catch (e) {
          return false;
        }
      },
    },
    { endpoint: 'health' }
  );

  healthDuration.add(healthRes.timings.duration);
  errorRate.add(!healthCheck);

  sleep(randomIntBetween(1, 2)); // Random pause between 1-2 seconds

  // Test 2: Terrain Generation (computational workload)
  const generatePayload = {
    noiseType: randomItem(noiseTypes),
    size: randomItem(sizes),
    scale: randomItem(scales),
    octaves: randomItem(octaves),
    persistence: 0.5,
    lacunarity: 2.0,
    seed: randomIntBetween(1, 10000),
  };

  const generateRes = http.post(
    `${API_URL}/generate`,
    JSON.stringify(generatePayload),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'generate' },
    }
  );

  const generateCheck = check(
    generateRes,
    {
      'generate: status is 200': (r) => r.status === 200,
      'generate: has heightmap data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.heightmap && Array.isArray(body.heightmap) && body.heightmap.length > 0;
        } catch (e) {
          return false;
        }
      },
      'generate: has statistics': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.statistics &&
                 typeof body.statistics.min === 'number' &&
                 typeof body.statistics.max === 'number';
        } catch (e) {
          return false;
        }
      },
    },
    { endpoint: 'generate' }
  );

  generateDuration.add(generateRes.timings.duration);
  errorRate.add(!generateCheck);

  sleep(randomIntBetween(2, 4)); // Random pause between 2-4 seconds
}

// Summary handler to export results
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data, null, 2),
  };
}

// Helper function for text summary
function textSummary(data, options) {
  const { indent = '', enableColors = false } = options || {};
  const c = enableColors ? {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
  } : { reset: '', green: '', red: '', yellow: '' };

  let summary = '\n';
  summary += `${indent}✓ checks.........................: ${c.green}${(data.metrics.checks.values.rate * 100).toFixed(2)}%${c.reset}\n`;
  summary += `${indent}  ✓ health checks................: ${(data.metrics['checks{endpoint:health}']?.values.rate * 100 || 0).toFixed(2)}%\n`;
  summary += `${indent}  ✓ generate checks..............: ${(data.metrics['checks{endpoint:generate}']?.values.rate * 100 || 0).toFixed(2)}%\n`;
  summary += `${indent}✗ errors........................: ${c.red}${(data.metrics.errors.values.rate * 100).toFixed(2)}%${c.reset}\n`;
  summary += `${indent}  http_req_duration..............: avg=${data.metrics.http_req_duration.values.avg.toFixed(2)}ms med=${data.metrics.http_req_duration.values.med.toFixed(2)}ms p(95)=${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}    ✓ health....................: p(95)=${(data.metrics['http_req_duration{endpoint:health}']?.values['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += `${indent}    ✓ generate..................: p(95)=${(data.metrics['http_req_duration{endpoint:generate}']?.values['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += `${indent}  http_req_failed...............: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}  http_reqs......................: ${data.metrics.http_reqs.values.count} (${data.metrics.http_reqs.values.rate.toFixed(2)}/s)\n`;
  summary += `${indent}  vus............................: ${data.metrics.vus.values.value} (max=${data.metrics.vus_max.values.value})\n`;

  return summary;
}
