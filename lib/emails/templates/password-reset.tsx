import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'

const LOGO_URL = 'https://nthpbtdjhhnwfxqsxbvy.supabase.co/storage/v1/object/public/email-assets/logo.png';
const HERO_BG_URL = 'https://nthpbtdjhhnwfxqsxbvy.supabase.co/storage/v1/object/public/email-assets/hero-bg.jpg';

interface PasswordResetEmailProps {
  firstName: string
  resetLink: string
  expiresIn: string
}

export default function PasswordResetEmail({
  firstName,
  resetLink,
  expiresIn = '1 hour',
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
      </Head>
      <Preview>Reset your Menu.ca password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandHeader}>
            <Img src={LOGO_URL} alt="Menu.ca" style={logoImage} />
          </Section>

          <Section style={heroSection}>
            <div style={lockIcon}>&#128274;</div>
            <Heading style={h1}>Reset Your Password</Heading>
            <Text style={heroText}>
              We received a request to reset the password for your account.
            </Text>
          </Section>

          <Section style={section}>
            <Text style={greetingStyle}>Hi {firstName},</Text>
            
            <Text style={paragraph}>
              Click the button below to reset your password. This link will expire in {expiresIn}.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={resetLink}>
                Reset Password
              </Button>
            </Section>

            <Text style={paragraph}>
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </Text>

            <div style={securityNote}>
              <Text style={securityTitle}>Security Tips:</Text>
              <Text style={securityText}>
                Never share your password with anyone<br />
                Use a unique password for Menu.ca<br />
                Enable two-factor authentication when available
              </Text>
            </div>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={helpText}>
              If the button doesn't work, copy and paste this link into your browser:
            </Text>
            <Text style={linkText}>{resetLink}</Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Need help? Contact our support team.
            </Text>
            <Text style={footerSubtext}>
              Powered by Menu.ca - Connecting you with local restaurants
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
}

const heroSection = {
  backgroundImage: `linear-gradient(rgba(220, 38, 38, 0.88), rgba(220, 38, 38, 0.88)), url(${HERO_BG_URL})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  padding: '48px 24px',
  textAlign: 'center' as const,
}

const lockIcon = {
  backgroundColor: '#ffffff',
  borderRadius: '50%',
  width: '60px',
  height: '60px',
  margin: '0 auto 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '28px',
}

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 12px',
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
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#1f2937',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#DC2626',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
}

const securityNote = {
  backgroundColor: '#fef3c7',
  padding: '16px',
  borderRadius: '6px',
  border: '1px solid #fcd34d',
  marginTop: '24px',
}

const securityTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const securityText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '0 24px',
}

const helpText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const linkText = {
  color: '#DC2626',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0',
  textAlign: 'center' as const,
  wordBreak: 'break-all' as const,
}

const footer = {
  backgroundColor: '#f9fafb',
  padding: '32px 24px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e5e7eb',
}

const footerText = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 8px',
}

const footerSubtext = {
  color: '#9ca3af',
  fontSize: '13px',
  margin: '0',
}
