import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Link,
} from '@react-email/components'

const LOGO_URL = 'https://nthpbtdjhhnwfxqsxbvy.supabase.co/storage/v1/object/public/email-assets/logo.png';
const HERO_BG_URL = 'https://nthpbtdjhhnwfxqsxbvy.supabase.co/storage/v1/object/public/email-assets/hero-bg.jpg';

interface LoginInstructionsEmailProps {
  adminName?: string
  adminEmail: string
  defaultPassword: string
  dashboardUrl: string
  employeeName: string
  employeeContact?: string
}

export default function LoginInstructionsEmail({
  adminName,
  adminEmail,
  defaultPassword,
  dashboardUrl,
  employeeName,
  employeeContact,
}: LoginInstructionsEmailProps) {
  const greeting = adminName ? `Hi ${adminName},` : 'Hi,'
  const previewText = `Your Menu.ca Dashboard login details are ready`

  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandHeader}>
            <Img src={LOGO_URL} alt="Menu.ca" style={logoImage} />
          </Section>

          <Section style={heroSection}>
            <Heading style={h1}>Your Dashboard Login Details</Heading>
            <Text style={heroText}>
              Welcome to the Menu.ca Admin Dashboard
            </Text>
          </Section>

          <Section style={section}>
            <Text style={greetingStyle}>{greeting}</Text>
            
            <Text style={paragraph}>
              This is {employeeName} from Worklocal. Thank you again for having me at your restaurant—the feedback you provided was very useful.
            </Text>

            <Text style={paragraph}>
              I'm writing to provide you with the steps to access your account on the new Menu.ca Dashboard.
            </Text>

            <Heading as="h2" style={h2}>
              Login Information
            </Heading>

            <div style={credentialsBox}>
              <div style={credentialRow}>
                <Text style={credentialLabel}>Dashboard Link:</Text>
                <Link href={dashboardUrl} style={credentialLink}>{dashboardUrl}</Link>
              </div>
              <div style={credentialRow}>
                <Text style={credentialLabel}>Email:</Text>
                <Text style={credentialValue}>{adminEmail}</Text>
              </div>
              <div style={credentialRow}>
                <Text style={credentialLabel}>Default Password:</Text>
                <Text style={credentialValueBold}>{defaultPassword}</Text>
              </div>
            </div>

            <Heading as="h2" style={h2}>
              To Change Your Password
            </Heading>

            <Text style={stepText}>
              <strong>1.</strong> After logging in, click on the small gray circle with your initials in the top right corner to display the user options.
            </Text>
            <Text style={stepText}>
              <strong>2.</strong> Click on "Profile" to access the Edit Admin User page.
            </Text>
            <Text style={stepText}>
              <strong>3.</strong> Under "Security," enter your new password and confirm it.
            </Text>
            <Text style={stepText}>
              <strong>4.</strong> Click "Update Password" to save your changes.
            </Text>

            <Hr style={divider} />

            <Text style={paragraph}>
              If you have any questions or encounter any issues, please feel free to contact me{employeeContact ? ` via email or phone at ${employeeContact}` : ''}.
            </Text>

            <Text style={signOff}>
              Best regards,
            </Text>
            <Text style={signOffName}>
              {employeeName}
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Powered by Menu.ca
            </Text>
            <Text style={footerSubtext}>
              Connecting you with local restaurants
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  padding: '20px 0',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
}

const brandHeader = {
  backgroundColor: '#ffffff',
  padding: '20px 24px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e5e7eb',
}

const logoImage = {
  width: '140px',
  height: 'auto',
  margin: '0 auto',
  display: 'block' as const,
}

const heroSection = {
  backgroundImage: `linear-gradient(rgba(220, 38, 38, 0.88), rgba(220, 38, 38, 0.88)), url(${HERO_BG_URL})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  padding: '48px 24px',
  textAlign: 'center' as const,
}

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 8px',
  lineHeight: '1.2',
}

const heroText = {
  color: '#ffffff',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  opacity: '0.95',
}

const section = {
  padding: '24px',
}

const greetingStyle = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '16px 0',
}

const h2 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '24px 0 12px',
}

const credentialsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const credentialRow = {
  marginBottom: '12px',
}

const credentialLabel = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0 0 4px',
  fontWeight: '500',
}

const credentialValue = {
  color: '#1f2937',
  fontSize: '15px',
  margin: '0',
}

const credentialValueBold = {
  color: '#1f2937',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0',
  fontFamily: 'monospace',
}

const credentialLink = {
  color: '#DC2626',
  fontSize: '15px',
  textDecoration: 'underline',
}

const stepText = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}

const signOff = {
  color: '#1f2937',
  fontSize: '15px',
  margin: '24px 0 4px',
}

const signOffName = {
  color: '#1f2937',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0',
}

const footer = {
  backgroundColor: '#f9fafb',
  padding: '24px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e5e7eb',
}

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 4px',
}

const footerSubtext = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0',
}
