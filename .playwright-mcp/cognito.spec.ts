import { test, expect } from '@playwright/test';

test.describe('Cognito Native E2E Tests', () => {
  test('should load Cognito page and render core layout elements', async ({ page }) => {
    // Navigate to the dashboard first to ensure routing works
    await page.goto('http://localhost:3000/');

    // Check if the dashboard loaded
    await expect(page.locator('text=AWS Local Emulation Console')).toBeVisible();

    // Navigate to Cognito view
    await page.goto('http://localhost:3000/cognito');

    // Wait for the Cognito page to load
    await expect(page.locator('text=Cognito User Pools')).toBeVisible();
    await expect(page.locator('button:has-text("Create Pool")')).toBeVisible();

    // The search input should be visible
    await expect(page.getByPlaceholder('Search user pools...')).toBeVisible();

    // Check that the Users card is present
    await expect(page.locator('h3:has-text("Users")')).toBeVisible();
    await expect(page.locator('text=Select a User Pool to view its users.')).toBeVisible();
  });
});
