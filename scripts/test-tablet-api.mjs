#!/usr/bin/env node
/**
 * Test Script for Tablet Bridge API
 * 
 * Usage: 
 *   node scripts/test-tablet-api.mjs [BASE_URL]
 * 
 * Example:
 *   node scripts/test-tablet-api.mjs http://localhost:5000
 *   node scripts/test-tablet-api.mjs https://your-app.replit.app
 */

const BASE_URL = process.argv[2] || 'http://localhost:5000'

// Test credentials (from database)
const TEST_DEVICE = {
  uuid: '006fe8aa-eec7-465c-bb8d-9180d3a2c910',
  key: 'aU2065zyc6zJrOwhQajVXToYLs4TNsOPlCgzKPVbyDE',
}

let sessionToken = null

console.log('🔧 Tablet API Test Suite')
console.log('========================')
console.log(`Base URL: ${BASE_URL}`)
console.log('')

async function test(name, fn) {
  try {
    console.log(`\n🧪 Testing: ${name}`)
    await fn()
    console.log(`✅ PASS: ${name}`)
    return true
  } catch (error) {
    console.log(`❌ FAIL: ${name}`)
    console.log(`   Error: ${error.message}`)
    return false
  }
}

async function testLogin() {
  const response = await fetch(`${BASE_URL}/api/tablet/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_uuid: TEST_DEVICE.uuid,
      device_key: TEST_DEVICE.key,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  
  if (!data.session_token) {
    throw new Error('No session_token in response')
  }
  
  if (!data.device?.restaurant_id) {
    throw new Error('No restaurant_id in response')
  }

  sessionToken = data.session_token
  console.log(`   Session Token: ${sessionToken.substring(0, 20)}...`)
  console.log(`   Device: ${data.device.name} (ID: ${data.device.id})`)
  console.log(`   Restaurant: ${data.device.restaurant_name} (ID: ${data.device.restaurant_id})`)
  console.log(`   Expires: ${data.expires_at}`)
}

async function testGetOrders() {
  if (!sessionToken) throw new Error('No session token - login first')

  const response = await fetch(`${BASE_URL}/api/tablet/orders?limit=5`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  
  if (!Array.isArray(data.orders)) {
    throw new Error('Response does not contain orders array')
  }

  console.log(`   Found ${data.total_count} orders`)
  console.log(`   Server time: ${data.server_time}`)
  
  if (data.orders.length > 0) {
    const order = data.orders[0]
    console.log(`   Latest order: #${order.order_number}`)
    console.log(`   Status: ${order.order_status}, Type: ${order.order_type}`)
    console.log(`   Total: $${order.total_amount?.toFixed(2)}`)
    console.log(`   Items: ${order.items?.length || 0}`)
  }
}

async function testGetOrdersPending() {
  if (!sessionToken) throw new Error('No session token - login first')

  const response = await fetch(`${BASE_URL}/api/tablet/orders?status=pending`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  console.log(`   Pending orders: ${data.total_count}`)
}

async function testHeartbeat() {
  if (!sessionToken) throw new Error('No session token - login first')

  const response = await fetch(`${BASE_URL}/api/tablet/heartbeat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_version: '1.0.0-test',
      battery_level: 85,
      printer_status: 'online',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  
  if (!data.success) {
    throw new Error('Heartbeat did not return success')
  }

  console.log(`   Server time: ${data.server_time}`)
}

async function testTokenRefresh() {
  if (!sessionToken) throw new Error('No session token - login first')

  const response = await fetch(`${BASE_URL}/api/tablet/auth/refresh`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  
  if (!data.session_token) {
    throw new Error('No session_token in refresh response')
  }

  console.log(`   New token: ${data.session_token.substring(0, 20)}...`)
  console.log(`   Expires: ${data.expires_at}`)
  
  // Update token for subsequent tests
  sessionToken = data.session_token
}

async function testUnauthorized() {
  const response = await fetch(`${BASE_URL}/api/tablet/orders`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    // No Authorization header
  })

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }

  console.log(`   Correctly returned 401 Unauthorized`)
}

async function testInvalidToken() {
  const response = await fetch(`${BASE_URL}/api/tablet/orders`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer invalid_token_12345',
      'Content-Type': 'application/json',
    },
  })

  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }

  console.log(`   Correctly returned 401 for invalid token`)
}

async function runAllTests() {
  const results = []

  // Auth tests
  results.push(await test('Device Login', testLogin))
  results.push(await test('Unauthorized Access Blocked', testUnauthorized))
  results.push(await test('Invalid Token Rejected', testInvalidToken))
  
  // Order tests (require valid session)
  if (sessionToken) {
    results.push(await test('Get Orders', testGetOrders))
    results.push(await test('Get Pending Orders', testGetOrdersPending))
    results.push(await test('Heartbeat', testHeartbeat))
    results.push(await test('Token Refresh', testTokenRefresh))
  }

  // Summary
  const passed = results.filter(r => r).length
  const total = results.length
  
  console.log('\n========================')
  console.log(`📊 Results: ${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log('🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log('⚠️  Some tests failed')
    process.exit(1)
  }
}

runAllTests().catch(error => {
  console.error('\n💥 Fatal error:', error.message)
  process.exit(1)
})

