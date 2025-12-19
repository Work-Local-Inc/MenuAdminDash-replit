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

type OrderStatus = 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'

interface OrderStatusEmailProps {
  orderNumber: string
  restaurantName: string
  status: OrderStatus
  statusMessage: string
  estimatedTime?: string
  deliveryAddress?: string
}

const statusConfig: Record<OrderStatus, { icon: string; title: string }> = {
  confirmed: { icon: '&#10003;', title: 'Order Confirmed' },
  preparing: { icon: '&#128104;&#8205;&#127859;', title: 'Being Prepared' },
  ready: { icon: '&#10004;', title: 'Ready for Pickup' },
  out_for_delivery: { icon: '&#128663;', title: 'Out for Delivery' },
  delivered: { icon: '&#127881;', title: 'Delivered!' },
  cancelled: { icon: '&#10005;', title: 'Order Cancelled' },
}

export default function OrderStatusEmail({
  orderNumber,
  restaurantName,
  status,
  statusMessage,
  estimatedTime,
  deliveryAddress,
}: OrderStatusEmailProps) {
  const config = statusConfig[status]

  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
      </Head>
      <Preview>Order #{orderNumber} - {config.title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandHeader}>
            <Img src={LOGO_URL} alt="Menu.ca" style={logoImage} />
          </Section>

          <Section style={heroSection}>
            <div style={statusIcon} dangerouslySetInnerHTML={{ __html: config.icon }} />
            <Heading style={h1}>{config.title}</Heading>
            <Text style={heroText}>Order #{orderNumber}</Text>
          </Section>

          <Section style={orderInfoBox}>
            <Row>
              <Column>
                <Text style={orderLabel}>Restaurant</Text>
                <Text style={orderValue}>{restaurantName}</Text>
              </Column>
              {estimatedTime && (
                <Column align="right">
                  <Text style={orderLabel}>Estimated Time</Text>
                  <Text style={estimatedTimeStyle}>{estimatedTime}</Text>
                </Column>
              )}
            </Row>
          </Section>

          <Section style={section}>
            <Text style={statusMessageStyle}>{statusMessage}</Text>

            {deliveryAddress && status === 'out_for_delivery' && (
              <div style={addressBox}>
                <Text style={addressLabel}>Delivering to:</Text>
                <Text style={addressValue}>{deliveryAddress}</Text>
              </div>
            )}

            {status === 'delivered' && (
              <div style={thankYouBox}>
                <Text style={thankYouTitle}>Enjoy your meal!</Text>
                <Text style={thankYouText}>
                  We hope you love your order. If you have any feedback, we'd love to hear from you.
                </Text>
              </div>
            )}

            {status === 'cancelled' && (
              <div style={cancelledBox}>
                <Text style={cancelledText}>
                  If you were charged, a refund will be processed within 5-7 business days.
                </Text>
              </div>
            )}
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={helpText}>
              Questions about your order? Contact the restaurant or reach out to Menu.ca support.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Thank you for ordering with Menu.ca!
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

const statusIcon = {
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
  fontSize: '18px',
  margin: '0',
  opacity: '0.95',
  fontFamily: 'monospace',
}

const orderInfoBox = {
  backgroundColor: '#f9fafb',
  padding: '24px',
  margin: '24px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
}

const orderLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
}

const orderValue = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
}

const estimatedTimeStyle = {
  color: '#16a34a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
}

const section = {
  padding: '0 24px 24px',
}

const statusMessageStyle = {
  color: '#1f2937',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}

const addressBox = {
  backgroundColor: '#f3f4f6',
  padding: '16px',
  borderRadius: '6px',
  marginTop: '16px',
}

const addressLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
}

const addressValue = {
  color: '#1f2937',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
}

const thankYouBox = {
  backgroundColor: '#ecfdf5',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #a7f3d0',
  textAlign: 'center' as const,
}

const thankYouTitle = {
  color: '#065f46',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const thankYouText = {
  color: '#047857',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
}

const cancelledBox = {
  backgroundColor: '#fef2f2',
  padding: '16px',
  borderRadius: '6px',
  border: '1px solid #fecaca',
}

const cancelledText = {
  color: '#991b1b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
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
