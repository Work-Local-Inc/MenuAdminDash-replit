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

interface EmailVerificationEmailProps {
  firstName: string
  verificationLink: string
  email: string
}

export default function EmailVerificationEmail({
  firstName,
  verificationLink,
  email,
}: EmailVerificationEmailProps) {
  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
      </Head>
      <Preview>Verify your email address for Menu.ca</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandHeader}>
            <Img src={LOGO_URL} alt="Menu.ca" style={logoImage} />
          </Section>

          <Section style={heroSection}>
            <div style={emailIcon}>&#9993;</div>
            <Heading style={h1}>Verify Your Email</Heading>
            <Text style={heroText}>
              One quick step to complete your account setup.
            </Text>
          </Section>

          <Section style={section}>
            <Text style={greetingStyle}>Hi {firstName},</Text>
            
            <Text style={paragraph}>
              Thanks for signing up for Menu.ca! Please verify your email address to complete your account setup and start ordering from your favorite local restaurants.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={verificationLink}>
                Verify Email Address
              </Button>
            </Section>

            <Text style={paragraph}>
              This verification link will expire in 24 hours. If you didn't create a Menu.ca account, you can safely ignore this email.
            </Text>

            <div style={emailBox}>
              <Text style={emailBoxLabel}>Verifying for:</Text>
              <Text style={emailBoxValue}>{email}</Text>
            </div>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={helpText}>
              If the button doesn't work, copy and paste this link into your browser:
            </Text>
            <Text style={linkText}>{verificationLink}</Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Questions? Contact our support team.
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

const emailIcon = {
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

const emailBox = {
  backgroundColor: '#f3f4f6',
  padding: '16px',
  borderRadius: '6px',
  textAlign: 'center' as const,
  marginTop: '24px',
}

const emailBoxLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
}

const emailBoxValue = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '500',
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
