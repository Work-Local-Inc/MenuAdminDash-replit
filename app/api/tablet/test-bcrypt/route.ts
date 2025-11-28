import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

/**
 * POST /api/tablet/test-bcrypt
 *
 * Debug endpoint to test bcrypt functionality
 * REMOVE AFTER DEBUGGING
 */
export async function POST(request: NextRequest) {
  try {
    const { test_key } = await request.json()

    // Test 1: Generate a key, hash it, verify it
    const testKey = test_key || 'test-key-12345'
    const hash = await bcrypt.hash(testKey, 12)
    const verified = await bcrypt.compare(testKey, hash)

    // Test 2: Check if a specific key verifies against a freshly generated hash
    const deviceKey = 'EeXP2XeAnnD_pEvjxUFASwqy8-LxU_Eb9ofeoJa9Py4'
    const deviceHash = await bcrypt.hash(deviceKey, 12)
    const deviceVerified = await bcrypt.compare(deviceKey, deviceHash)

    return NextResponse.json({
      test1: {
        key: testKey,
        keyLength: testKey.length,
        hashLength: hash.length,
        hashPrefix: hash.substring(0, 10),
        verified,
      },
      test2: {
        key: deviceKey,
        keyLength: deviceKey.length,
        hashLength: deviceHash.length,
        verified: deviceVerified,
      },
      bcryptVersion: typeof bcrypt.getRounds === 'function' ? 'has getRounds' : 'no getRounds',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
