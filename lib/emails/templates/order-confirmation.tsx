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
  total,
  estimatedDeliveryTime = '45-60 minutes',
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Order Confirmation #{orderNumber} from {restaurantName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Order Confirmed!</Heading>
            <Text style={text}>Thank you for your order from {restaurantName}</Text>
          </Section>

          <Section style={orderInfo}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Text style={estimatedTime}>
              Estimated delivery: {estimatedDeliveryTime}
            </Text>
          </Section>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={h2}>
              Order Details
            </Heading>
            {items.map((item, index) => (
              <div key={index} style={itemContainer}>
                <Row>
                  <Column>
                    <Text style={itemName}>
                      {item.quantity}x {item.name} ({item.size})
                    </Text>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <Text style={modifiers}>
                        {item.modifiers.map(m => m.name).join(', ')}
                      </Text>
                    )}
                  </Column>
                  <Column align="right">
                    <Text style={itemPrice}>${item.subtotal.toFixed(2)}</Text>
                  </Column>
                </Row>
              </div>
            ))}
          </Section>

          <Hr style={hr} />

          <Section>
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
                <Text style={totalLabel}>Tax (HST)</Text>
              </Column>
              <Column align="right">
                <Text style={totalValue}>${tax.toFixed(2)}</Text>
              </Column>
            </Row>
            <Row style={totalRow}>
              <Column>
                <Text style={totalLabelBold}>Total</Text>
              </Column>
              <Column align="right">
                <Text style={totalValueBold}>${total.toFixed(2)}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={hr} />

          <Section>
            <Heading as="h2" style={h2}>
              Delivery Address
            </Heading>
            <Text style={address}>
              {deliveryAddress.street}
              <br />
              {deliveryAddress.city}, {deliveryAddress.province}{' '}
              {deliveryAddress.postal_code}
            </Text>
            {deliveryAddress.delivery_instructions && (
              <Text style={instructions}>
                <strong>Instructions:</strong> {deliveryAddress.delivery_instructions}
              </Text>
            )}
          </Section>

          <Hr style={hr} />

          <Section>
            <Text style={footer}>
              You can track your order status in your Menu.ca account.
              <br />
              Thank you for choosing Menu.ca!
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
  margin: '0 0 8px',
}

const h2 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 0 16px',
  padding: '0 24px',
}

const text = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
}

const orderInfo = {
  backgroundColor: '#f3f4f6',
  padding: '16px 24px',
  margin: '0 24px',
  borderRadius: '8px',
}

const orderNumberStyle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 8px',
}

const estimatedTime = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}

const itemContainer = {
  padding: '12px 24px',
}

const itemName = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 4px',
}

const modifiers = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
}

const itemPrice = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
}

const totalRow = {
  padding: '8px 24px',
}

const totalLabel = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
}

const totalValue = {
  color: '#1a1a1a',
  fontSize: '14px',
  margin: '0',
}

const totalLabelBold = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
}

const totalValueBold = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
}

const address = {
  color: '#1a1a1a',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  padding: '0 24px',
}

const instructions = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '12px 0 0',
  padding: '0 24px',
}

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  padding: '0 24px',
  textAlign: 'center' as const,
}
