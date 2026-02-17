import Stripe from "stripe";

async function registerDomains() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error("Missing STRIPE_SECRET_KEY");
    process.exit(1);
  }

  const stripe = new Stripe(stripeKey);

  // First, list existing registered domains
  console.log("=== Currently registered Apple Pay domains ===");
  try {
    const existing = await stripe.applePayDomains.list({ limit: 100 });
    for (const d of existing.data) {
      console.log(`  ✓ ${d.domain_name} (id: ${d.id})`);
    }
    if (existing.data.length === 0) {
      console.log("  (none registered)");
    }
  } catch (err: any) {
    console.error("Error listing domains:", err.message);
  }

  // Domains to register
  const domains = [
    "menuai.ca",
    "orders.menuai.ca",
    "seasonspizzaottawa.menuai.ca",
    "centertowndonair.menuai.ca",
    "orchidsushiottawa.menuai.ca",
    "goldencenterpizza.menuai.ca",
    "pizzaliciousottawa.menuai.ca",
  ];

  console.log("\n=== Registering domains ===");
  for (const domain of domains) {
    try {
      const result = await stripe.applePayDomains.create({
        domain_name: domain,
      });
      console.log(`  ✓ Registered: ${domain} (id: ${result.id})`);
    } catch (err: any) {
      if (
        err.message?.includes("already been registered") ||
        err.message?.includes("already exists")
      ) {
        console.log(`  ○ Already registered: ${domain}`);
      } else {
        console.error(`  ✗ Failed: ${domain} - ${err.message}`);
      }
    }
  }

  // Also check payment method domain registration (newer approach)
  console.log("\n=== Payment Method Domains ===");
  try {
    const pmDomains = await stripe.paymentMethodDomains.list({ limit: 100 });
    for (const d of pmDomains.data) {
      console.log(
        `  ${d.domain_name}: apple_pay=${d.apple_pay?.status}, google_pay=${d.google_pay?.status}`,
      );
    }
    if (pmDomains.data.length === 0) {
      console.log("  (none registered)");
      // Register the main domain
      for (const domain of domains) {
        try {
          const result = await stripe.paymentMethodDomains.create({
            domain_name: domain,
          });
          console.log(
            `  ✓ Created payment method domain: ${domain} - apple_pay=${result.apple_pay?.status}, google_pay=${result.google_pay?.status}`,
          );
        } catch (err: any) {
          console.log(`  ○ ${domain}: ${err.message}`);
        }
      }
    }
  } catch (err: any) {
    console.error("Error with payment method domains:", err.message);
  }
}

registerDomains();
