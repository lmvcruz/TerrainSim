// Test script for the new logging endpoints

const BASE_URL = 'http://localhost:3001';

async function testLoggingEndpoints() {
  console.log('🧪 Testing Unified Logging System\n');

  try {
    // Test 1: POST /logs
    console.log('1️⃣  Testing POST /logs...');
    const response1 = await fetch(`${BASE_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logs: [
          {
            correlationId: 'test-001',
            source: 'frontend',
            component: 'TestComponent',
            level: 'info',
            message: 'Test log entry 1'
          },
          {
            correlationId: 'test-001',
            source: 'backend',
            component: 'TestBackend',
            level: 'debug',
            message: 'Test log entry 2'
          }
        ]
      })
    });
    const data1 = await response1.json();
    console.log('✅ POST /logs:', data1);

    // Test 2: GET /logs/stats
    console.log('\n2️⃣  Testing GET /logs/stats...');
    const response2 = await fetch(`${BASE_URL}/logs/stats`);
    const data2 = await response2.json();
    console.log('✅ GET /logs/stats:', data2);

    // Test 3: GET /logs/latest
    console.log('\n3️⃣  Testing GET /logs/latest...');
    const response3 = await fetch(`${BASE_URL}/logs/latest`);
    const data3 = await response3.json();
    console.log('✅ GET /logs/latest:', data3);

    // Test 4: GET /logs?correlationId=test-001
    console.log('\n4️⃣  Testing GET /logs?correlationId=test-001...');
    const response4 = await fetch(`${BASE_URL}/logs?correlationId=test-001`);
    const data4 = await response4.json();
    console.log('✅ GET /logs with correlationId:', data4);

    // Test 5: POST /logs/config
    console.log('\n5️⃣  Testing POST /logs/config...');
    const response5 = await fetch(`${BASE_URL}/logs/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'trace' })
    });
    const data5 = await response5.json();
    console.log('✅ POST /logs/config:', data5);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testLoggingEndpoints();
