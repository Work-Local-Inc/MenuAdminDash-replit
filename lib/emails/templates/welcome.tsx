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

const LOGO_URL = 'https://menuv3.replit.app/email-assets/logo.png';
const HERO_BG_URL = 'https://menuv3.replit.app/email-assets/hero-bg.jpg';

interface WelcomeEmailProps {
  firstName: string
  email: string
}

export default function WelcomeEmail({ firstName, email }: WelcomeEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : 'Welcome!'
  const previewText = firstName 
    ? `Welcome to Menu.ca, ${firstName}! Start enjoying faster checkout and exclusive perks.`
    : 'Welcome to Menu.ca! Start enjoying faster checkout and exclusive perks.'

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
            <div style={welcomeIcon}>&#10003;</div>
            <Heading style={h1}>Welcome to Menu.ca!</Heading>
            <Text style={heroText}>
              Thank you for creating an account. You're all set to enjoy a better ordering experience.
            </Text>
          </Section>

          <Section style={section}>
            <Text style={greetingStyle}>{greeting}</Text>
            
            <Text style={paragraph}>
              We're excited to have you join Menu.ca! Your account is now active and ready to make ordering from your favorite local restaurants easier than ever.
            </Text>

            <Heading as="h2" style={h2}>
              Your Account Benefits
            </Heading>

            <div style={benefitsList}>
              <div style={benefitItem}>
                <span style={checkmark}>&#10003;</span>
                <div>
                  <Text style={benefitTitle}>Faster Checkout</Text>
                  <Text style={benefitDescription}>
                    Save your delivery addresses and payment methods for quick, seamless ordering
                  </Text>
                </div>
              </div>

              <div style={benefitItem}>
                <span style={checkmark}>&#10003;</span>
                <div>
                  <Text style={benefitTitle}>Order History & Re-ordering</Text>
                  <Text style={benefitDescription}>
                    Easily view past orders and reorder your favorites with one click
                  </Text>
                </div>
              </div>

              <div style={benefitItem}>
                <span style={checkmark}>&#10003;</span>
                <div>
                  <Text style={benefitTitle}>Track Your Deliveries</Text>
                  <Text style={benefitDescription}>
                    Stay updated on your order status from preparation to delivery
                  </Text>
                </div>
              </div>

              <div style={benefitItem}>
                <span style={checkmark}>&#10003;</span>
                <div>
                  <Text style={benefitTitle}>Exclusive Deals</Text>
                  <Text style={benefitDescription}>
                    Get access to special offers and promotions (coming soon!)
                  </Text>
                </div>
              </div>
            </div>

            <Section style={buttonContainer}>
              <Button style={button} href="https://menu.ca">
                Start Ordering
              </Button>
            </Section>

            <Text style={paragraph}>
              Ready to explore? Browse restaurants in your area and discover delicious meals from local favorites.
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={helpText}>
              Need help getting started? Have questions about your account? Our support team is here to assist you.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Thank you for choosing Menu.ca!
            </Text>
            <Text style={footerSubtext}>
              Powered by Menu.ca - Connecting you with local restaurants
            </Text>
            <Text style={footerEmail}>
              Your email: {email}
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

const welcomeIcon = {
  backgroundColor: '#ffffff',
  borderRadius: '50%',
  width: '60px',
  height: '60px',
  margin: '0 auto 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#16a34a',
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

const h2 = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: '600',
  margin: '24px 0 16px',
}

const benefitsList = {
  margin: '24px 0',
}

const benefitItem = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '20px',
  gap: '12px',
}

const checkmark = {
  color: '#16a34a',
  fontSize: '24px',
  fontWeight: 'bold',
  lineHeight: '1',
  marginTop: '2px',
  flexShrink: 0,
}

const benefitTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 4px',
  lineHeight: '1.4',
}

const benefitDescription = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
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

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 24px',
}

const helpText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
}

const footer = {
  backgroundColor: '#f9fafb',
  padding: '32px 24px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e5e7eb',
}

const footerText = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const footerSubtext = {
  color: '#9ca3af',
  fontSize: '13px',
  margin: '0 0 16px',
}

const footerEmail = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0',
}
