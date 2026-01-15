/**
 * Integration tests for Job-Based Pipeline System API
 * TEST-204: End-to-end testing of create → validate → execute flow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Sample valid configuration for testing
const validConfig = {
  totalFrames: 10,
  width: 256,
  height: 256,
  step0: {
    method: "Perlin",
    seed: 12345,
    frequency: 0.05,
    amplitude: 1.0
  },
  jobs: [
    {
      id: "job-1",
      name: "Initial Erosion",
      startFrame: 1,
      endFrame: 5,
      enabled: true,
      step: "HydraulicErosion",
      config: {
        numParticles: 1000,
        maxIterations: 30,
        erosionRadius: 3,
        inertia: 0.05,
        sedimentCapacityFactor: 4.0,
        minSedimentCapacity: 0.01,
        erodeSpeed: 0.3,
        depositSpeed: 0.3,
        evaporateSpeed: 0.01,
        gravity: 4.0,
        maxDropletSpeed: 10.0
      }
    },
    {
      id: "job-2",
      name: "Final Smoothing",
      startFrame: 6,
      endFrame: 10,
      enabled: true,
      step: "HydraulicErosion",
      config: {
        numParticles: 500,
        maxIterations: 20,
        erosionRadius: 2,
        inertia: 0.1,
        sedimentCapacityFactor: 3.0,
        minSedimentCapacity: 0.01,
        erodeSpeed: 0.2,
        depositSpeed: 0.4,
        evaporateSpeed: 0.01,
        gravity: 4.0,
        maxDropletSpeed: 10.0
      }
    }
  ]
};

// Invalid configuration with gaps
const invalidConfig = {
  totalFrames: 10,
  width: 256,
  height: 256,
  step0: {
    method: "Perlin",
    seed: 12345,
    frequency: 0.05,
    amplitude: 1.0
  },
  jobs: [
    {
      id: "job-1",
      name: "Partial Coverage",
      startFrame: 1,
      endFrame: 5,
      enabled: true,
      step: "HydraulicErosion",
      config: {
        numParticles: 1000,
        maxIterations: 30,
        erosionRadius: 3,
        inertia: 0.05,
        sedimentCapacityFactor: 4.0,
        minSedimentCapacity: 0.01,
        erodeSpeed: 0.3,
        depositSpeed: 0.3,
        evaporateSpeed: 0.01,
        gravity: 4.0,
        maxDropletSpeed: 10.0
      }
    }
    // Missing frames 6-10 (gap in coverage)
  ]
};

const API_URL = 'http://localhost:3001';

describe('Job-Based Pipeline System API', () => {
  describe('POST /config/validate', () => {
    it('should validate a correct configuration', async () => {
      const response = await fetch(`${API_URL}/config/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validConfig)
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.isValid).toBe(true);
      expect(result.uncoveredFrames).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should detect gaps in frame coverage', async () => {
      const response = await fetch(`${API_URL}/config/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidConfig)
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.isValid).toBe(false);
      expect(result.uncoveredFrames.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid request body', async () => {
      const response = await fetch(`${API_URL}/config/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' })
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /simulate/create', () => {
    it('should create a new simulation session', async () => {
      const response = await fetch(`${API_URL}/simulate/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validConfig)
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.sessionId).toBeDefined();
      expect(typeof result.sessionId).toBe('string');
      expect(result.width).toBe(256);
      expect(result.height).toBe(256);
      expect(result.initialTerrain).toBeDefined();
      expect(result.initialTerrain.length).toBe(256 * 256);
    });

    it('should reject invalid configuration', async () => {
      const response = await fetch(`${API_URL}/simulate/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidConfig)
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /simulate/execute', () => {
    let sessionId: string;

    beforeAll(async () => {
      // Create a session first
      const createResponse = await fetch(`${API_URL}/simulate/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validConfig)
      });

      const createResult = await createResponse.json();
      sessionId = createResult.sessionId;
    });

    afterAll(async () => {
      // Clean up session
      if (sessionId) {
        await fetch(`${API_URL}/simulate/session/${sessionId}`, {
          method: 'DELETE'
        });
      }
    });

    it('should execute a single frame', async () => {
      const response = await fetch(`${API_URL}/simulate/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, frame: 1 })
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.sessionId).toBe(sessionId);
      expect(result.frame).toBe(1);
      expect(result.terrain).toBeDefined();
      expect(result.terrain.length).toBe(256 * 256);
    });

    it('should execute multiple frames sequentially', async () => {
      const frames = [2, 3, 4];

      for (const frame of frames) {
        const response = await fetch(`${API_URL}/simulate/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, frame })
        });

        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.frame).toBe(frame);
      }
    });

    it('should reject invalid session ID', async () => {
      const response = await fetch(`${API_URL}/simulate/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'invalid-id', frame: 1 })
      });

      expect(response.status).toBe(404);
    });

    it('should reject invalid frame number', async () => {
      const response = await fetch(`${API_URL}/simulate/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, frame: 0 })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /simulate/session/:id', () => {
    it('should delete an existing session', async () => {
      // Create a session
      const createResponse = await fetch(`${API_URL}/simulate/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validConfig)
      });

      const createResult = await createResponse.json();
      const sessionId = createResult.sessionId;

      // Delete it
      const deleteResponse = await fetch(`${API_URL}/simulate/session/${sessionId}`, {
        method: 'DELETE'
      });

      expect(deleteResponse.status).toBe(200);

      // Verify it's gone
      const executeResponse = await fetch(`${API_URL}/simulate/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, frame: 1 })
      });

      expect(executeResponse.status).toBe(404);
    });
  });

  describe('Configuration Management', () => {
    let configId: string;

    it('should save a configuration', async () => {
      const response = await fetch(`${API_URL}/config/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Configuration',
          config: validConfig
        })
      });

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Configuration');

      configId = result.id;
    });

    it('should load a saved configuration', async () => {
      const response = await fetch(`${API_URL}/config/load/${configId}`);

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.id).toBe(configId);
      expect(result.name).toBe('Test Configuration');
      expect(result.config).toMatchObject(validConfig);
    });

    it('should list all configurations', async () => {
      const response = await fetch(`${API_URL}/config/list`);

      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.configs).toBeDefined();
      expect(Array.isArray(result.configs)).toBe(true);
      expect(result.configs.length).toBeGreaterThan(0);
    });
  });
});
