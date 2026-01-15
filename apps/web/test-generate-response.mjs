#!/usr/bin/env node
/**
 * Simple test to check what /generate returns
 */

async function testGenerate() {
  console.log('Testing /generate endpoint...');

  try {
    const response = await fetch('http://localhost:3001/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        width: 256,
        height: 256,
        noiseType: 'perlin',
        seed: 12345,
        octaves: 4,
        persistence: 0.5,
        lacunarity: 2.0,
        scale: 100,
        zScale: 80
      })
    });

    const data = await response.json();
    console.log('Response keys:', Object.keys(data));
    console.log('Response:', JSON.stringify(data).substring(0, 200));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGenerate();
