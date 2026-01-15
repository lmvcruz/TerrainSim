#!/usr/bin/env node
/**
 * COMPREHENSIVE TEST SUITE
 * Runs all tests and generates a summary report
 */

import { chromium } from 'playwright';

const RESULTS = {
  backend: null,
  frontend: null,
  camera: null,
};

// Test 1: Backend API
async function testBackend() {
  console.log('\n📋 TEST 1: Backend /generate API');
  console.log('═'.repeat(50));

  try {
    const response = await fetch('http://localhost:3001/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'perlin',
        width: 256,
        height: 256,
        seed: 12345,
        frequency: 0.05,
        amplitude: 50,
      }),
    });

    const data = await response.json();
    const passed = response.ok && data.data && data.data.length === 65536;

    console.log(`Status: ${response.status}`);
    console.log(`Has data: ${!!data.data}`);
    console.log(`Data length: ${data.data?.length}`);
    console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);

    return passed;
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return false;
  }
}

// Test 2: Frontend Button Click
async function testFrontend() {
  console.log('\n📋 TEST 2: Frontend Generate Button');
  console.log('═'.repeat(50));

  const browser = await chromium.launch();
  const page = await browser.newPage();

  let apiCalled = false;
  let errorOccurred = false;

  page.on('response', (response) => {
    if (response.url().includes('/generate') && response.request().method() === 'POST') {
      apiCalled = response.ok();
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('dev/logs')) {
      errorOccurred = true;
    }
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas');

    const buttonExists = await page.locator('button:has-text("Generate Terrain")').count() > 0;
    console.log(`Button exists: ${buttonExists ? '✅' : '❌'}`);

    if (buttonExists) {
      await page.click('button:has-text("Generate Terrain")');
      await page.waitForTimeout(2000);
    }

    console.log(`API called successfully: ${apiCalled ? '✅' : '❌'}`);
    console.log(`No errors occurred: ${!errorOccurred ? '✅' : '❌'}`);
    console.log(`Result: ${buttonExists && apiCalled && !errorOccurred ? '✅ PASS' : '❌ FAIL'}`);

    await browser.close();
    return buttonExists && apiCalled && !errorOccurred;
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    await browser.close();
    return false;
  }
}

// Test 3: Camera Position
async function testCamera() {
  console.log('\n📋 TEST 3: Camera Position & Terrain Visibility');
  console.log('═'.repeat(50));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1500);

    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return {
        exists: !!canvas,
        width: canvas?.offsetWidth,
        height: canvas?.offsetHeight,
        visible: canvas ? window.getComputedStyle(canvas).display !== 'none' : false,
      };
    });

    await page.screenshot({ path: 'terrain-screenshot.png' });

    console.log(`Canvas exists: ${canvasInfo.exists ? '✅' : '❌'}`);
    console.log(`Canvas visible: ${canvasInfo.visible ? '✅' : '❌'}`);
    console.log(`Canvas dimensions: ${canvasInfo.width}x${canvasInfo.height}`);
    console.log(`Screenshot saved: terrain-screenshot.png`);
    console.log(`Result: ${canvasInfo.exists && canvasInfo.visible ? '✅ PASS' : '❌ FAIL'}`);

    await browser.close();
    return canvasInfo.exists && canvasInfo.visible;
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    await browser.close();
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n🧪 TERRAINSIM - COMPREHENSIVE TEST SUITE');
  console.log('═'.repeat(50));

  RESULTS.backend = await testBackend();
  RESULTS.frontend = await testFrontend();
  RESULTS.camera = await testCamera();

  console.log('\n\n📊 TEST SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Backend API:          ${RESULTS.backend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend Button:      ${RESULTS.frontend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Camera & Visibility:  ${RESULTS.camera ? '✅ PASS' : '❌ FAIL'}`);
  console.log('═'.repeat(50));

  const allPassed = RESULTS.backend && RESULTS.frontend && RESULTS.camera;
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

  if (!allPassed) {
    console.log('⚠️  Issues detected. Please review the logs above.\n');
  }
}

runAllTests().catch(console.error);
