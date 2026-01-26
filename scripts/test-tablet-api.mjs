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
  uuid: 'fa91341c-07d7-4a1f-86ba-1bb3fe51ba06',
  key: 'Zwo1r_Zpe1ZVXmde7oJHuSElRdvx8boAG0YpC_XgkhE',
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
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_token: sessionToken,
    }),
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

async function testDispatchDriverDryRun() {
  if (!sessionToken) throw new Error('No session token - login first')

  // First get a delivery order to test with
  const ordersResponse = await fetch(`${BASE_URL}/api/tablet/orders?limit=50`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!ordersResponse.ok) {
    throw new Error('Failed to fetch orders')
  }

  const ordersData = await ordersResponse.json()
  
  // Find a delivery order in confirmed/preparing/ready status
  const validStatuses = ['confirmed', 'preparing', 'ready']
  const deliveryOrder = ordersData.orders?.find(
    o => o.order_type === 'delivery' && validStatuses.includes(o.order_status)
  )

  if (!deliveryOrder) {
    console.log('   No eligible delivery order found (need delivery order in confirmed/preparing/ready status)')
    console.log('   Skipping dry run test - this is expected if no orders match criteria')
    return
  }

  console.log(`   Testing with order #${deliveryOrder.order_number} (ID: ${deliveryOrder.id})`)

  // Test dispatch with dry_run=true
  const response = await fetch(`${BASE_URL}/api/tablet/orders/${deliveryOrder.id}/dispatch-driver?dry_run=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  const data = await response.json()

  if (!response.ok) {
    // 400 with "not configured" is expected for restaurants without a provider
    if (data.error?.includes('not configured')) {
      console.log('   Restaurant not configured for external delivery - this is expected')
      console.log('   (To test dispatch, configure a delivery provider for this restaurant)')
      return
    }
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`)
  }

  if (!data.dry_run) {
    throw new Error('Response missing dry_run flag - may have called real API!')
  }

  console.log(`   DRY RUN successful!`)
  console.log(`   Provider: ${data.provider}`)
  console.log(`   Message: ${data.message}`)
  console.log(`   Payload preview:`)
  console.log(`     - Address: ${data.payload?.address}`)
  console.log(`     - Customer: ${data.payload?.customerName}`)
  console.log(`     - Total: $${data.payload?.total?.toFixed(2)}`)
  console.log(`     - Distance: ${data.payload?.distanceKm}km`)
}

async function testCheckDispatchAvailable() {
  if (!sessionToken) throw new Error('No session token - login first')

  // Get any order to check dispatch availability
  const ordersResponse = await fetch(`${BASE_URL}/api/tablet/orders?limit=1`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!ordersResponse.ok) {
    throw new Error('Failed to fetch orders')
  }

  const ordersData = await ordersResponse.json()
  
  if (!ordersData.orders?.length) {
    console.log('   No orders found to check dispatch availability')
    return
  }

  const order = ordersData.orders[0]
  console.log(`   Checking dispatch for order #${order.order_number}`)

  const response = await fetch(`${BASE_URL}/api/tablet/orders/${order.id}/dispatch-driver`, {
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
  
  console.log(`   Dispatch available: ${data.dispatch_available}`)
  if (data.provider) {
    console.log(`   Provider: ${data.provider.name} (${data.provider.code})`)
    console.log(`   External ID: ${data.provider.external_id}`)
  }
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
    results.push(await test('Check Dispatch Available', testCheckDispatchAvailable))
    results.push(await test('Dispatch Driver (Dry Run)', testDispatchDriverDryRun))
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

