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
  Row,
  Column,
} from '@react-email/components'

const LOGO_URL = 'https://nthpbtdjhhnwfxqsxbvy.supabase.co/storage/v1/object/public/email-assets/logo.png';
const HERO_BG_URL = 'https://nthpbtdjhhnwfxqsxbvy.supabase.co/storage/v1/object/public/email-assets/hero-bg.jpg';

interface RefundNotificationEmailProps {
  firstName: string
  orderNumber: string
  restaurantName: string
  refundAmount: number
  refundReason: string
  originalTotal: number
  refundType: 'full' | 'partial'
  estimatedDays: string
}

export default function RefundNotificationEmail({
  firstName,
  orderNumber,
  restaurantName,
  refundAmount,
  refundReason,
  originalTotal,
  refundType,
  estimatedDays = '5-7 business days',
}: RefundNotificationEmailProps) {
  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
      </Head>
      <Preview>Refund processed for Order #{orderNumber} - ${refundAmount.toFixed(2)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandHeader}>
            <Img src={LOGO_URL} alt="Menu.ca" style={logoImage} />
          </Section>

          <Section style={heroSection}>
            <div style={refundIcon}>&#128179;</div>
            <Heading style={h1}>
              {refundType === 'full' ? 'Full Refund Processed' : 'Partial Refund Processed'}
            </Heading>
            <Text style={heroText}>
              Your refund for Order #{orderNumber} is on its way.
            </Text>
          </Section>

          <Section style={refundBox}>
            <Text style={refundLabel}>Refund Amount</Text>
            <Text style={refundAmountStyle}>${refundAmount.toFixed(2)}</Text>
            {refundType === 'partial' && (
              <Text style={originalAmountStyle}>
                Original order total: ${originalTotal.toFixed(2)}
              </Text>
            )}
          </Section>

          <Section style={section}>
            <Text style={greetingStyle}>Hi {firstName},</Text>
            
            <Text style={paragraph}>
              We've processed a {refundType} refund for your order from <strong>{restaurantName}</strong>.
            </Text>

            <div style={detailsBox}>
              <Row style={detailRow}>
                <Column style={detailLabelCol}>
                  <Text style={detailLabel}>Order Number</Text>
                </Column>
                <Column style={detailValueCol}>
                  <Text style={detailValue}>#{orderNumber}</Text>
                </Column>
              </Row>
              <Row style={detailRow}>
                <Column style={detailLabelCol}>
                  <Text style={detailLabel}>Restaurant</Text>
                </Column>
                <Column style={detailValueCol}>
                  <Text style={detailValue}>{restaurantName}</Text>
                </Column>
              </Row>
              <Row style={detailRow}>
                <Column style={detailLabelCol}>
                  <Text style={detailLabel}>Reason</Text>
                </Column>
                <Column style={detailValueCol}>
                  <Text style={detailValue}>{refundReason}</Text>
                </Column>
              </Row>
            </div>

            <div style={timelineBox}>
              <Text style={timelineTitle}>When will I receive my refund?</Text>
              <Text style={timelineText}>
                Refunds typically appear on your original payment method within <strong>{estimatedDays}</strong>. 
                The exact timing depends on your bank or card issuer.
              </Text>
            </div>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={helpText}>
              Have questions about your refund? Contact our support team and we'll be happy to help.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              We apologize for any inconvenience.
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

const refundIcon = {
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
  fontSize: '28px',
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

const refundBox = {
  backgroundColor: '#ecfdf5',
  padding: '24px',
  margin: '24px',
  borderRadius: '8px',
  border: '2px solid #a7f3d0',
  textAlign: 'center' as const,
}

const refundLabel = {
  color: '#065f46',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px',
}

const refundAmountStyle = {
  color: '#047857',
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '0',
}

const originalAmountStyle = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '8px 0 0',
}

const section = {
  padding: '0 24px 24px',
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

const detailsBox = {
  backgroundColor: '#f9fafb',
  padding: '16px',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  marginTop: '24px',
}

const detailRow = {
  padding: '8px 0',
}

const detailLabelCol = {
  width: '40%',
}

const detailValueCol = {
  width: '60%',
}

const detailLabel = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
}

const detailValue = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
}

const timelineBox = {
  backgroundColor: '#eff6ff',
  padding: '16px',
  borderRadius: '6px',
  border: '1px solid #bfdbfe',
  marginTop: '24px',
}

const timelineTitle = {
  color: '#1e40af',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const timelineText = {
  color: '#1e3a8a',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
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
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 8px',
}

const footerSubtext = {
  color: '#9ca3af',
  fontSize: '13px',
  margin: '0',
}
