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

interface OrderItem {
  dish_id: number
  name: string
  size: string
  quantity: number
  unit_price: number
  subtotal: number
  modifiers?: Array<{
    id: number
    name: string
    price: number
  }>
}

interface OrderConfirmationEmailProps {
  orderNumber: string
  restaurantName: string
  restaurantLogoUrl?: string
  items: OrderItem[]
  deliveryAddress: {
    street: string
    city: string
    province: string
    postal_code: string
    delivery_instructions?: string
  }
  subtotal: number
  deliveryFee: number
  tax: number
  taxLabel?: string
  total: number
  estimatedDeliveryTime?: string
}

export default function OrderConfirmationEmail({
  orderNumber,
  restaurantName,
  items,
  deliveryAddress,
  subtotal,
  deliveryFee,
  tax,
  taxLabel = 'Tax',
  total,
  estimatedDeliveryTime = '45-60 minutes',
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
      </Head>
      <Preview>Your order #{orderNumber} from {restaurantName} has been confirmed! Estimated delivery: {estimatedDeliveryTime}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandHeader}>
            <Img src={LOGO_URL} alt="Menu.ca" style={logoImage} />
          </Section>

          <Section style={heroSection}>
            <div style={successIcon}>&#10003;</div>
            <Heading style={h1}>Order Confirmed!</Heading>
            <Text style={heroText}>
              Your order from <strong>{restaurantName}</strong> has been confirmed and is being prepared.
            </Text>
          </Section>

          <Section style={orderSummaryBox}>
            <Row>
              <Column>
                <Text style={orderLabel}>Order Number</Text>
                <Text style={orderNumberLarge}>#{orderNumber}</Text>
              </Column>
              <Column align="right">
                <Text style={orderLabel}>Estimated Delivery</Text>
                <Text style={estimatedTimeValue}>{estimatedDeliveryTime}</Text>
              </Column>
            </Row>
          </Section>

          <Section style={section}>
            <Heading as="h2" style={h2}>
              Order Details
            </Heading>
            {items.map((item, index) => (
              <div key={index} style={itemContainer}>
                <Row>
                  <Column style={{ width: '70%' }}>
                    <Text style={itemName}>
                      <span style={quantityBadge}>{item.quantity}x</span> {item.name}
                    </Text>
                    <Text style={itemSize}>{item.size}</Text>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <Text style={modifiers}>
                        + {item.modifiers.map(m => m.name).join(', ')}
                      </Text>
                    )}
                  </Column>
                  <Column align="right" style={{ width: '30%' }}>
                    <Text style={itemPrice}>${item.subtotal.toFixed(2)}</Text>
                  </Column>
                </Row>
              </div>
            ))}
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Row style={totalRow}>
              <Column>
                <Text style={totalLabel}>Subtotal</Text>
              </Column>
              <Column align="right">
                <Text style={totalValue}>${subtotal.toFixed(2)}</Text>
              </Column>
            </Row>
            <Row style={totalRow}>
              <Column>
                <Text style={totalLabel}>Delivery Fee</Text>
              </Column>
              <Column align="right">
                <Text style={totalValue}>${deliveryFee.toFixed(2)}</Text>
              </Column>
            </Row>
            <Row style={totalRow}>
              <Column>
                <Text style={totalLabel}>{taxLabel}</Text>
              </Column>
              <Column align="right">
                <Text style={totalValue}>${tax.toFixed(2)}</Text>
              </Column>
            </Row>
            <Hr style={totalDivider} />
            <Row style={totalRow}>
              <Column>
                <Text style={totalLabelBold}>Total Paid</Text>
              </Column>
              <Column align="right">
                <Text style={totalValueBold}>${total.toFixed(2)}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Heading as="h2" style={h2}>
              Delivery Address
            </Heading>
            <div style={addressBox}>
              <Text style={address}>
                {deliveryAddress.street}<br />
                {deliveryAddress.city}, {deliveryAddress.province} {deliveryAddress.postal_code}
              </Text>
              {deliveryAddress.delivery_instructions && (
                <div style={instructionsBox}>
                  <Text style={instructionsLabel}>Delivery Instructions:</Text>
                  <Text style={instructions}>{deliveryAddress.delivery_instructions}</Text>
                </div>
              )}
            </div>
          </Section>

          <Hr style={divider} />

          <Section style={section}>
            <Text style={helpText}>
              Need help with your order? Contact the restaurant directly or reach out to Menu.ca support.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Thank you for choosing Menu.ca!
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

const successIcon = {
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

const orderSummaryBox = {
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

const orderNumberLarge = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  fontFamily: 'monospace',
}

const estimatedTimeValue = {
  color: '#16a34a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
}

const section = {
  padding: '0 24px 24px',
}

const h2 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const itemContainer = {
  padding: '16px 0',
  borderBottom: '1px solid #f3f4f6',
}

const itemName = {
  color: '#1f2937',
  fontSize: '15px',
  fontWeight: '500',
  margin: '0 0 4px',
  lineHeight: '1.4',
}

const quantityBadge = {
  backgroundColor: '#DC2626',
  color: '#ffffff',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '13px',
  fontWeight: '600',
  marginRight: '8px',
}

const itemSize = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0 0 4px',
}

const modifiers = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '4px 0 0',
  fontStyle: 'italic',
}

const itemPrice = {
  color: '#1f2937',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 24px',
}

const totalRow = {
  padding: '8px 0',
}

const totalLabel = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
}

const totalValue = {
  color: '#1f2937',
  fontSize: '14px',
  margin: '0',
  textAlign: 'right' as const,
}

const totalDivider = {
  borderColor: '#d1d5db',
  margin: '12px 0',
  borderWidth: '2px',
}

const totalLabelBold = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
}

const totalValueBold = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'right' as const,
}

const addressBox = {
  backgroundColor: '#f9fafb',
  padding: '16px',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
}

const address = {
  color: '#1f2937',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const instructionsBox = {
  marginTop: '12px',
  paddingTop: '12px',
  borderTop: '1px solid #e5e7eb',
}

const instructionsLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
}

const instructions = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
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
  margin: '0',
}
