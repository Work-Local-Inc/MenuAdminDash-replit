import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  firstName: string
  email: string
}

export default function WelcomeEmail({ firstName, email }: WelcomeEmailProps) {
  const previewText = `Welcome to Menu.ca, ${firstName}!`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Welcome to Menu.ca! 🎉</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Hi {firstName},</Text>
            
            <Text style={paragraph}>
              Welcome to Menu.ca! We're excited to have you join our community of food lovers.
            </Text>

            <Text style={paragraph}>
              With Menu.ca, you can:
            </Text>

            <ul style={list}>
              <li style={listItem}>Browse menus from your favorite local restaurants</li>
              <li style={listItem}>Order delivery or pickup with just a few clicks</li>
              <li style={listItem}>Track your orders in real-time</li>
              <li style={listItem}>Save your favorite restaurants and dishes</li>
              <li style={listItem}>Manage multiple delivery addresses</li>
            </ul>

            <Text style={paragraph}>
              Ready to explore? Start by browsing restaurants in your area and discover your next favorite meal!
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={process.env.NEXT_PUBLIC_APP_URL || 'https://menu.ca'}>
                Browse Restaurants
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={paragraph}>
              If you have any questions or need assistance, feel free to reach out to our support team.
            </Text>

            <Text style={signature}>
              Happy ordering!
              <br />
              The Menu.ca Team
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              You received this email because you created an account at Menu.ca.
              <br />
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
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  padding: '32px 24px',
  textAlign: 'center' as const,
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  lineHeight: '40px',
}

const content = {
  padding: '0 24px',
}

const greeting = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#1a1a1a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const list = {
  color: '#1a1a1a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  paddingLeft: '20px',
}

const listItem = {
  margin: '8px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
}

const signature = {
  color: '#1a1a1a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '24px 0 0',
}

const footer = {
  padding: '24px',
}

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  margin: '0',
}
