#!/usr/bin/env node
/**
 * Network monitoring test - captures all API calls to identify 400 errors
 */

import { chromium } from 'playwright';

async function monitorNetworkCalls() {
  console.log('🧪 Monitoring network calls to identify issues...\n');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Monitor all network requests
  page.on('request', (request) => {
    if (request.url().includes('localhost:3001')) {
      console.log(`📤 ${request.method()} ${request.url()}`);
      if (request.postData()) {
        console.log(`   Body: ${request.postData()}`);
      }
    }
  });

  page.on('response', async (response) => {
    if (response.url().includes('localhost:3001')) {
      const status = response.status();
      const icon = status >= 200 && status < 300 ? '✅' : '❌';
      console.log(`${icon} ${status} ${response.url()}`);

      if (status >= 400) {
        try {
          const body = await response.text();
          console.log(`   Error Response: ${body}`);
        } catch (e) {
          console.log(`   (Could not read response body)`);
        }
      }
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`🔴 Console Error: ${msg.text()}`);
    }
  });

  try {
    console.log('📡 Loading page...\n');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    console.log('\n✅ Page loaded');
    console.log('⏳ Waiting 5 seconds to catch any delayed requests...\n');

    await page.waitForTimeout(5000);

    console.log('\n📊 Network monitoring complete');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

monitorNetworkCalls().catch(console.error);
