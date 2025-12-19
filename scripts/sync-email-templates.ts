import { Resend } from 'resend';
import { render } from '@react-email/render';
import OrderConfirmationEmail from '../lib/emails/templates/order-confirmation';
import WelcomeEmail from '../lib/emails/templates/welcome';

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
];

async function syncTemplates() {
  console.log('🚀 Starting template sync to Resend...\n');

  const existingTemplates = await resend.templates.list();
  const existingNames = new Map(
    existingTemplates.data?.data?.map((t: any) => [t.name, t.id]) || []
  );

  for (const template of templates) {
    try {
      const html = await render(template.component);
      const existingId = existingNames.get(template.name);

      if (existingId) {
        console.log(`📝 Updating template: ${template.name}`);
        await resend.templates.update(existingId, {
          name: template.name,
          html,
        });
        console.log(`   ✅ Updated successfully`);
      } else {
        console.log(`➕ Creating template: ${template.name}`);
        const created = await resend.templates.create({
          name: template.name,
          html,
        });
        console.log(`   ✅ Created with ID: ${(created.data as any)?.id}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to sync ${template.name}:`, error);
    }
  }

  console.log('\n✨ Template sync complete!');
  console.log('📧 View templates at: https://resend.com/templates');
}

syncTemplates().catch(console.error);
