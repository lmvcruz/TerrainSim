import http from 'k6/http';
import { WebSocket } from 'k6/experimental/websockets';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const framesReceived = new Counter('frames_received');
const endToEndLatency = new Trend('end_to_end_latency');

// Comprehensive test: health check → generate terrain → run erosion
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 concurrent users
    { duration: '2m', target: 5 },    // Stay at 5 users
    { duration: '30s', target: 10 },  // Spike to 10 users
    { duration: '1m', target: 10 },   // Sustain spike
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.1'],
    end_to_end_latency: ['p(95)<35000'], // Full workflow under 35s for 95%
    frames_received: ['count>50'],
  },
};

const API_URL = __ENV.API_URL || 'https://api.lmvcruz.work';
const WS_URL = __ENV.WS_URL || 'wss://api.lmvcruz.work';

export default function () {
  const workflowStartTime = Date.now();
  let workflowSuccess = true;

  // Step 1: Health check
  const healthRes = http.get(`${API_URL}/health`);
  if (!check(healthRes, { 'health OK': (r) => r.status === 200 })) {
    errorRate.add(1);
    workflowSuccess = false;
    return; // Skip rest of workflow
  }

  sleep(0.5);

  // Step 2: Generate terrain
  const generatePayload = JSON.stringify({
    width: 256,
    height: 256,
    seed: Math.floor(Math.random() * 100000),
    frequency: 0.05,
    amplitude: 1.0,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2.0,
  });

  const generateRes = http.post(`${API_URL}/generate`, generatePayload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  });

  if (!check(generateRes, {
    'generation OK': (r) => r.status === 200,
    'generation has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.length === 256 * 256;
      } catch (e) {
        return false;
      }
    },
  })) {
    errorRate.add(1);
    workflowSuccess = false;
    return;
  }

  sleep(1);

  // Step 3: Run erosion simulation via WebSocket
  let frameCount = 0;
  let wsError = false;

  const ws = new WebSocket(`${WS_URL}/socket.io/?EIO=4&transport=websocket`);

  ws.addEventListener('open', () => {
    ws.send('40'); // Socket.io handshake

    setTimeout(() => {
      const simulationRequest = JSON.stringify([
        'simulate',
        {
          width: 256,
          height: 256,
          seed: Math.floor(Math.random() * 100000),
          frequency: 0.05,
          amplitude: 1.0,
          octaves: 4,
          erosionParams: {
            droplets: 5000, // Reduced for faster testing
            erosionRadius: 3,
            inertia: 0.3,
            sedimentCapacityFactor: 3.0,
            minSedimentCapacity: 0.01,
            depositSpeed: 0.3,
            erodeSpeed: 0.3,
            evaporateSpeed: 0.01,
            gravity: 4.0,
            maxDropletLifetime: 30,
            initialWaterVolume: 1.0,
            initialSpeed: 1.0,
          },
        },
      ]);
      ws.send(`42${simulationRequest}`);
    }, 100);
  });

  ws.addEventListener('message', (event) => {
    if (typeof event.data === 'string' && event.data.startsWith('42')) {
      try {
        const payload = JSON.parse(event.data.substring(2));
        const eventName = payload[0];

        if (eventName === 'terrain-frame') {
          frameCount++;
          framesReceived.add(1);
        }

        if (eventName === 'simulation-complete') {
          const workflowDuration = Date.now() - workflowStartTime;
          endToEndLatency.add(workflowDuration);
          ws.close();
        }
      } catch (e) {
        wsError = true;
      }
    }
  });

  ws.addEventListener('error', () => {
    wsError = true;
  });

  ws.setTimeout(() => {
    if (!wsError && frameCount > 0) {
      const workflowDuration = Date.now() - workflowStartTime;
      endToEndLatency.add(workflowDuration);
    } else {
      errorRate.add(1);
      workflowSuccess = false;
    }

    if (ws.readyState !== 3) {
      ws.close();
    }
  }, 25000); // 25 second timeout

  check(null, {
    'complete workflow succeeded': () => workflowSuccess && !wsError && frameCount > 0,
  });

  sleep(3); // Cooldown between iterations
}
