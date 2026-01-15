#!/usr/bin/env node
/**
 * Test script for /generate API endpoint
 * Validates backend response and data structure
 */

const API_URL = 'http://localhost:3001/generate';

async function testGenerateAPI() {
  console.log('🧪 Testing /generate API endpoint...\n');

  const testCases = [
    {
      name: 'Perlin Noise',
      payload: {
        method: 'perlin',
        width: 256,
        height: 256,
        seed: 12345,
        frequency: 0.05,
        amplitude: 50,
      },
    },
    {
      name: 'FBM Noise',
      payload: {
        method: 'fbm',
        width: 256,
        height: 256,
        seed: 12345,
        frequency: 0.05,
        amplitude: 50,
        octaves: 4,
        persistence: 0.5,
        lacunarity: 2.0,
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`   Payload:`, JSON.stringify(testCase.payload, null, 2));

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.payload),
      });

      console.log(`   Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error(`   ❌ FAILED: ${errorData.error}`);
        continue;
      }

      const data = await response.json();

      // Validate response structure
      const validations = {
        'Has data field': data.data !== undefined,
        'Has width field': data.width === testCase.payload.width,
        'Has height field': data.height === testCase.payload.height,
        'Data is array': Array.isArray(data.data),
        'Data length correct': data.data.length === testCase.payload.width * testCase.payload.height,
        'Has statistics': data.statistics !== undefined,
        'Has min/max': data.statistics?.min !== undefined && data.statistics?.max !== undefined,
      };

      let allPassed = true;
      for (const [check, passed] of Object.entries(validations)) {
        const icon = passed ? '✅' : '❌';
        console.log(`   ${icon} ${check}`);
        if (!passed) allPassed = false;
      }

      if (allPassed) {
        console.log(`   📊 Statistics:`, data.statistics);
        console.log(`   ✅ Test PASSED\n`);
      } else {
        console.log(`   ❌ Test FAILED\n`);
      }
    } catch (error) {
      console.error(`   ❌ ERROR: ${error.message}\n`);
    }
  }
}

testGenerateAPI().catch(console.error);
