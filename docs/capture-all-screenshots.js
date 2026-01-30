const { chromium } = require('playwright');

async function captureAllScreenshots() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  const screenshotDir = '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots';

  try {
    console.log('📱 Logging into orders.menu.ca...');
    await page.goto('https://orders.menu.ca/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Login
    await page.fill('input[type="email"]', 'brian+1@worklocal.ca');
    await page.fill('input[type="password"]', 'WL!2w3e4r5t');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    if (page.url().includes('/login')) {
      throw new Error('Login failed');
    }

    console.log('✅ Logged in!');

    // === DASHBOARD ===
    console.log('\n📸 DASHBOARD');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/01-dashboard-overview.png` });
    console.log('  ✓ Dashboard captured');

    // === MARKETING HUB ===
    console.log('\n📸 MARKETING HUB');

    // Navigate to Marketing Hub via sidebar
    await page.click('[data-testid="link-marketing"]');
    await page.waitForTimeout(3000);

    // Capture initial state (no location selected)
    await page.screenshot({ path: `${screenshotDir}/02-marketing-no-location.png` });
    console.log('  ✓ Marketing Hub (no location) captured');

    // Select a restaurant using the SearchableRestaurantSelect component
    // It's a Button with role="combobox" that opens a popover with CommandInput
    console.log('  → Selecting restaurant...');
    const restaurantBtn = page.locator('[data-testid="select-restaurant"]');
    await restaurantBtn.click();
    await page.waitForTimeout(1500);
    // Click first restaurant option in the command list
    const firstOption = page.locator('[data-testid^="select-restaurant-option-"]').first();
    await firstOption.click();
    await page.waitForTimeout(3000);

    // Capture Marketing Hub main page with restaurant selected
    await page.screenshot({ path: `${screenshotDir}/03-marketing-hub-main.png` });
    console.log('  ✓ Marketing Hub (with location) captured');

    // === COUPONS PAGE ===
    console.log('\n📸 COUPONS PAGE');

    // Navigate to Coupons via the Quick Action card or direct URL
    // The card has data-testid="card-create-coupon"
    const createCouponCard = page.locator('[data-testid="card-create-coupon"]');
    if (await createCouponCard.isVisible({ timeout: 2000 })) {
      await createCouponCard.click();
    } else {
      // Fallback: navigate directly
      const currentUrl = page.url();
      const restaurantParam = new URL(currentUrl).searchParams.get('restaurant');
      await page.goto(`https://orders.menu.ca/admin/coupons${restaurantParam ? `?restaurant=${restaurantParam}` : ''}`);
    }
    await page.waitForTimeout(3000);

    // Capture Coupons list page
    await page.screenshot({ path: `${screenshotDir}/04-coupons-page.png` });
    console.log('  ✓ Coupons page captured');

    // Open Create Coupon modal
    const createCouponBtn = page.locator('button:has-text("Create Coupon"), button:has-text("Add Coupon")').first();
    if (await createCouponBtn.isVisible({ timeout: 2000 })) {
      await createCouponBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${screenshotDir}/05-create-coupon-modal.png` });
      console.log('  ✓ Create Coupon modal captured');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    } else {
      console.log('  ⚠ Create Coupon button not found');
    }

    // === DEALS PAGE ===
    console.log('\n📸 DEALS PAGE');

    // Navigate to Deals page
    const currentUrl = page.url();
    const restaurantParam = new URL(currentUrl).searchParams.get('restaurant');
    await page.goto(`https://orders.menu.ca/admin/promotions/deals${restaurantParam ? `?restaurant=${restaurantParam}` : ''}`);
    await page.waitForTimeout(3000);

    // Capture Deals list page
    await page.screenshot({ path: `${screenshotDir}/06-deals-page.png` });
    console.log('  ✓ Deals page captured');

    // Open Create Deal modal
    const createDealBtn = page.locator('button:has-text("Create Deal")').first();
    if (await createDealBtn.isVisible({ timeout: 2000 })) {
      await createDealBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${screenshotDir}/07-create-deal-modal.png` });
      console.log('  ✓ Create Deal modal captured');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    } else {
      console.log('  ⚠ Create Deal button not found');
    }

    // === ANALYTICS PAGE ===
    console.log('\n📸 ANALYTICS PAGE');
    await page.goto(`https://orders.menu.ca/admin/promotions/analytics${restaurantParam ? `?restaurant=${restaurantParam}` : ''}`);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${screenshotDir}/08-marketing-analytics.png` });
    console.log('  ✓ Analytics page captured');

    // === MENU BUILDER ===
    console.log('\n📸 MENU BUILDER');

    // First, expand the Menu Builder section in sidebar (it's a collapsible)
    const menuBuilderNav = page.locator('[data-testid="button-nav-menu builder"]');
    if (await menuBuilderNav.isVisible({ timeout: 2000 })) {
      await menuBuilderNav.click();
      await page.waitForTimeout(1000);
    }

    // Click on Menu Builder submenu item
    const menuBuilderLink = page.locator('[data-testid="link-menu-builder"]');
    if (await menuBuilderLink.isVisible({ timeout: 2000 })) {
      await menuBuilderLink.click();
    } else {
      // Fallback: direct navigation
      await page.goto('https://orders.menu.ca/admin/menu/builder');
    }
    await page.waitForTimeout(3000);

    // Select restaurant if needed (Menu Builder also requires restaurant selection)
    const menuRestaurantBtn = page.locator('[data-testid="select-restaurant"], button[role="combobox"]').first();
    if (await menuRestaurantBtn.isVisible({ timeout: 2000 })) {
      await menuRestaurantBtn.click();
      await page.waitForTimeout(1500);
      const menuFirstOption = page.locator('[data-testid^="select-restaurant-option-"]').first();
      if (await menuFirstOption.isVisible({ timeout: 2000 })) {
        await menuFirstOption.click();
      } else {
        // Fallback: keyboard navigation
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
      }
      await page.waitForTimeout(3000);
    }

    // Capture Menu Builder main
    await page.screenshot({ path: `${screenshotDir}/09-menu-builder-main.png` });
    console.log('  ✓ Menu Builder main captured');

    // Open Add Dish modal
    console.log('  → Looking for Add Dish button...');
    const addDishBtn = page.locator('button:has-text("Add Dish"), button:has-text("New Dish"), button:has-text("Create Dish")').first();
    if (await addDishBtn.isVisible({ timeout: 2000 })) {
      await addDishBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${screenshotDir}/10-add-dish-modal.png` });
      console.log('  ✓ Add Dish modal captured');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    } else {
      console.log('  ⚠ Add Dish button not found - capturing current state');
      // Try to find any "Add" or "+" button
      const anyAddBtn = page.locator('button:has(svg), button:has-text("+")').first();
      if (await anyAddBtn.isVisible({ timeout: 1000 })) {
        await anyAddBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${screenshotDir}/10-add-dish-modal.png` });
        console.log('  ✓ Modal captured (found alternative button)');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    }

    // === MODIFIER GROUPS LIBRARY ===
    console.log('\n📸 MODIFIER GROUPS LIBRARY');

    // Navigate to Modifier Groups Library
    const modifierGroupsLink = page.locator('[data-testid="link-modifier-groups-library"]');
    if (await modifierGroupsLink.isVisible({ timeout: 2000 })) {
      await modifierGroupsLink.click();
    } else {
      // Fallback: direct navigation
      await page.goto('https://orders.menu.ca/admin/menu/modifier-groups');
    }
    await page.waitForTimeout(3000);

    // Select restaurant if needed (Modifier Groups also requires restaurant selection)
    const modRestaurantBtn = page.locator('[data-testid="select-restaurant"]');
    if (await modRestaurantBtn.isVisible({ timeout: 2000 })) {
      // Check if button says "Choose" (meaning no restaurant selected yet)
      const btnText = await modRestaurantBtn.textContent();
      if (btnText && (btnText.includes('Choose') || btnText.includes('Select'))) {
        console.log('  → Selecting restaurant for Modifier Groups...');
        await modRestaurantBtn.click();
        await page.waitForTimeout(1500);
        const modFirstOption = page.locator('[data-testid^="select-restaurant-option-"]').first();
        if (await modFirstOption.isVisible({ timeout: 2000 })) {
          await modFirstOption.click();
        } else {
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(3000);
      }
    }

    // Capture Modifier Groups Library
    await page.screenshot({ path: `${screenshotDir}/11-modifier-groups-library.png` });
    console.log('  ✓ Modifier Groups Library captured');

    // Open Create Modifier Group modal
    const createModifierBtn = page.locator('[data-testid="button-create-group"]');
    if (await createModifierBtn.isVisible({ timeout: 2000 })) {
      // Wait for button to be enabled
      await page.waitForTimeout(1000);
      await createModifierBtn.click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${screenshotDir}/12-create-modifier-modal.png` });
      console.log('  ✓ Create Modifier Group modal captured');
    } else {
      console.log('  ⚠ Create Modifier button not found');
    }

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${screenshotDir}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({
      path: `${screenshotDir}/error-state.png`,
      fullPage: true
    });
    console.log('  📸 Error state screenshot saved');
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

captureAllScreenshots();
