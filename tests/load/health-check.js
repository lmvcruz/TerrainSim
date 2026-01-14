import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration for /health endpoint baseline
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 concurrent users
    { duration: '1m', target: 10 },   // Stay at 10 users for 1 minute
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% of requests must complete within 200ms
    http_req_failed: ['rate<0.01'],    // Less than 1% of requests can fail
    errors: ['rate<0.01'],              // Less than 1% error rate
  },
};

const API_URL = __ENV.API_URL || 'https://api.lmvcruz.work';

export default function () {
  // Test /health endpoint
  const healthRes = http.get(`${API_URL}/health`);

  const healthCheck = check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 200ms': (r) => r.timings.duration < 200,
    'health has status field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!healthCheck);

  sleep(1); // 1 second between iterations per user
}
