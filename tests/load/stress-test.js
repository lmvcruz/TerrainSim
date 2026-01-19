/**
 * Stress Test Scenario
 *
 * This script gradually increases load to identify system limits and breaking points.
 * It helps determine the maximum capacity before performance degrades significantly.
 *
 * Duration: ~10 minutes
 * Max concurrent users: 50
 *
 * Run: k6 run tests/load/stress-test.js
 * With custom API: k6 run tests/load/stress-test.js -e API_URL=http://localhost:3001
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const healthDuration = new Trend('health_duration');
const generateDuration = new Trend('generate_duration');
const totalRequests = new Counter('total_requests');

// Stress test configuration - progressive load increase
export const options = {
  stages: [
    { duration: '1m', target: 5 },    // Start with 5 users
    { duration: '2m', target: 10 },   // Increase to 10 users
    { duration: '2m', target: 20 },   // Increase to 20 users
    { duration: '2m', target: 35 },   // Increase to 35 users
    { duration: '1m', target: 50 },   // Push to 50 users
    { duration: '3m', target: 50 },   // Sustain at 50 users (stress period)
    { duration: '2m', target: 10 },   // Gradual recovery
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // More relaxed thresholds for stress testing
    http_req_duration: ['p(95)<3000'],           // 95% under 3s
    'http_req_duration{endpoint:health}': ['p(95)<500'],
    'http_req_duration{endpoint:generate}': ['p(95)<5000'],

    // Allow higher error rate during stress
    http_req_failed: ['rate<0.10'],              // Less than 10% failure
    errors: ['rate<0.10'],

    // Reduced success rate requirements
    'checks{endpoint:health}': ['rate>0.85'],
    'checks{endpoint:generate}': ['rate>0.75'],
  },
};

const API_URL = __ENV.API_URL || 'https://api.lmvcruz.work';

// Test data variations
const noiseTypes = ['perlin', 'simplex', 'fbm'];
const sizes = [128, 256, 512, 1024];  // Include larger sizes for stress
const scales = [25, 50, 100, 150, 200];
const octaves = [2, 4, 6, 8, 10];  // Include more octaves for heavier processing

export default function () {
  totalRequests.add(1);

  // Health check (every iteration)
  const healthRes = http.get(`${API_URL}/health`, {
    tags: { endpoint: 'health' },
  });

  const healthCheck = check(
    healthRes,
    {
      'health: status is 200': (r) => r.status === 200,
      'health: responds quickly': (r) => r.timings.duration < 1000,
    },
    { endpoint: 'health' }
  );

  healthDuration.add(healthRes.timings.duration);
  errorRate.add(!healthCheck);

  sleep(randomIntBetween(1, 2));

  // Terrain generation - mix of simple and complex requests
  const isComplexRequest = Math.random() > 0.7; // 30% complex requests

  const generatePayload = {
    noiseType: randomItem(noiseTypes),
    size: isComplexRequest ? randomItem([512, 1024]) : randomItem([128, 256]),
    scale: randomItem(scales),
    octaves: isComplexRequest ? randomItem([8, 10]) : randomItem([2, 4, 6]),
    persistence: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
    lacunarity: Math.random() * 2 + 1.5,    // 1.5 to 3.5
    seed: randomIntBetween(1, 100000),
  };

  const generateRes = http.post(
    `${API_URL}/generate`,
    JSON.stringify(generatePayload),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: {
        endpoint: 'generate',
        complexity: isComplexRequest ? 'high' : 'low',
      },
      timeout: '30s', // Longer timeout for stress test
    }
  );

  const generateCheck = check(
    generateRes,
    {
      'generate: status is successful': (r) => r.status === 200 || r.status === 202,
      'generate: no server errors': (r) => r.status < 500,
      'generate: has response body': (r) => r.body && r.body.length > 0,
    },
    { endpoint: 'generate' }
  );

  generateDuration.add(generateRes.timings.duration);
  errorRate.add(!generateCheck);

  // Variable sleep based on system load
  const currentVus = __VU;
  const sleepTime = currentVus < 20 ? randomIntBetween(2, 4) : randomIntBetween(1, 2);
  sleep(sleepTime);
}

export function handleSummary(data) {
  // Calculate additional stress test metrics
  const failedRequests = data.metrics.http_req_failed.values.count;
  const totalReqs = data.metrics.http_reqs.values.count;
  const avgLatency = data.metrics.http_req_duration.values.avg;
  const p95Latency = data.metrics.http_req_duration.values['p(95)'];
  const maxVus = data.metrics.vus_max.values.value;

  console.log('\n=== Stress Test Summary ===');
  console.log(`Total Requests: ${totalReqs}`);
  console.log(`Failed Requests: ${failedRequests} (${((failedRequests / totalReqs) * 100).toFixed(2)}%)`);
  console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`P95 Latency: ${p95Latency.toFixed(2)}ms`);
  console.log(`Max Virtual Users: ${maxVus}`);
  console.log(`Average RPS: ${data.metrics.http_reqs.values.rate.toFixed(2)}`);

  // Stress test evaluation
  console.log('\n=== System Capacity Analysis ===');
  if (data.metrics.http_req_failed.values.rate < 0.05) {
    console.log('✅ System handled stress load with minimal errors (<5%)');
  } else if (data.metrics.http_req_failed.values.rate < 0.10) {
    console.log('⚠️  System showed some degradation under stress (5-10% errors)');
  } else {
    console.log('❌ System struggled under stress load (>10% errors)');
  }

  if (p95Latency < 2000) {
    console.log('✅ Response times remained acceptable under load');
  } else if (p95Latency < 3000) {
    console.log('⚠️  Response times degraded but stayed within limits');
  } else {
    console.log('❌ Response times exceeded acceptable thresholds');
  }

  return {
    'stdout': textSummary(data),
    'stress-test-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  return `
Stress Test Results
===================
Duration: ${(data.state.testRunDurationMs / 1000).toFixed(0)}s
Virtual Users (max): ${data.metrics.vus_max.values.value}

Request Metrics:
  Total Requests: ${data.metrics.http_reqs.values.count}
  Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s
  Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%

Latency:
  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
  Median: ${data.metrics.http_req_duration.values.med.toFixed(2)}ms
  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

Endpoint Breakdown:
  Health: P95 = ${(data.metrics['http_req_duration{endpoint:health}']?.values['p(95)'] || 0).toFixed(2)}ms
  Generate: P95 = ${(data.metrics['http_req_duration{endpoint:generate}']?.values['p(95)'] || 0).toFixed(2)}ms

Success Rates:
  Overall: ${(data.metrics.checks.values.rate * 100).toFixed(2)}%
  Health: ${((data.metrics['checks{endpoint:health}']?.values.rate || 0) * 100).toFixed(2)}%
  Generate: ${((data.metrics['checks{endpoint:generate}']?.values.rate || 0) * 100).toFixed(2)}%
`;
}
