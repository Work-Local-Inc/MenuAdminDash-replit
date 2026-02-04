import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/emails/client'
import LoginInstructionsEmail from '@/lib/emails/templates/login-instructions'
import { verifyAdminAuth } from '@/lib/auth/admin-check'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const DEFAULT_PASSWORD = process.env.ONBOARDING_DEFAULT_PASSWORD || 'Menu123*'
const DASHBOARD_URL = process.env.ONBOARDING_DASHBOARD_URL || 'https://orders.menu.ca/login'

const SUPER_ADMIN_ROLE_ID = 1

interface SendLoginEmailRequest {
  adminEmail: string
  adminName?: string
  restaurantName: string
  employeeName: string
  employeeContact?: string
  password?: string
  dashboardUrl?: string
}

function generatePlainText(data: SendLoginEmailRequest, password: string, dashboardUrl: string): string {
  const lines: string[] = []
  const greeting = data.adminName ? `Hi ${data.adminName},` : 'Hi,'
  
  lines.push('========================================')
  lines.push('     MENU.CA DASHBOARD LOGIN DETAILS')
  lines.push('========================================')
  lines.push('')
  lines.push(greeting)
  lines.push('')
  lines.push(`This is ${data.employeeName} from Worklocal. Thank you again for having me at your restaurant—the feedback you provided was very useful.`)
  lines.push('')
  lines.push("I'm writing to provide you with the steps to access your account on the new Menu.ca Dashboard.")
  lines.push('')
  lines.push('----------------------------------------')
  lines.push('LOGIN INFORMATION')
  lines.push('----------------------------------------')
  lines.push(`Dashboard Link: ${dashboardUrl}`)
  lines.push(`Email: ${data.adminEmail}`)
  lines.push(`Default Password: ${password}`)
  lines.push('')
  lines.push('----------------------------------------')
  lines.push('TO CHANGE YOUR PASSWORD')
  lines.push('----------------------------------------')
  lines.push('')
  lines.push('1. After logging in, click on the small gray circle with your initials in the top right corner to display the user options.')
  lines.push('')
  lines.push('2. Click on "Profile" to access the Edit Admin User page.')
  lines.push('')
  lines.push('3. Under "Security," enter your new password and confirm it.')
  lines.push('')
  lines.push('4. Click "Update Password" to save your changes.')
  lines.push('')
  lines.push('----------------------------------------')
  lines.push('')
  lines.push(`If you have any questions or encounter any issues, please feel free to contact me${data.employeeContact ? ` via email or phone at ${data.employeeContact}` : ''}.`)
  lines.push('')
  lines.push('Best regards,')
  lines.push(data.employeeName)
  lines.push('')
  lines.push('========================================')
  lines.push('Powered by Menu.ca')
  lines.push('Connecting you with local restaurants')
  lines.push('========================================')
  
  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const { adminUser } = await verifyAdminAuth(request)
    
    if (adminUser.role_id !== SUPER_ADMIN_ROLE_ID) {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      )
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('[Onboarding Email] RESEND_API_KEY not configured')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const body: SendLoginEmailRequest = await request.json()
    
    if (!body.adminEmail || !body.employeeName || !body.restaurantName) {
      return NextResponse.json(
        { error: 'Missing required fields: adminEmail, employeeName, restaurantName' },
        { status: 400 }
      )
    }

    const password = body.password || DEFAULT_PASSWORD
    const dashboardUrl = body.dashboardUrl || DASHBOARD_URL

    console.log('[Onboarding Email] Sending login instructions', {
      adminEmail: body.adminEmail,
      restaurantName: body.restaurantName,
      employeeName: body.employeeName,
      dashboardUrl,
    })

    const plainText = generatePlainText(body, password, dashboardUrl)

    const result = await resend.emails.send({
      from: `Menu.ca <${FROM_EMAIL.includes('<') ? FROM_EMAIL.match(/<(.+)>/)?.[1] || FROM_EMAIL : FROM_EMAIL}>`,
      to: body.adminEmail,
      subject: `Your Menu.ca Dashboard Login Details - ${body.restaurantName}`,
      react: LoginInstructionsEmail({
        adminName: body.adminName,
        adminEmail: body.adminEmail,
        defaultPassword: password,
        dashboardUrl: dashboardUrl,
        employeeName: body.employeeName,
        employeeContact: body.employeeContact,
      }),
      text: plainText,
    })

    console.log('[Onboarding Email] Email sent successfully', {
      id: result.data?.id,
      adminEmail: body.adminEmail,
    })

    return NextResponse.json({
      success: true,
      message: `Login instructions sent to ${body.adminEmail}`,
      emailId: result.data?.id,
    })
  } catch (error) {
    console.error('[Onboarding Email] Failed to send email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: String(error) },
      { status: 500 }
    )
  }
}
