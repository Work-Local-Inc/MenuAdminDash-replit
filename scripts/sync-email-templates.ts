import { Resend } from 'resend';
import { render } from '@react-email/render';
import OrderConfirmationEmail from '../lib/emails/templates/order-confirmation';
import WelcomeEmail from '../lib/emails/templates/welcome';
import PasswordResetEmail from '../lib/emails/templates/password-reset';
import EmailVerificationEmail from '../lib/emails/templates/email-verification';
import OrderStatusEmail from '../lib/emails/templates/order-status';
import RefundNotificationEmail from '../lib/emails/templates/refund-notification';

const resend = new Resend(process.env.RESEND_API_KEY);

interface TemplateConfig {
  name: string;
  subject: string;
  component: React.ReactElement;
}

const templates: TemplateConfig[] = [
  {
    name: 'order-confirmation',
    subject: 'Order Confirmation #{ORDER_NUMBER} - {RESTAURANT_NAME}',
    component: OrderConfirmationEmail({
      orderNumber: '{ORDER_NUMBER}',
      restaurantName: '{RESTAURANT_NAME}',
      items: [
        {
          dish_id: 1,
          name: '{ITEM_NAME}',
          size: '{ITEM_SIZE}',
          quantity: 1,
          unit_price: 0,
          subtotal: 0,
          modifiers: [],
        },
      ],
      deliveryAddress: {
        street: '{STREET}',
        city: '{CITY}',
        province: '{PROVINCE}',
        postal_code: '{POSTAL_CODE}',
        delivery_instructions: '{DELIVERY_INSTRUCTIONS}',
      },
      subtotal: 0,
      deliveryFee: 0,
      tax: 0,
      taxLabel: 'Tax',
      total: 0,
      estimatedDeliveryTime: '{ESTIMATED_TIME}',
    }),
  },
  {
    name: 'welcome',
    subject: 'Welcome to Menu.ca!',
    component: WelcomeEmail({
      firstName: '{FIRST_NAME}',
      email: '{EMAIL}',
    }),
  },
  {
    name: 'password-reset',
    subject: 'Reset Your Menu.ca Password',
    component: PasswordResetEmail({
      firstName: '{FIRST_NAME}',
      resetLink: '{RESET_LINK}',
      expiresIn: '1 hour',
    }),
  },
  {
    name: 'email-verification',
    subject: 'Verify Your Email Address - Menu.ca',
    component: EmailVerificationEmail({
      firstName: '{FIRST_NAME}',
      verificationLink: '{VERIFICATION_LINK}',
      email: '{EMAIL}',
    }),
  },
  {
    name: 'order-status-preparing',
    subject: 'Your Order #{ORDER_NUMBER} is Being Prepared',
    component: OrderStatusEmail({
      orderNumber: '{ORDER_NUMBER}',
      restaurantName: '{RESTAURANT_NAME}',
      status: 'preparing',
      statusMessage: 'The kitchen is now preparing your delicious order.',
      estimatedTime: '{ESTIMATED_TIME}',
    }),
  },
  {
    name: 'order-status-ready',
    subject: 'Your Order #{ORDER_NUMBER} is Ready for Pickup',
    component: OrderStatusEmail({
      orderNumber: '{ORDER_NUMBER}',
      restaurantName: '{RESTAURANT_NAME}',
      status: 'ready',
      statusMessage: 'Your order is ready and waiting for you!',
    }),
  },
  {
    name: 'order-status-out-for-delivery',
    subject: 'Your Order #{ORDER_NUMBER} is On Its Way!',
    component: OrderStatusEmail({
      orderNumber: '{ORDER_NUMBER}',
      restaurantName: '{RESTAURANT_NAME}',
      status: 'out_for_delivery',
      statusMessage: 'Your order is on its way to you.',
      estimatedTime: '{ESTIMATED_TIME}',
      deliveryAddress: '{DELIVERY_ADDRESS}',
    }),
  },
  {
    name: 'order-status-delivered',
    subject: 'Your Order #{ORDER_NUMBER} Has Been Delivered',
    component: OrderStatusEmail({
      orderNumber: '{ORDER_NUMBER}',
      restaurantName: '{RESTAURANT_NAME}',
      status: 'delivered',
      statusMessage: 'Your order has been delivered. Enjoy!',
    }),
  },
  {
    name: 'order-status-cancelled',
    subject: 'Order #{ORDER_NUMBER} Has Been Cancelled',
    component: OrderStatusEmail({
      orderNumber: '{ORDER_NUMBER}',
      restaurantName: '{RESTAURANT_NAME}',
      status: 'cancelled',
      statusMessage: 'Unfortunately, your order has been cancelled.',
    }),
  },
  {
    name: 'refund-full',
    subject: 'Full Refund Processed - Order #{ORDER_NUMBER}',
    component: RefundNotificationEmail({
      firstName: '{FIRST_NAME}',
      orderNumber: '{ORDER_NUMBER}',
      restaurantName: '{RESTAURANT_NAME}',
      refundAmount: 0,
      refundReason: '{REFUND_REASON}',
      originalTotal: 0,
      refundType: 'full',
      estimatedDays: '5-7 business days',
    }),
  },
  {
    name: 'refund-partial',
    subject: 'Partial Refund Processed - Order #{ORDER_NUMBER}',
    component: RefundNotificationEmail({
      firstName: '{FIRST_NAME}',
      orderNumber: '{ORDER_NUMBER}',
      restaurantName: '{RESTAURANT_NAME}',
      refundAmount: 0,
      refundReason: '{REFUND_REASON}',
      originalTotal: 0,
      refundType: 'partial',
      estimatedDays: '5-7 business days',
    }),
  },
];

async function syncTemplates() {
  console.log('🚀 Starting template sync to Resend...\n');

  const existingTemplates = await resend.templates.list();
  const existingNames = new Map(
    existingTemplates.data?.data?.map((t: any) => [t.name, t.id]) || []
  );

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const template of templates) {
    try {
      const html = await render(template.component);
      const existingId = existingNames.get(template.name);

      if (existingId) {
        console.log(`📝 Updating: ${template.name}`);
        await resend.templates.update(existingId, {
          name: template.name,
          html,
        });
        updated++;
      } else {
        console.log(`➕ Creating: ${template.name}`);
        await resend.templates.create({
          name: template.name,
          html,
        });
        created++;
      }
    } catch (error) {
      console.error(`❌ Failed: ${template.name}`, error);
      failed++;
    }
  }

  console.log('\n✨ Template sync complete!');
  console.log(`   Created: ${created}, Updated: ${updated}, Failed: ${failed}`);
  console.log('📧 View templates at: https://resend.com/templates');
}

syncTemplates().catch(console.error);
