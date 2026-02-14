import { NextResponse } from 'next/server'

export const dynamic = 'force-static'
export const revalidate = 86400

const STRIPE_APPLE_PAY_VERIFICATION_URL =
  'https://stripe.com/files/apple-pay/apple-developer-merchantid-domain-association'

export async function GET() {
  try {
    const response = await fetch(STRIPE_APPLE_PAY_VERIFICATION_URL)
    if (!response.ok) {
      return new NextResponse('Failed to fetch verification file', { status: 502 })
    }
    const body = await response.text()
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Internal error', { status: 500 })
  }
}
