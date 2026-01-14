import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const generationTime = new Trend('terrain_generation_duration');

// Test configuration for /generate endpoint
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 concurrent users (CPU-intensive operation)
    { duration: '2m', target: 5 },    // Stay at 5 users for 2 minutes
    { duration: '30s', target: 10 },  // Spike to 10 users
    { duration: '1m', target: 10 },   // Sustain 10 users
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests must complete within 2s
    http_req_failed: ['rate<0.05'],     // Less than 5% of requests can fail
    errors: ['rate<0.05'],               // Less than 5% error rate
    terrain_generation_duration: ['p(95)<1500'], // 95% under 1.5s
  },
};

const API_URL = __ENV.API_URL || 'https://api.lmvcruz.work';

// Test data: various terrain generation parameters
const testScenarios = [
  { seed: 12345, frequency: 0.05, amplitude: 1.0, octaves: 4, persistence: 0.5, lacunarity: 2.0 },
  { seed: 67890, frequency: 0.08, amplitude: 1.5, octaves: 6, persistence: 0.6, lacunarity: 2.2 },
  { seed: 11111, frequency: 0.03, amplitude: 2.0, octaves: 3, persistence: 0.4, lacunarity: 1.8 },
  { seed: 99999, frequency: 0.1, amplitude: 1.2, octaves: 5, persistence: 0.55, lacunarity: 2.0 },
];

export default function () {
  // Randomly select a test scenario
  const scenario = testScenarios[Math.floor(Math.random() * testScenarios.length)];

  const payload = JSON.stringify({
    width: 256,
    height: 256,
    ...scenario,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '10s',
  };

  const startTime = Date.now();
  const generateRes = http.post(`${API_URL}/generate`, payload, params);
  const duration = Date.now() - startTime;

  const generateCheck = check(generateRes, {
    'generation status is 200': (r) => r.status === 200,
    'generation response time < 2s': (r) => r.timings.duration < 2000,
    'generation returns data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && Array.isArray(body.data) && body.data.length === 256 * 256;
      } catch (e) {
        return false;
      }
    },
    'generation has metadata': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.width === 256 && body.height === 256;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!generateCheck);
  generationTime.add(duration);

  sleep(2); // 2 seconds between terrain generations
}
