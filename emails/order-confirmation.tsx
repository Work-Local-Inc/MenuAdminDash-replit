import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components'

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
  orderNumber?: string
  restaurantName?: string
  restaurantLogoUrl?: string
  items?: OrderItem[]
  deliveryAddress?: {
    street: string
    city: string
    province: string
    postal_code: string
    delivery_instructions?: string
  }
  subtotal?: number
  deliveryFee?: number
  tax?: number
  taxLabel?: string
  total?: number
  estimatedDeliveryTime?: string
}

export default function OrderConfirmationEmail({
  orderNumber = '12345',
  restaurantName = 'Pizza Palace',
  items = [
    {
      dish_id: 1,
      name: 'Pepperoni Pizza',
      size: 'Large (15")',
      quantity: 2,
      unit_price: 18.99,
      subtotal: 37.98,
      modifiers: [
        { id: 1, name: 'Extra Cheese', price: 2.50 },
        { id: 2, name: 'Mushrooms', price: 1.50 },
      ],
    },
    {
      dish_id: 2,
      name: 'Caesar Salad',
      size: 'Regular',
      quantity: 1,
      unit_price: 12.99,
      subtotal: 12.99,
      modifiers: [],
    },
    {
      dish_id: 3,
      name: 'Garlic Bread',
      size: 'Regular',
      quantity: 1,
      unit_price: 5.99,
      subtotal: 5.99,
      modifiers: [],
    },
  ],
  deliveryAddress = {
    street: '123 Main Street, Apt 4B',
    city: 'Montreal',
    province: 'QC',
    postal_code: 'H2X 1Y4',
    delivery_instructions: 'Ring doorbell twice. Leave at door if no answer.',
  },
  subtotal = 56.96,
  deliveryFee = 4.99,
  tax = 8.03,
  taxLabel = 'GST/QST',
  total = 69.98,
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
            <Text style={brandName}>Menu.ca</Text>
          </Section>

          <Section style={heroSection}>
            <div style={successIcon}>✓</div>
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
  backgroundColor: 'hsl(222, 47%, 11%)',
  padding: '16px 24px',
  textAlign: 'center' as const,
}

const brandName = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0',
  letterSpacing: '0.5px',
}

const heroSection = {
  backgroundColor: 'hsl(221, 83%, 53%)',
  padding: '40px 24px',
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
  color: 'hsl(142, 71%, 45%)',
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
  color: 'hsl(222, 47%, 11%)',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  fontFamily: 'monospace',
}

const estimatedTimeValue = {
  color: 'hsl(142, 71%, 45%)',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
}

const section = {
  padding: '0 24px 24px',
}

const h2 = {
  color: 'hsl(222, 47%, 11%)',
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
  backgroundColor: 'hsl(221, 83%, 53%)',
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
  color: 'hsl(222, 47%, 11%)',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
}

const totalValueBold = {
  color: 'hsl(222, 47%, 11%)',
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
  color: 'hsl(222, 47%, 11%)',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const footerSubtext = {
  color: '#9ca3af',
  fontSize: '13px',
  margin: '0',
}
