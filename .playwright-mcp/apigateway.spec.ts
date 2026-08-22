import { test, expect } from '@playwright/test';

test('Verify API Gateway view', async ({ page }) => {
  // Navigate to API Gateway view
  await page.goto('http://localhost:3000/apigateway');

  // Verify the page title is correct
  await expect(page.locator('h2').first()).toHaveText('API Gateway');

  // Verify "API Gateway" is in the sidebar capability matrix or route

  // Wait a moment for rendering and screenshots
  await page.waitForTimeout(2000);

  // Take a screenshot of the main view
  await page.screenshot({ path: './screenshots/apigateway-view.png', fullPage: true });

});
