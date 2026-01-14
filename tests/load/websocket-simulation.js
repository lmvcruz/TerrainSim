import { WebSocket } from 'k6/experimental/websockets';
import { check } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('ws_errors');
const framesReceived = new Counter('ws_frames_received');
const connectionTime = new Trend('ws_connection_duration');
const firstFrameLatency = new Trend('ws_first_frame_latency');

// Test configuration for WebSocket /simulate endpoint
export const options = {
  stages: [
    { duration: '20s', target: 3 },   // Ramp up to 3 concurrent simulations
    { duration: '1m', target: 3 },    // Stay at 3 simulations
    { duration: '20s', target: 5 },   // Spike to 5 simulations
    { duration: '1m', target: 5 },    // Sustain 5 simulations
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    ws_errors: ['rate<0.1'],                    // Less than 10% error rate
    ws_connection_duration: ['p(95)<500'],      // 95% of connections under 500ms
    ws_first_frame_latency: ['p(95)<1000'],     // 95% first frame under 1s
    ws_frames_received: ['count>100'],          // At least 100 frames received total
  },
};

const WS_URL = __ENV.WS_URL || 'wss://api.lmvcruz.work';

export default function () {
  const startTime = Date.now();
  let connectionEstablished = false;
  let firstFrameReceived = false;
  let frameCount = 0;
  let hasError = false;

  const ws = new WebSocket(`${WS_URL}/socket.io/?EIO=4&transport=websocket`);

  ws.addEventListener('open', () => {
    connectionEstablished = true;
    const connectionDuration = Date.now() - startTime;
    connectionTime.add(connectionDuration);

    // Send Socket.io handshake (EIO v4)
    ws.send('40');

    // Wait for handshake response, then send simulation request
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
            droplets: 10000,
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
    // Socket.io protocol: messages start with packet type
    // 42 = event, 43 = ack
    if (typeof event.data === 'string' && event.data.startsWith('42')) {
      try {
        const payload = JSON.parse(event.data.substring(2));
        const eventName = payload[0];

        if (eventName === 'terrain-frame') {
          frameCount++;
          framesReceived.add(1);

          if (!firstFrameReceived) {
            firstFrameReceived = true;
            const firstFrameDuration = Date.now() - startTime;
            firstFrameLatency.add(firstFrameDuration);
          }

          const frameData = payload[1];
          check(frameData, {
            'frame has data': (f) => f && f.data && Array.isArray(f.data),
            'frame has metadata': (f) => f && f.width && f.height,
          });
        }

        if (eventName === 'simulation-complete') {
          ws.close();
        }
      } catch (e) {
        hasError = true;
        errorRate.add(1);
      }
    }
  });

  ws.addEventListener('error', (event) => {
    hasError = true;
    errorRate.add(1);
  });

  ws.addEventListener('close', () => {
    if (!connectionEstablished) {
      hasError = true;
      errorRate.add(1);
    }
  });

  // Wait for simulation to complete or timeout
  ws.setTimeout(() => {
    check(null, {
      'simulation completed successfully': () => !hasError && frameCount > 0,
      'received multiple frames': () => frameCount >= 5,
    });

    if (ws.readyState !== 3) { // 3 = CLOSED
      ws.close();
    }
  }, 30000); // 30 second timeout
}
