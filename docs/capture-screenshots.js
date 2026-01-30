const { chromium } = require('playwright');

async function captureScreenshots() {
  // Launch browser in visible mode
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000 // Slow down actions so we can see what's happening
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('📱 Logging into orders.menu.ca...');

    // Navigate to login page
    await page.goto('https://orders.menu.ca/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for login form to be visible
    await page.waitForTimeout(3000);

    console.log('🔍 Looking for email input...');

    // Try multiple selectors for email field
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[placeholder*="email" i]'
    ];

    let emailFilled = false;
    for (const selector of emailSelectors) {
      try {
        const emailInput = page.locator(selector).first();
        if (await emailInput.isVisible({ timeout: 1000 })) {
          await emailInput.fill('brian+1@worklocal.ca');
          console.log(`✓ Filled email using selector: ${selector}`);
          emailFilled = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!emailFilled) {
      throw new Error('Could not find email input field');
    }

    console.log('🔍 Looking for password input...');

    // Try multiple selectors for password field
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]'
    ];

    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        const passwordInput = page.locator(selector).first();
        if (await passwordInput.isVisible({ timeout: 1000 })) {
          await passwordInput.fill('WL!2w3e4r5t');
          console.log(`✓ Filled password using selector: ${selector}`);
          passwordFilled = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!passwordFilled) {
      throw new Error('Could not find password input field');
    }

    await page.waitForTimeout(1000);
    console.log('🔑 Credentials filled, clicking login button...');

    // Try multiple selectors for submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'button:has-text("Log in")',
      'input[type="submit"]'
    ];

    let clicked = false;
    for (const selector of submitSelectors) {
      try {
        const submitBtn = page.locator(selector).first();
        if (await submitBtn.isVisible({ timeout: 1000 })) {
          await submitBtn.click();
          console.log(`✓ Clicked submit using selector: ${selector}`);
          clicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!clicked) {
      // Take screenshot before throwing error
      await page.screenshot({
        path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/before-submit.png',
        fullPage: true
      });
      throw new Error('Could not find submit button');
    }

    // Wait for navigation with longer timeout
    await page.waitForTimeout(3000);

    console.log('⏳ Waiting for navigation...');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Check if we're no longer on login page
    if (currentUrl.includes('/login')) {
      // Take screenshot to see what went wrong
      await page.screenshot({
        path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/login-failed.png',
        fullPage: true
      });

      // Check for error messages
      const errorText = await page.textContent('body');
      if (errorText.includes('Invalid') || errorText.includes('incorrect')) {
        throw new Error('Login failed - invalid credentials');
      }
      throw new Error('Login failed - still on login page');
    }

    console.log('✅ Logged in successfully!');

    // Wait a moment for page to fully load
    await page.waitForTimeout(2000);

    // ===== DASHBOARD SCREENSHOT =====
    console.log('📸 Capturing Dashboard overview...');
    await page.screenshot({
      path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/dashboard-overview.png',
      fullPage: false
    });

    // ===== MARKETING HUB SCREENSHOTS =====
    console.log('📸 Navigating to Marketing Hub...');

    // Try to find and click Marketing Hub link
    const marketingLink = page.locator('a[href*="marketing"], a:has-text("Marketing")').first();
    if (await marketingLink.isVisible()) {
      await marketingLink.click();
      await page.waitForTimeout(2000);

      console.log('📸 Capturing Marketing Hub initial state...');
      await page.screenshot({
        path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/marketing-hub-no-location.png',
        fullPage: false
      });

      // Select first restaurant location
      console.log('🏪 Selecting restaurant location...');
      const locationDropdown = page.locator('input[placeholder*="Select a restaurant"], button:has-text("Select")').first();
      if (await locationDropdown.isVisible({ timeout: 3000 })) {
        await locationDropdown.click();
        await page.waitForTimeout(1000);

        // Click first restaurant in dropdown
        const firstRestaurant = page.locator('[role="option"], li, div[data-value]').first();
        if (await firstRestaurant.isVisible({ timeout: 2000 })) {
          await firstRestaurant.click();
          await page.waitForTimeout(2000);

          console.log('📸 Capturing Marketing Hub with location selected...');
          await page.screenshot({
            path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/marketing-hub-overview.png',
            fullPage: false
          });

          // Try to navigate to Coupons tab
          const couponsTab = page.locator('a:has-text("Coupons"), button:has-text("Coupons"), [role="tab"]:has-text("Coupons")').first();
          if (await couponsTab.isVisible({ timeout: 2000 })) {
            await couponsTab.click();
            await page.waitForTimeout(1500);

            console.log('📸 Capturing Coupons page...');
            await page.screenshot({
              path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/coupons-page.png',
              fullPage: false
            });

            // Try to open Create Coupon modal
            const createCouponBtn = page.locator('button:has-text("Create Coupon"), button:has-text("Add Coupon"), button:has-text("New Coupon")').first();
            if (await createCouponBtn.isVisible({ timeout: 2000 })) {
              await createCouponBtn.click();
              await page.waitForTimeout(1500);

              console.log('📸 Capturing Create Coupon modal...');
              await page.screenshot({
                path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/create-coupon-modal.png',
                fullPage: false
              });

              // Close modal
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            }
          }

          // Try to navigate to Deals tab
          const dealsTab = page.locator('a:has-text("Deals"), button:has-text("Deals"), [role="tab"]:has-text("Deals")').first();
          if (await dealsTab.isVisible({ timeout: 2000 })) {
            await dealsTab.click();
            await page.waitForTimeout(1500);

            console.log('📸 Capturing Deals page...');
            await page.screenshot({
              path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/deals-page.png',
              fullPage: false
            });

            // Try to open Create Deal modal
            const createDealBtn = page.locator('button:has-text("Create Deal"), button:has-text("Add Deal"), button:has-text("New Deal")').first();
            if (await createDealBtn.isVisible({ timeout: 2000 })) {
              await createDealBtn.click();
              await page.waitForTimeout(1500);

              console.log('📸 Capturing Create Deal modal...');
              await page.screenshot({
                path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/create-deal-modal.png',
                fullPage: false
              });

              // Close modal
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            }
          }

          // Try to navigate to Analytics tab
          const analyticsTab = page.locator('a:has-text("Analytics"), button:has-text("Analytics"), [role="tab"]:has-text("Analytics")').first();
          if (await analyticsTab.isVisible({ timeout: 2000 })) {
            await analyticsTab.click();
            await page.waitForTimeout(2000);

            console.log('📸 Capturing Analytics page...');
            await page.screenshot({
              path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/marketing-analytics.png',
              fullPage: false
            });
          }
        }
      }
    }

    // ===== MENU BUILDER SCREENSHOTS =====
    console.log('📸 Navigating to Menu Builder...');

    // Navigate to Menu Builder
    const menuBuilderLink = page.locator('a[href*="menu"], a:has-text("Menu Builder"), a:has-text("Menu")').first();
    if (await menuBuilderLink.isVisible()) {
      await menuBuilderLink.click();
      await page.waitForTimeout(2000);

      // Check if restaurant selection needed
      const menuLocationDropdown = page.locator('input[placeholder*="Select"], select, button:has-text("Select")').first();
      if (await menuLocationDropdown.isVisible({ timeout: 2000 })) {
        console.log('🏪 Selecting restaurant for menu...');
        await menuLocationDropdown.click();
        await page.waitForTimeout(1000);

        // Click first option
        const firstOption = page.locator('[role="option"], option, li').first();
        if (await firstOption.isVisible({ timeout: 2000 })) {
          await firstOption.click();
          await page.waitForTimeout(2000);
        }
      }

      console.log('📸 Capturing Menu Builder main view...');
      await page.screenshot({
        path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/menu-builder-main.png',
        fullPage: false
      });

      // Try to open Add Dish modal
      const addDishBtn = page.locator('button:has-text("Add Dish"), button:has-text("Create Dish"), button:has-text("New Dish"), button:has-text("Add Item")').first();
      if (await addDishBtn.isVisible({ timeout: 2000 })) {
        await addDishBtn.click();
        await page.waitForTimeout(1500);

        console.log('📸 Capturing Add Dish modal...');
        await page.screenshot({
          path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/add-dish-modal.png',
          fullPage: false
        });

        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

      // Try to navigate to Categories
      const categoriesLink = page.locator('a:has-text("Categories"), button:has-text("Categories"), [role="tab"]:has-text("Categories")').first();
      if (await categoriesLink.isVisible({ timeout: 2000 })) {
        await categoriesLink.click();
        await page.waitForTimeout(1500);

        console.log('📸 Capturing Categories view...');
        await page.screenshot({
          path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/menu-categories.png',
          fullPage: false
        });
      }

      // Try to navigate to Modifier Groups
      const modifierGroupsLink = page.locator('a:has-text("Modifier"), a:has-text("Modifiers")').first();
      if (await modifierGroupsLink.isVisible({ timeout: 2000 })) {
        await modifierGroupsLink.click();
        await page.waitForTimeout(2000);

        console.log('📸 Capturing Modifier Groups library...');
        await page.screenshot({
          path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/modifier-groups-library.png',
          fullPage: false
        });

        // Try to open Create Modifier Group modal
        const createModifierBtn = page.locator('button:has-text("Create Modifier"), button:has-text("Add Modifier"), button:has-text("New Modifier")').first();
        if (await createModifierBtn.isVisible({ timeout: 2000 })) {
          await createModifierBtn.click();
          await page.waitForTimeout(1500);

          console.log('📸 Capturing Create Modifier Group modal...');
          await page.screenshot({
            path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/create-modifier-group-modal.png',
            fullPage: false
          });
        }
      }
    }

    console.log('✅ All screenshots captured successfully!');

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);

    // Take a screenshot of the error state
    await page.screenshot({
      path: '/Users/brianlapp/Documents/GitHub/MenuAdminDash-replit/docs/screenshots/error-state.png',
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

captureScreenshots();
